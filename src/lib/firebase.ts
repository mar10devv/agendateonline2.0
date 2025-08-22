// src/lib/firebase.ts
import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
} from "firebase/auth";

// ⚡️ Configuración de Firebase desde variables de entorno (.env o Netlify Env)
const firebaseConfig = {
  apiKey: "AIzaSyDMfXjFrcsO_aW53BCcfIMgfZd7gMGf9Jk",
  authDomain: "agendate-4b2c3.firebaseapp.com",
  projectId: "agendate-4b2c3",
  storageBucket: "agendate-4b2c3.appspot.com", // ← aquí está el fix
  messagingSenderId: "961632832785",
  appId: "1:961632832785:web:eca2dc4f2773c0546c50b0",
  measurementId: "G-MFS0MZTQJN"
};

// 🔍 Debug: mostrar config en consola del navegador
console.log("👉 Firebase config cargado en cliente:", firebaseConfig);

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);

// Auth
export const auth = getAuth(app);

// 👇 asegura que la sesión quede guardada en localStorage
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Error configurando persistencia:", err);
});

// Proveedor de Google
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
