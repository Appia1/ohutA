// =======================================================
// UNIVERSAL 10-MINUTE WITHDRAWAL AUTO-REVERSE ENGINE
// Runs automatically on ANY page the user visits
// =======================================================

(function () {
  const TEN_MINUTES_MS = 10 * 60 * 1000;
  let isChecking = false; // Prevents overlapping background checks

  // -------------------------------------------------------------
  // 1. BUILT-IN NATIVE WEB AUDIO CHIME
  // Emits a clean 2-tone notification bell without external MP3s
  // -------------------------------------------------------------
  function playNotificationChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;

      // Two-tone chime: D5 (587.33 Hz) -> A5 (880.00 Hz)
      const notes = [
        { freq: 587.33, start: 0, duration: 0.28 },
        { freq: 880.00, start: 0.16, duration: 0.50 }
      ];

      notes.forEach(function (note) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(note.freq, now + note.start);

        gain.gain.setValueAtTime(0.001, now + note.start);
        gain.gain.linearRampToValueAtTime(0.35, now + note.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now + note.start);
        osc.stop(now + note.start + note.duration);
      });
    } catch (e) {
      console.warn("[Auto-Reverse] Audio playback notice (user interaction required):", e);
    }
  }

  // Helper: Triggers custom alert function if defined, otherwise plays built-in chime
  function triggerNotificationSound() {
    if (typeof window.triggerNotificationAlert === "function") {
      try {
        window.triggerNotificationAlert();
        return;
      } catch (err) {
        console.warn("[Auto-Reverse] Custom triggerNotificationAlert failed, playing default chime:", err);
      }
    }
    // Fallback: Built-in Web Audio chime
    playNotificationChime();
  }

  // -------------------------------------------------------------
  // 2. WITHDRAWAL AUTO-REVERSE ENGINE
  // -------------------------------------------------------------
  async function checkAndAutoReverseWithdrawals(currentUser) {
    if (!currentUser || !window.firebaseDB || isChecking) return;

    const db = window.firebaseDB;
    const nowMs = Date.now();
    isChecking = true;

    try {
      // Find all pending withdrawals for this user
      const snapshot = await db.collection("withdrawals")
        .where("userId", "==", currentUser.uid)
        .where("status", "in", ["pending", "in_progress"])
        .get();

      // Sequential loop ensures transaction promises are properly handled
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const createdAtMs = data.createdAtMs || (data.createdAt ? data.createdAt.toDate().getTime() : nowMs);
        const expiresAtMs = data.expiresAt || (createdAtMs + TEN_MINUTES_MS);

        // Has 10 minutes elapsed and has it NOT yet been refunded?
        if (nowMs >= expiresAtMs && !data.reversed) {
          const docRef = db.collection("withdrawals").doc(docSnap.id);
          const userRef = db.collection("users").doc(currentUser.uid);

          await db.runTransaction(async (transaction) => {
            const freshDoc = await transaction.get(docRef);
            if (!freshDoc.exists) return;

            const freshData = freshDoc.data();
            const curStatus = (freshData.status || "").toLowerCase();

            // Atomic safety lock: Ensure still pending and not reversed
            if ((curStatus === "pending" || curStatus === "in_progress") && !freshData.reversed) {
              const refundAmount = parseFloat(freshData.amount || 0);

              // Safe FieldValue lookup
              const firestoreRef = (typeof firebase !== "undefined" && firebase.firestore)
                ? firebase.firestore
                : (window.firebase && window.firebase.firestore);

              // 1. Refund the balance back to user's funding balance
              if (firestoreRef && firestoreRef.FieldValue) {
                transaction.update(userRef, {
                  fundingBalance: firestoreRef.FieldValue.increment(refundAmount)
                });
              } else {
                const userDoc = await transaction.get(userRef);
                const currentBalance = (userDoc.exists && userDoc.data().fundingBalance) || 0;
                transaction.update(userRef, {
                  fundingBalance: currentBalance + refundAmount
                });
              }

              // 2. Mark permanently as cancelled & reversed: true (stops double refund)
              const cancelledTimestamp = (firestoreRef && firestoreRef.FieldValue)
                ? firestoreRef.FieldValue.serverTimestamp()
                : new Date();

              transaction.update(docRef, {
                status: "cancelled",
                reversed: true,
                cancelReason: "Request expired after 10 minutes without approval (Auto-reversed).",
                cancelledAt: cancelledTimestamp
              });

              // 3. Send system notification message with clean line breaks (\n\n)
              const msgRef = db.collection("messages").doc();
              transaction.set(msgRef, {
                to: freshData.email || currentUser.email || "",
                userId: currentUser.uid,
                title: "Withdrawal Cancelled",
                message: `WITHDRAWAL CANCELLED\n\nYour withdrawal of ${refundAmount} USDT was cancelled due to an improper withdrawal procedure detected during processing.\n\nPlease note that blockchain network fees are required to complete and confirm withdrawal transactions.\n\nFor assistance, contact Support Team.`,
                timestamp: cancelledTimestamp,
                read: false
              });

              console.log(`[Auto-Reverse] Refunded ${refundAmount} USDT for withdrawal ${docSnap.id}`);

              // 4. Play audio chime directly on this page!
              triggerNotificationSound();
            }
          });
        }
      }
    } catch (err) {
      console.warn("[Auto-Reverse] Background check notice:", err);
    } finally {
      isChecking = false;
    }
  }

  // -------------------------------------------------------------
  // 3. LIFECYCLE INITIALIZER
  // -------------------------------------------------------------
  function initAutoReverse() {
    const auth = window.firebaseAuth || (typeof firebase !== "undefined" ? firebase.auth() : null);
    if (!auth) return;

    auth.onAuthStateChanged((user) => {
      if (user) {
        // Run check immediately on load
        checkAndAutoReverseWithdrawals(user);

        // Continue background checks every 20 seconds
        setInterval(() => {
          checkAndAutoReverseWithdrawals(user);
        }, 20000);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAutoReverse);
  } else {
    initAutoReverse();
  }
})();
