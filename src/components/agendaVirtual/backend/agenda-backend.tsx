// src/components/agendaVirtual/backend/agenda-backend.ts
import imageCompression from "browser-image-compression";
import { compressImageFileToWebP } from "../../../lib/imageUtils";

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
  getDoc,
  setDoc,
  deleteDoc,
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
    try {
      // 1️⃣ Buscar negocio por slug
      const negocioDocs = await getDocs(
        query(collection(db, "Negocios"), where("slug", "==", slug))
      );

      if (negocioDocs.empty) {
        // 🚫 Slug inválido → no hay negocio
        callback("listo", "cliente", user, null);
        return;
      }

      // 2️⃣ Si existe negocio → armar objeto
      const negocioSnap = negocioDocs.docs[0];
      const negocioId = negocioSnap.id;
      const negocioData = negocioSnap.data();

      const preciosRef = collection(db, "Negocios", negocioId, "Precios");
      const preciosSnap = await getDocs(preciosRef);
      const servicios = preciosSnap.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Servicio)
      );

      const negocio: Negocio = {
        id: negocioId,
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
  foto: e.fotoPerfil || e.foto || "",   // 👈 siempre prioriza fotoPerfil
  especialidad: e.especialidad || "",
  calendario: e.calendario || {},
  trabajos: e.trabajos || [],
})),

        servicios,
        fotoPerfil: negocioData.fotoPerfil || "",
        configuracionAgenda: negocioData.configuracionAgenda || {},
        descripcion: negocioData.descripcion || "",
        ubicacion: negocioData.ubicacion || null,
      };

      // 3️⃣ Decidir estado según usuario
      if (!user) {
        callback("no-sesion", "cliente", null, negocio);
        return;
      }

      const modo = user.uid === negocioId ? "dueño" : "cliente";
      callback("listo", modo, user, negocio);
    } catch (err) {
      console.error("❌ Error en detectarUsuario:", err);
      callback("listo", "cliente", null, null);
    }
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
  foto: e.fotoPerfil || e.foto || "",   // 👈
  especialidad: e.especialidad || "",
  calendario: e.calendario || {},
  trabajos: e.trabajos || [],
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
  const negocioRef = doc(db, "Negocios", negocioId);

  // 🔹 Escuchar TODO el documento (así también vemos cuando se actualiza empleadosData)
  const unsubscribe = onSnapshot(negocioRef, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }

    const data = snap.data();

    // ⚡ Si tiene array empleadosData -> usarlo
    if (Array.isArray(data.empleadosData) && data.empleadosData.length > 0) {
const empleados = data.empleadosData.map((e: any, idx: number) => ({
  id: e.id || idx.toString(),
  nombre: e.nombre || "Empleado",
  foto: e.fotoPerfil || e.foto || "",   // 👈
  especialidad: e.especialidad || "",
  calendario: e.calendario || {},
  trabajos: e.trabajos || [],
}));


      callback(empleados);
    } else {
      // ⚡ Si no tiene array empleadosData -> usar fallback con datos básicos
      callback([
        {
          id: negocioId,
          nombre: data.nombre || "Empleado",
          foto: data.foto || data.fotoPerfil || "",
          especialidad: data.plantilla || "",
          calendario: data.configuracionAgenda || {},
        },
      ]);
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

  // 🔥 1) Comprimir antes de subir
  const compressedFile = await compressImageFileToWebP(file);

  const formData = new FormData();
  formData.append("image", compressedFile);

  // 🔥 2) Subir a ImgBB
  const res = await fetch(
    `https://api.imgbb.com/1/upload?key=2d9fa5d6354c8d98e3f92b270213f787`,
    { method: "POST", body: formData }
  );

  const data = await res.json();
  if (!data?.data?.display_url) {
    throw new Error("❌ Error al subir imagen a ImgBB");
  }

  const url = data.data.display_url;

  // 🔥 3) Guardar en Firestore
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

export async function actualizarNombreYSlug(
  slugActual: string,
  nuevoNombre: string
) {
  const nuevoSlug = nuevoNombre
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");

  // 👉 Buscar el doc actual por slugActual
  const negocioDocs = await getDocs(
    query(collection(db, "Negocios"), where("slug", "==", slugActual))
  );
  if (negocioDocs.empty) throw new Error("❌ Negocio no encontrado");

  const negocioId = negocioDocs.docs[0].id;

  // 👉 Verificar si ya existe otro negocio con ese nuevo slug
  const existeSnap = await getDocs(
    query(collection(db, "Negocios"), where("slug", "==", nuevoSlug))
  );
  if (!existeSnap.empty && existeSnap.docs[0].id !== negocioId) {
    throw new Error("❌ Ya existe otro negocio con ese slug.");
  }

  // 👉 Actualizar el doc actual
  const negocioRef = doc(db, "Negocios", negocioId);
  await updateDoc(negocioRef, {
    nombre: nuevoNombre,
    slug: nuevoSlug,
  });

  // ✅ Devolvemos el nuevo slug (sin intentar buscar de nuevo)
  return nuevoSlug;
}

