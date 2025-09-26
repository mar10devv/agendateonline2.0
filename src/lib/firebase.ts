// src/lib/firebase.ts
import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
} from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDMfXjFrcsO_aW53BCcfIMgfZd7gMGf9Jk",
  authDomain: "agendate-4b2c3.firebaseapp.com",
  projectId: "agendate-4b2c3",
  storageBucket: "agendate-4b2c3.appspot.com",
  messagingSenderId: "961632832785",
  appId: "1:961632832785:web:eca2dc4f2773c0546c50b0",
  measurementId: "G-MFS0MZTQJN",
};

console.log("👉 Firebase config cargado en cliente:", firebaseConfig);

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ✅ Auth
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Error configurando persistencia:", err);
});

export const googleProvider = new GoogleAuthProvider();

// ✅ Messaging (registramos el SW y lo conectamos)
export let messaging: ReturnType<typeof getMessaging> | null = null;

if (typeof window !== "undefined") {
  isSupported()
    .then(async (soporta) => {
      if (soporta) {
        try {
          const registration = await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js"
          );

          
          console.log("✅ Service Worker registrado:", registration);

          messaging = getMessaging(app);

          // 🔑 Asociar messaging al SW para evitar errores de suscripción
          // (importante en navegadores como Chrome)
          (messaging as any).swRegistration = registration;
        } catch (err) {
          console.error("❌ Error registrando Service Worker:", err);
        }
      } else {
        console.warn("⚠️ Este navegador no soporta Firebase Messaging.");
      }
    })
    .catch((err) => {
      console.error("❌ Error verificando soporte de messaging:", err);
    });
}
