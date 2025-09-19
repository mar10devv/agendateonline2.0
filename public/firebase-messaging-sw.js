// Firebase Cloud Messaging Service Worker
// Handles background notifications

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Firebase config (same as in src/lib/firebase.ts)
firebase.initializeApp({
  apiKey: "AIzaSyDMfXjFrcsO_aW53BCcfIMgfZd7gMGf9Jk",
  authDomain: "agendate-4b2c3.firebaseapp.com",
  projectId: "agendate-4b2c3",
  storageBucket: "agendate-4b2c3.appspot.com",
  messagingSenderId: "961632832785",
  appId: "1:961632832785:web:eca2dc4f2773c0546c50b0",
  measurementId: "G-MFS0MZTQJN"
});

const messaging = firebase.messaging();

// Show notification when received in background
messaging.onBackgroundMessage((payload) => {
  console.log("Notification received in background:", payload);

  const { title, body } = payload.notification;

  self.registration.showNotification(title, {
    body,
    icon: "/icon.png"
  });
});
