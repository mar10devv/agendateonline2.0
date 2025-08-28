// src/lib/firestore.ts
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface NegocioConfig {
  nombre: string;
  slug: string;
  plantilla: string;
  hoverColor: string;
  logoUrl: string;
  usarLogo: boolean;
  email: string;
  eslogan?: string;
  fuenteBotones?: string;
  fuenteTexto?: string;
  fuenteLogo?: string;
  bannerImages?: string[];
  empleados?: number;
  empleadosData?: any[];
  trabajos?: any[];
}

// ✅ Obtener config usando UID (único por usuario)
export async function obtenerConfigNegocio(uid: string): Promise<NegocioConfig | null> {
  try {
    const negocioRef = doc(db, "Negocios", uid);
    const snap = await getDoc(negocioRef);
    return snap.exists() ? (snap.data() as NegocioConfig) : null;
  } catch (error) {
    console.error("❌ Error al obtener config negocio:", error);
    return null;
  }
}

// ✅ Guardar config en Negocios/{uid}
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
