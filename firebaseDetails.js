// firebaseDetails.js

// ✅ Make sure you are using the compat version in HTML, like this:
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>

// ✅ Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQW9VLyn_nfgR27PO-3MEirIbZCWRo4_Q",
  authDomain: "ohut-d7c8d.firebaseapp.com",
  databaseURL: "https://ohut-d7c8d-default-rtdb.firebaseio.com",
  projectId: "ohut-d7c8d",
  storageBucket: "ohut-d7c8d.appspot.com",
  messagingSenderId: "916521389173",
  appId: "1:916521389173:web:5cd1b9b0c87d3bf4f87c3c",
  measurementId: "G-721RMQFD2K"
};

// ✅ Initialize Firebase
firebase.initializeApp(firebaseConfig);

// ✅ Make services globally available for other scripts
window.firebaseAuth = firebase.auth();
window.firebaseDB = firebase.firestore();
