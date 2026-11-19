let currentUserEmail = "";
let unsubscribeNotifications = null; 
let lastUnreadCount = null;
let chimeAudioCtx = null;

function playSyntheticChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!chimeAudioCtx) {
      chimeAudioCtx = new AudioCtx();
    }
    if (chimeAudioCtx.state === 'suspended') {
      chimeAudioCtx.resume();
    }

    const now = chimeAudioCtx.currentTime;

    const osc1 = chimeAudioCtx.createOscillator();
    const gain1 = chimeAudioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1318.5, now);
    osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.08);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(chimeAudioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    const osc2 = chimeAudioCtx.createOscillator();
    const gain2 = chimeAudioCtx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(2093.0, now + 0.1);
    gain2.gain.setValueAtTime(0.25, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(chimeAudioCtx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.65);
  } catch (err) {
    console.warn("Synthesizer error:", err);
  }
}

function triggerNotificationAlert() {
  const audio = document.getElementById("notification-sound");

  if (audio) {
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        playSyntheticChime();
      });
    } else {
      playSyntheticChime();
    }
  } else {
    playSyntheticChime();
  }

  if (window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
  }

  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }
}

function unlockAudio() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (AudioCtx && !chimeAudioCtx) {
    chimeAudioCtx = new AudioCtx();
  }
  if (chimeAudioCtx && chimeAudioCtx.state === 'suspended') {
    chimeAudioCtx.resume();
  }

  const audio = document.getElementById("notification-sound");
  if (audio) {
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
    }).catch(() => {});
  }
  document.removeEventListener('click', unlockAudio);
  document.removeEventListener('touchstart', unlockAudio);
}
document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('touchstart', unlockAudio, { once: true });

document.addEventListener('DOMContentLoaded', function () {
    const auth = firebase.auth();
    const db = firebase.firestore();

    function startNotificationListener(userEmail) {
      if (unsubscribeNotifications) {
          unsubscribeNotifications();
      }

      unsubscribeNotifications = db
          .collection("messages")
          .where("to", "in", ["all", userEmail])
          .onSnapshot((snapshot) => {
              let unreadCount = 0;

              snapshot.forEach((doc) => {
                  const data = doc.data();

                  if (data.to === userEmail && data.read === false) {
                      unreadCount++;
                  }

                  if (data.to === "all") {
                      const readBy = data.readBy || [];
                      if (!readBy.includes(userEmail)) {
                          unreadCount++;
                      }
                  }
              });

              const badge = document.getElementById("notification-count");
              if (badge) {
                if (unreadCount > 0) {
                    badge.textContent = unreadCount;
                    badge.style.display = "flex";
                } else {
                    badge.style.display = "none";
                }
              }

              if (lastUnreadCount !== null && unreadCount > lastUnreadCount) {
                  triggerNotificationAlert();
              }
              
              lastUnreadCount = unreadCount;

          }, (error) => {
              console.error("Notification listener error:", error);
          });
    }

    auth.onAuthStateChanged((user) => {
      if (user) {
        currentUserEmail = user.email;
        startNotificationListener(currentUserEmail);
      }
    });
});