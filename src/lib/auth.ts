import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

// 🔹 Guardar o actualizar usuario en Firestore
export async function guardarUsuarioFirestore(user: User) {
  if (!user) return;

  const userRef = doc(db, "Usuarios", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    // Nuevo usuario → lo creamos
    await setDoc(userRef, {
      nombre: user.displayName || "",
      email: user.email || "",
      fotoPerfil: user.photoURL || "",
      rol: "usuario",
      premium: false,
      creadoEn: new Date(),
    });
  } else {
    // Ya existe → actualizamos nombre y foto (sin tocar rol/premium)
    await setDoc(
      userRef,
      {
        nombre: user.displayName || "",
        fotoPerfil: user.photoURL || "",
      },
      { merge: true }
    );
  }
}

// 🔹 Login con Google
export async function loginConGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      await guardarUsuarioFirestore(result.user);
    }
  } catch (error) {
    console.error("❌ Error en login con Google:", error);
  }
}

// 🔹 Escuchar usuario autenticado
export function escucharUsuario(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      await guardarUsuarioFirestore(user);
    }
    callback(user);
  });
}

// 🔹 Logout
export async function logout() {
  await signOut(auth);
}
