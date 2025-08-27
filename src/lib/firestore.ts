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
}

// Obtener configuración de un negocio (siempre desde Usuarios/{uid})
export async function obtenerConfigNegocio(uid: string): Promise<NegocioConfig | null> {
  try {
    const userRef = doc(db, "Usuarios", uid);
    const snap = await getDoc(userRef);

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

// Guardar configuración tanto en Usuarios/{uid} como en Negocios/{slug}
export async function guardarConfigNegocio(uid: string, data: Partial<NegocioConfig>) {
  try {
    // Guardar en Usuarios/{uid}
    const userRef = doc(db, "Usuarios", uid);
    await setDoc(userRef, data, { merge: true });

    // Guardar en Negocios/{slug} para la web pública
    if (data.slug) {
      const negocioRef = doc(db, "Negocios", data.slug);
      await setDoc(negocioRef, data, { merge: true });
    }

    return true;
  } catch (error) {
    console.error("❌ Error al guardar config negocio:", error);
    return false;
  }
}
