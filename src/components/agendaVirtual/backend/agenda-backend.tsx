
// BACK END SRC/COMPONENTS/AGENDAVIRTUAL/AGENDA-BACKEND.TS
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";

export type Negocio = {
  id?: string; // 🔹 agregamos opcionalmente el id del doc
  nombre: string;
  slug: string;
  direccion?: string;
  ownerUid: string;
  tipoPremium?: "gratis" | "lite" | "gold";
  logoUrl?: string;
  bannerUrl?: string;
  empleadosData?: Empleado[];
};

export type Empleado = {
  id?: string;
  nombre: string;
  foto?: string;
  especialidad?: string;
};

export type Turno = {
  id: string;
  cliente: string;
  email: string;
  servicio: string;
  fecha: string;
  hora: string;
  estado: "pendiente" | "confirmado" | "cancelado";
  barbero: string;
  uidCliente?: string;
};

// 🔹 Obtener negocio por slug
export async function getNegocio(slug: string): Promise<Negocio | null> {
  const q = query(collection(db, "Negocios"), where("slug", "==", slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Negocio;
}

// 🔹 Detectar usuario logueado y rol (dueño / cliente)
export function detectarUsuario(
  slug: string,
  callback: (
    estado: "cargando" | "no-sesion" | "listo",
    modo: "dueño" | "cliente",
    user: User | null,
    negocio: Negocio | null
  ) => void
) {
  const auth = getAuth();
  callback("cargando", "cliente", null, null);

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback("no-sesion", "cliente", null, null);
      return;
    }

    const negocio = await getNegocio(slug);
    if (!negocio) {
      callback("listo", "cliente", user, null);
      return;
    }

    if (user.uid === negocio.ownerUid) {
      callback("listo", "dueño", user, negocio);
    } else {
      callback("listo", "cliente", user, negocio);
    }
  });
}

// 🔹 Obtener empleados de un negocio
export async function getEmpleados(slug: string): Promise<Empleado[]> {
  const negocio = await getNegocio(slug);
  return negocio?.empleadosData || [];
}

// 🔹 Obtener turnos de un negocio en una fecha
export async function getTurnos(slug: string, fecha: string): Promise<Turno[]> {
  const q = query(
    collection(db, "Turnos"),
    where("slugNegocio", "==", slug),
    where("fecha", "==", fecha)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Turno[];
}

// 🔹 Login con Google
export async function loginConGoogle() {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}
