importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDLrp4h3TTbUbIenpPwHs-uys98FMqUgm4",
  authDomain: "antidotum-vialflow-mvp.firebaseapp.com",
  projectId: "antidotum-vialflow-mvp",
  storageBucket: "antidotum-vialflow-mvp.firebasestorage.app",
  messagingSenderId: "392406857647",
  appId: "1:392406857647:web:387676046865c419ee215a"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Otrzymano wiadomość w tle: ', payload);

  const notificationTitle = payload.notification?.title || 'Nowe powiadomienie z Antidotum';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/icon-512x512.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
