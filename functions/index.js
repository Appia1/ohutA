
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();

const db = admin.firestore();

// Available Pioneer Rewards
const PRIZES = {
  USDT: [10, 5, 15, 12, 7],
  OHT: [500, 200, 1000, 100]
};

function pickRandom(array) {
  return array[crypto.randomInt(0, array.length)];
}

function getBalance(value, fieldName) {
  const balance = Number(value || 0);

  if (!Number.isFinite(balance) || balance < 0) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      `Invalid ${fieldName} balance.`
    );
  }

  return balance;
}

// ==========================================
// 1. GET PIONEER REWARD STATUS
// ==========================================

exports.getPioneerRewardStatus = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Please sign in first."
      );
    }

    try {
      const uid = context.auth.uid;

      const userRef = db.collection("users").doc(uid);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Your OHUT user profile was not found."
        );
      }

      const state = userSnap.data().pioneerRewards || {};
      const spins = Array.isArray(state.spins) ? state.spins : [];

      const completed =
        state.completed === true || spins.length >= 2;

      return {
        spins,
        completed,
        remainingSpins: Math.max(0, 2 - spins.length)
      };

    } catch (error) {
      console.error("Pioneer status error:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Unable to load Pioneer Rewards status."
      );
    }
  });

// ==========================================
// 2. SPIN PIONEER REWARD
// ==========================================

exports.spinPioneerReward = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Please sign in first."
      );
    }

    const uid = context.auth.uid;

    const userRef = db.collection("users").doc(uid);

    const miningRef = db
      .collection("mining_users")
      .doc(`user_mining_${uid}`);

    try {
      const result = await db.runTransaction(async (transaction) => {

        // Read both documents before making any changes.
        const userSnap = await transaction.get(userRef);
        const miningSnap = await transaction.get(miningRef);

        if (!userSnap.exists) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Your OHUT user profile was not found."
          );
        }

        const userData = userSnap.data();

        const state = userData.pioneerRewards || {};

        const spins = Array.isArray(state.spins)
          ? state.spins
          : [];

        // Never allow more than two spins.
        if (state.completed === true || spins.length >= 2) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "You have already used both reward spins."
          );
        }

        // First spin: randomly choose a reward category.
        // Second spin: award the opposite category.
        let category;

        if (spins.length === 0) {
          category = crypto.randomInt(0, 2) === 0
            ? "USDT"
            : "OHT";
        } else {
          const previousCategory = spins[0].category;

          if (
            previousCategory !== "USDT" &&
            previousCategory !== "OHT"
          ) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              "Previous reward record is invalid."
            );
          }

          category = previousCategory === "USDT"
            ? "OHT"
            : "USDT";
        }

        const amount = pickRandom(PRIZES[category]);

        const reward = {
          category,
          currency: category,
          amount,
          spinNumber: spins.length + 1,
          createdAt: Date.now()
        };

        const updatedSpins = [...spins, reward];

        const completed = updatedSpins.length === 2;

        // Preserve any other existing pioneerRewards fields.
        const updatedRewardState = {
          ...state,
          spins: updatedSpins,
          completed
        };

        if (category === "USDT") {

          // Credit the user's existing Funding Balance.
          const currentBalance = getBalance(
            userData.fundingBalance,
            "Funding"
          );

          transaction.update(userRef, {
            fundingBalance: currentBalance + amount,
            pioneerRewards: updatedRewardState
          });

        } else {

          // Credit the existing OHT Mining Balance.
          // Preserve lastMine and all other mining fields.
          const miningData = miningSnap.exists
            ? miningSnap.data()
            : {};

          const currentMiningBalance = getBalance(
            miningData.balance,
            "Mining"
          );

          transaction.set(
            miningRef,
            {
              balance: currentMiningBalance + amount
            },
            { merge: true }
          );

          transaction.update(userRef, {
            pioneerRewards: updatedRewardState
          });
        }

        return {
          reward,
          spins: updatedSpins,
          completed,
          remainingSpins: Math.max(0, 2 - updatedSpins.length)
        };
      });

      console.log(
        `Pioneer reward credited: ${uid} received ${result.reward.amount} ${result.reward.category}`
      );

      return result;

    } catch (error) {
      console.error("Pioneer spin error:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Unable to process your reward spin. Please try again."
      );
    }
  });
