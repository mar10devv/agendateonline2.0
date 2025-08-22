// src/lib/firestore.ts
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// 🔹 Tipado opcional de la config
export interface NegocioConfig {
  nombre: string;
  slug: string;
  plantilla: string;
  hoverColor: string;
  logoUrl: string;
  usarLogo: boolean;
  email: string;
}

// Obtener configuración de un negocio
export async function obtenerConfigNegocio(uid: string): Promise<NegocioConfig | null> {
  try {
    const negocioRef = doc(db, "Negocios", uid);
    const snap = await getDoc(negocioRef);

    if (snap.exists()) {
      return snap.data() as NegocioConfig;
    } else {
      return null;
    }
  } catch (error) {
    console.error("❌ Error al obtener config negocio:", error);
    return null;
  }
}

// Guardar configuración de un negocio
export async function guardarConfigNegocio(uid: string, data: Partial<NegocioConfig>) {
  try {
    const negocioRef = doc(db, "Negocios", uid);
    await setDoc(negocioRef, data, { merge: true });
    return true;
  } catch (error) {
    console.error("❌ Error al guardar config negocio:", error);
    return false;
  }
}
