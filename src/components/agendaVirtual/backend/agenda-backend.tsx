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

export async function getNegocioPorSlug(slug: string) {
  const q = query(collection(db, "Negocios"), where("slug", "==", slug));
  const snap = await getDocs(q);

  if (snap.empty) return null;

  const negocio = snap.docs[0].data();

  return {
    id: snap.docs[0].id,
    ...negocio, // 👈 esto asegura que también venga "ubicacion"
  };
}

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
  id?: string;
  nombre: string;
  foto?: string;
  especialidad?: string;
  calendario?: any;
};

export type Servicio = {
  id?: string;
  servicio: string;
  precio: number;
  duracion: number;
};

export type Negocio = {
  id: string; 
  nombre: string;
  direccion: string;
  slug: string;
  perfilLogo?: string;
  bannerUrl?: string;
  plantilla?: string;
  tipoPremium?: "gratis" | "lite" | "gold";
  empleadosData?: Empleado[];
  servicios?: Servicio[];
  fotoPerfil?: string;           // 👈 foto de un único empleado
  configuracionAgenda?: any;
  descripcion?: string;          // 👈 agregado ahora
  ubicacion?: {                  // 👈 NUEVO
    lat: number;
    lng: number;
    direccion: string;
  };
};


export async function guardarUbicacionNegocio(
  slug: string,
  ubicacion: { lat: number; lng: number; direccion: string }
) {
  try {
    // 🔍 Buscar negocio con ese slug
    const negocioDocs = await getDocs(
      query(collection(db, "Negocios"), where("slug", "==", slug))
    );

    if (negocioDocs.empty) {
      throw new Error("❌ No se encontró negocio con ese slug");
    }

    // ✅ Tomar el ID real del documento
    const negocioId = negocioDocs.docs[0].id;
    const negocioRef = doc(db, "Negocios", negocioId);

    // 📝 Guardar ubicación en Firestore
    await updateDoc(negocioRef, { ubicacion });

    console.log("✅ Ubicación guardada en Firestore");
  } catch (err) {
    console.error("❌ Error al guardar ubicación:", err);
    throw err;
  }
}


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
  id: negocioId,   // 👈 agregado aquí
  nombre: negocioData.nombre || "",
  direccion: negocioData.direccion || "",
  slug: negocioData.slug || "",
  perfilLogo: negocioData.perfilLogo,
  bannerUrl: negocioData.bannerUrl,
  plantilla: negocioData.plantilla,
  tipoPremium: negocioData.tipoPremium || "gratis",
  empleadosData: (negocioData.empleadosData || []).map((e: any) => ({
    id: e.id || "",
    nombre: e.nombre || "",
    foto: e.foto || e.fotoPerfil || "",
    especialidad: e.especialidad || "",
    calendario: e.calendario || {},
  })),
  servicios,
  fotoPerfil: negocioData.fotoPerfil || "",
  configuracionAgenda: negocioData.configuracionAgenda || {},
  descripcion: negocioData.descripcion || "",
  ubicacion: negocioData.ubicacion || null,
};


    const modo = user.uid === negocioId ? "dueño" : "cliente";
    callback("listo", modo, user, negocio);
  });
}

// 👥 Obtener empleados (una sola vez)
export async function getEmpleados(slug: string): Promise<Empleado[]> {
  const negocioDocs = await getDocs(
    query(collection(db, "Negocios"), where("slug", "==", slug))
  );
  if (negocioDocs.empty) return [];

  const negocioData = negocioDocs.docs[0].data();

// ⚡ Si existe array empleadosData, lo uso
if (Array.isArray(negocioData.empleadosData) && negocioData.empleadosData.length > 0) {
  return negocioData.empleadosData.map((e: any) => ({
    id: e.id || "",
    nombre: e.nombre || "",
    foto: e.fotoPerfil || "",   // 👈 normalizado
    especialidad: e.especialidad || "",
    calendario: e.calendario || {},
  }));
}


  // ⚡ Si no hay empleadosData, construyo uno con los campos del negocio
  return [
    {
      id: negocioDocs.docs[0].id,
      nombre: negocioData.nombre || "Empleado",
      foto: negocioData.foto || negocioData.fotoPerfil || "",
      especialidad: negocioData.plantilla || "",
      calendario: negocioData.configuracionAgenda || {},
    },
  ];



  // ⚡ Si no hay empleadosData, construyo uno con los campos del negocio
  return [
    {
      id: negocioDocs.docs[0].id,
      nombre: negocioData.nombre || "Empleado",
      foto: negocioData.foto || negocioData.fotoPerfil || "",
      especialidad: negocioData.plantilla || "",
      calendario: negocioData.configuracionAgenda || {},
    },
  ];
}

// 👂 Escuchar empleados en tiempo real
export async function escucharEmpleados(
  slug: string,
  callback: (empleados: Empleado[]) => void
): Promise<() => void> {
  const negocioDocs = await getDocs(
    query(collection(db, "Negocios"), where("slug", "==", slug))
  );
  if (negocioDocs.empty) {
    callback([]);
    return () => {};
  }

const negocioId = negocioDocs.docs[0].id;
const empleadosRef = collection(db, "Negocios", negocioId, "Empleados");

const unsubscribe = onSnapshot(empleadosRef, (snapshot) => {
  if (snapshot.empty) {
    // ⚡ Si no hay subcolección, devuelvo un único empleado con los datos del negocio
    const negocioData = negocioDocs.docs[0].data();
    callback([
      {
        id: negocioId,
        nombre: negocioData.nombre || "Empleado",
        foto: negocioData.fotoPerfil || "",   // 👈 normalizado
        especialidad: negocioData.plantilla || "",
        calendario: negocioData.configuracionAgenda || {},
      },
    ]);
  } else {
    const empleados = snapshot.docs.map((doc) => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        nombre: data.nombre || "Empleado",
        foto: data.fotoPerfil || "",   // 👈 normalizado
        especialidad: data.especialidad || "",
        calendario: data.calendario || {},
      } as Empleado;
    });
    callback(empleados);
  }
});

return unsubscribe;
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

// 🖼️ Subir logo del negocio
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

// ➕ Agregar servicio
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
): Promise<() => void> {
  const negocioDocs = await getDocs(
    query(collection(db, "Negocios"), where("slug", "==", slug))
  );
  if (negocioDocs.empty) {
    callback([]);
    return () => {};
  }

  const negocioId = negocioDocs.docs[0].id;
  const preciosRef = collection(db, "Negocios", negocioId, "Precios");

  const unsubscribe = onSnapshot(preciosRef, (snapshot) => {
    const servicios = snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Servicio)
    );
    callback(servicios);
  });

  return unsubscribe;
}

// ✏️ Actualizar nombre negocio
export async function actualizarNombreNegocio(
  slug: string,
  nuevoNombre: string
) {
  const negocioDocs = await getDocs(
    query(collection(db, "Negocios"), where("slug", "==", slug))
  );
  if (negocioDocs.empty) throw new Error("❌ Negocio no encontrado");

  const negocioId = negocioDocs.docs[0].id;
  const negocioRef = doc(db, "Negocios", negocioId);
  await updateDoc(negocioRef, { nombre: nuevoNombre });
}

// ✏️ Actualizar nombre + slug
export async function actualizarNombreYSlug(
  slugActual: string,
  nuevoNombre: string
) {
  const nuevoSlug = nuevoNombre
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");

  const existeSnap = await getDocs(
    query(collection(db, "Negocios"), where("slug", "==", nuevoSlug))
  );
  if (!existeSnap.empty) {
    throw new Error("❌ Ya existe un negocio con ese nombre/slug.");
  }

  const negocioDocs = await getDocs(
    query(collection(db, "Negocios"), where("slug", "==", slugActual))
  );
  if (negocioDocs.empty) throw new Error("❌ Negocio no encontrado");

  const negocioId = negocioDocs.docs[0].id;
  const negocioRef = doc(db, "Negocios", negocioId);

  await updateDoc(negocioRef, {
    nombre: nuevoNombre,
    slug: nuevoSlug,
  });

  return nuevoSlug;
}
