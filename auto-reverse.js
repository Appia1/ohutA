// =======================================================
// UNIVERSAL 10-MINUTE WITHDRAWAL AUTO-REVERSE ENGINE
// Runs automatically on ANY page the user visits
// =======================================================

(function () {
  const TEN_MINUTES_MS = 10 * 60 * 1000;

  async function checkAndAutoReverseWithdrawals(currentUser) {
    if (!currentUser || !window.firebaseDB) return;

    const db = window.firebaseDB;
    const nowMs = Date.now();

    try {
      // Find all pending withdrawals for this user
      const snapshot = await db.collection("withdrawals")
        .where("userId", "==", currentUser.uid)
        .where("status", "in", ["pending", "in_progress"])
        .get();

      snapshot.forEach(async (docSnap) => {
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

              // 1. Refund the balance back to user's funding balance
              transaction.update(userRef, {
                fundingBalance: firebase.firestore.FieldValue.increment(refundAmount)
              });

              // 2. Mark permanently as cancelled & reversed: true (stops double refund)
              transaction.update(docRef, {
                status: "cancelled",
                reversed: true,
                cancelReason: "Request expired after 10 minutes without approval (Auto-reversed).",
                cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
              });

              // 3. Send system notification message to user
              const msgRef = db.collection("messages").doc();
              transaction.set(msgRef, {
                to: freshData.email,
                message: `Your withdrawal of ${refundAmount} USDT was automatically cancelled after 10 minutes and refunded to your balance.`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
              });

              console.log(`[Auto-Reverse] Refunded ${refundAmount} USDT for withdrawal ${docSnap.id}`);

              // Optional: Play notification chime if function exists on this page
              if (typeof triggerNotificationAlert === "function") {
                triggerNotificationAlert();
              }
            }
          });
        }
      });
    } catch (err) {
      console.warn("[Auto-Reverse] Background check notice:", err);
    }
  }

  // Hook into Firebase Auth so it checks immediately on page load
  document.addEventListener("DOMContentLoaded", () => {
    const auth = window.firebaseAuth || (typeof firebase !== "undefined" ? firebase.auth() : null);
    if (!auth) return;

    auth.onAuthStateChanged((user) => {
      if (user) {
        // Run check immediately on load
        checkAndAutoReverseWithdrawals(user);

        // Also keep checking in background every 20 seconds while user is browsing any page
        setInterval(() => {
          checkAndAutoReverseWithdrawals(user);
        }, 20000);
      }
    });
  });
})();
