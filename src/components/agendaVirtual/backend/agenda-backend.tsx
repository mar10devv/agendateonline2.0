// src/components/agendaVirtual/backend/agenda-backend.ts
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  doc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  addDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";

// 🔒 Tipos
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

export type Empleado = {
  nombre: string;
  foto?: string;
  especialidad?: string;
  calendario?: any;
};

export type Servicio = {
  id?: string;
  servicio: string; // 👈 consistente con PreciosControlPanel
  precio: number;
  duracion: number;
};

export type Negocio = {
  nombre: string;
  direccion: string;
  slug: string;
  perfilLogo?: string;
  bannerUrl?: string;
  plantilla?: string;
  tipoPremium?: "gratis" | "lite" | "gold";
  empleadosData?: Empleado[];
  servicios?: Servicio[];
};

// 🔐 Login con Google
export async function loginConGoogle() {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

// 🧠 Detecta usuario y carga negocio + servicios
export async function detectarUsuario(
  slug: string,
  callback: (
    estado: "cargando" | "listo" | "no-sesion",
    modo: "dueño" | "cliente",
    user: any,
    negocio: Negocio | null
  ) => void
) {
  const auth = getAuth();
  onAuthStateChanged(auth, async (user) => {
    if (!user) return callback("no-sesion", "cliente", null, null);

    const negocioDocs = await getDocs(
      query(collection(db, "Negocios"), where("slug", "==", slug))
    );
    if (negocioDocs.empty) {
      return callback("no-sesion", "cliente", user, null);
    }

    const negocioSnap = negocioDocs.docs[0];
    const negocioId = negocioSnap.id;
    const negocioData = negocioSnap.data();

    // 🔹 Obtener servicios desde la subcolección Precios
    const preciosRef = collection(db, "Negocios", negocioId, "Precios");
    const preciosSnap = await getDocs(preciosRef);
    const servicios = preciosSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Servicio)
    );

    const negocio: Negocio = {
      nombre: negocioData.nombre || "",
      direccion: negocioData.direccion || "",
      slug: negocioData.slug || "",
      perfilLogo: negocioData.perfilLogo,
      bannerUrl: negocioData.bannerUrl,
      plantilla: negocioData.plantilla,
      tipoPremium: negocioData.tipoPremium || "gratis",
      empleadosData: negocioData.empleadosData || [],
      servicios,
    };

    const modo = user.uid === negocioId ? "dueño" : "cliente";
    callback("listo", modo, user, negocio);
  });
}

// 👥 Obtener empleados
export async function getEmpleados(slug: string): Promise<Empleado[]> {
  const negocioDocs = await getDocs(
    query(collection(db, "Negocios"), where("slug", "==", slug))
  );
  if (negocioDocs.empty) return [];

  const negocioData = negocioDocs.docs[0].data();
  const empleadosData = negocioData.empleadosData || [];

  return empleadosData.map((e: any) => ({
    nombre: e.nombre,
    foto: e.foto || e.fotoPerfil || "",
    especialidad: e.especialidad || "",
    calendario: e.calendario || {},
  }));
}

// 📆 Obtener turnos por fecha
export async function getTurnos(slug: string, fecha: string): Promise<Turno[]> {
  const negocioDocs = await getDocs(
    query(collection(db, "Negocios"), where("slug", "==", slug))
  );
  if (negocioDocs.empty) return [];

  const negocioId = negocioDocs.docs[0].id;
  const turnosRef = collection(db, "Negocios", negocioId, "Turnos");
  const turnosSnap = await getDocs(turnosRef);

  return turnosSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((t: any) => t.fecha === fecha) as Turno[];
}

// 🖼️ Subir logo del negocio con ImgBB y guardarlo en perfilLogo
export async function subirLogoNegocio(file: File): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No hay usuario autenticado");

  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(
    `https://api.imgbb.com/1/upload?key=2d9fa5d6354c8d98e3f92b270213f787`,
    { method: "POST", body: formData }
  );

  const data = await res.json();
  if (!data?.data?.display_url) {
    throw new Error("❌ Error al subir imagen a ImgBB");
  }

  const url = data.data.display_url;

  const negocioDocs = await getDocs(
    query(collection(db, "Negocios"), where("ownerUid", "==", user.uid))
  );
  if (negocioDocs.empty) {
    throw new Error("❌ No se encontró negocio para este usuario");
  }

  const negocioId = negocioDocs.docs[0].id;
  const negocioRef = doc(db, "Negocios", negocioId);

  await updateDoc(negocioRef, { perfilLogo: url });

  return url;
}

// ➕ Agregar servicio a la subcolección "Precios"
export async function agregarServicio(
  slug: string,
  servicio: { nombre: string; precio: number; duracion?: number }
) {
  const negocioDocs = await getDocs(
    query(collection(db, "Negocios"), where("slug", "==", slug))
  );
  if (negocioDocs.empty) throw new Error("❌ Negocio no encontrado");

  const negocioId = negocioDocs.docs[0].id;
  const preciosRef = collection(db, "Negocios", negocioId, "Precios");

  await addDoc(preciosRef, {
    servicio: servicio.nombre,
    precio: servicio.precio,
    duracion: servicio.duracion || 0,
  });
}

// 👂 Escuchar servicios en tiempo real
export async function escucharServicios(
  slug: string,
  callback: (servicios: Servicio[]) => void
) {
  const negocioDocs = await getDocs(
    query(collection(db, "Negocios"), where("slug", "==", slug))
  );
  if (negocioDocs.empty) return callback([]);

  const negocioId = negocioDocs.docs[0].id;
  const preciosRef = collection(db, "Negocios", negocioId, "Precios");

  onSnapshot(preciosRef, (snapshot) => {
    const servicios = snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Servicio)
    );
    callback(servicios);
  });
}
