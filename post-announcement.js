// post-announcement.js (for compat Firebase setup)

document.addEventListener("DOMContentLoaded", () => {
  const postBtn = document.getElementById("postAnnouncementBtn");
  const messageInput = document.getElementById("announcementInput");
  const statusText = document.getElementById("announcementStatus");

  // Use global firebaseAuth and firebaseDB from firebaseDetails.js
  firebaseAuth.onAuthStateChanged(async (user) => {
    if (!user) {
      statusText.textContent = "❌ You must be logged in to post announcements.";
      postBtn.disabled = true;
      return;
    }

    const userEmail = user.email.toLowerCase();
    const ADMIN_EMAIL = "josh@ohut.com";

    if (userEmail !== ADMIN_EMAIL) {
      statusText.textContent = "❌ You are not authorized to post announcements.";
      postBtn.disabled = true;
      return;
    }

    // ✅ Enable button
    postBtn.disabled = false;

    postBtn.addEventListener("click", async () => {
      const message = messageInput.value.trim();

      if (!message) {
        statusText.textContent = "⚠️ Please enter an announcement.";
        statusText.style.color = "orange";
        return;
      }

      try {
        await firebaseDB.collection("announcements").doc("public").set({
          message: message,
          updatedAt: new Date().toISOString(),
          postedBy: userEmail
        });

        statusText.textContent = "✅ Announcement posted successfully!";
        statusText.style.color = "green";
        messageInput.value = "";
      } catch (error) {
        console.error("Error posting announcement:", error);
        statusText.textContent = "❌ Failed to post announcement.";
        statusText.style.color = "red";
      }
    });
  });
});
