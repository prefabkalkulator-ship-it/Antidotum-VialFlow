import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDLrp4h3TTbUbIenpPwHs-uys98FMqUgm4",
  authDomain: "antidotum-vialflow-mvp.firebaseapp.com",
  projectId: "antidotum-vialflow-mvp",
  storageBucket: "antidotum-vialflow-mvp.firebasestorage.app",
  messagingSenderId: "392406857647",
  appId: "1:392406857647:web:387676046865c419ee215a"
};

const app = initializeApp(firebaseConfig);

const getFirebaseMessaging = async () => {
  const supported = await isSupported();
  if (supported) {
    return getMessaging(app);
  }
  return null;
};

export { getFirebaseMessaging, getToken, onMessage };
