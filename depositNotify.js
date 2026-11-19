document.querySelector(".depositBtn").addEventListener("click", submitDeposit);

async function submitDeposit() {
  const btn = document.querySelector(".depositBtn");
  const user = firebaseAuth.currentUser;

  if (!user) {
    alert("You must be logged in to submit proof of payment.");
    return;
  }

  // Disable button and show loading
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "Loading... ⏳";

  const email = user.email;
  const paymentType = "TRX"; // label for admin

  try {
    await firebaseDB.collection("deposits").add({
      userId: user.uid,
      email: email,
      paymentType: paymentType,
      status: "pending",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Redirect to success page
    window.location.href = "Trx.html";

  } catch (err) {
    console.error("Deposit submit error:", err);
    btn.disabled = false;
    btn.textContent = originalText;
    alert("Error submitting deposit. Try again.");
  }
}