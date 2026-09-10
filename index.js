// index.js in your Firebase functions
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Scheduled function: runs every hour
exports.autoCancelWithdrawals = functions.pubsub
  .schedule("every 1 hours")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    const twentyFourHoursAgo = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - 24 * 60 * 60 * 1000
    );

    try {
      // Get all pending withdrawals older than 24 hours
      const pendingSnap = await db.collection("withdrawals")
        .where("status", "==", "pending")
        .where("createdAt", "<=", twentyFourHoursAgo)
        .get();

      if (pendingSnap.empty) {
        console.log("No withdrawals to auto-cancel.");
        return null;
      }

      const batch = db.batch();

      for (const doc of pendingSnap.docs) {
        const data = doc.data();
        const userRef = db.collection("users").doc(data.userId);

        // Refund the user inside a transaction
        await db.runTransaction(async (tx) => {
          const userDoc = await tx.get(userRef);
          if (!userDoc.exists) return;

          const prevBalance = parseFloat(userDoc.data().fundingBalance || 0);
          const amount = parseFloat(data.amount || 0);

          // Update user balance
          tx.update(userRef, { fundingBalance: prevBalance + amount });

          // Update withdrawal status
          tx.update(doc.ref, {
            status: "cancelled",
            refunded: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

        console.log(`Auto-cancelled withdrawal ${doc.id} and refunded ${data.amount}`);
      }

      return null;
    } catch (err) {
      console.error("Error in auto-cancel:", err);
      return null;
    }
  });
