// src/components/agendaVirtual/backend/agenda-backend.ts
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
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";

// ---------------------- Tipos ----------------------
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
  fotoPerfil?: string;
  configuracionAgenda?: any;
  descripcion?: string;
  ubicacion?: {
    lat: number;
    lng: number;
    direccion: string;
  };
};

// ✅ Importamos el tipo Empleado unificado
import type { Empleado } from "./modalEmpleadosBackend";

// ---------------------- Funciones ----------------------

// 📍 Obtener negocio por slug
export async function getNegocioPorSlug(slug: string) {
  const q = query(collection(db, "Negocios"), where("slug", "==", slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// 📍 Guardar ubicación
export async function guardarUbicacionNegocio(
  slug: string,
  ubicacion: { lat: number; lng: number; direccion: string }
) {
  const negocioDocs = await getDocs(
    query(collection(db, "Negocios"), where("slug", "==", slug))
  );
  if (negocioDocs.empty) throw new Error("❌ No se encontró negocio con ese slug");
  const negocioId = negocioDocs.docs[0].id;
  await updateDoc(doc(db, "Negocios", negocioId), { ubicacion });
  console.log("✅ Ubicación guardada en Firestore");
}

// 🔐 Login con Google
export async function loginConGoogle() {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

// 🧠 Detectar usuario (dueño / cliente)
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
      const negocioDocs = await getDocs(
        query(collection(db, "Negocios"), where("slug", "==", slug))
      );

      if (negocioDocs.empty) {
        callback("listo", "cliente", user, null);
        return;
      }

      const negocioSnap = negocioDocs.docs[0];
      const negocioId = negocioSnap.id;
      const negocioData = negocioSnap.data();

      const preciosRef = collection(db, "Negocios", negocioId, "Precios");
      const preciosSnap = await getDocs(preciosRef);
      const servicios = preciosSnap.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Servicio)
      );

      // 🔹 Mapeo de empleados actualizado
      const empleadosData = (negocioData.empleadosData || []).map((e: any) => ({
        id: e.id || "",
        nombre: e.nombre || "",
        email: e.email || "",
        rol: e.rol || "empleado",
        admin: e.admin || false,
        adminEmail: e.adminEmail || "",
        fotoPerfil: e.fotoPerfil || e.foto || "",
        foto: e.fotoPerfil || e.foto || "", // 👈 siempre devolver ambos
        nombreArchivo: e.nombreArchivo || "",
        trabajos: e.trabajos || [],
        calendario: e.calendario || { inicio: "", fin: "", diasLibres: [] },
      }));

      const negocio: Negocio = {
        id: negocioId,
        nombre: negocioData.nombre || "",
        direccion: negocioData.direccion || "",
        slug: negocioData.slug || "",
        perfilLogo: negocioData.perfilLogo,
        bannerUrl: negocioData.bannerUrl,
        plantilla: negocioData.plantilla,
        tipoPremium: negocioData.tipoPremium || "gratis",
        empleadosData,
        servicios,
        fotoPerfil: negocioData.fotoPerfil || "",
        configuracionAgenda: negocioData.configuracionAgenda || {},
        descripcion: negocioData.descripcion || "",
        ubicacion: negocioData.ubicacion || null,
      };

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

// 👥 Obtener empleados una vez
export async function getEmpleados(slug: string): Promise<Empleado[]> {
  const negocioDocs = await getDocs(
    query(collection(db, "Negocios"), where("slug", "==", slug))
  );
  if (negocioDocs.empty) return [];

  const negocioData = negocioDocs.docs[0].data();

  if (Array.isArray(negocioData.empleadosData) && negocioData.empleadosData.length > 0) {
    return negocioData.empleadosData.map((e: any) => ({
      id: e.id || "",
      nombre: e.nombre || "",
      email: e.email || "",
      rol: e.rol || "empleado",
      admin: e.admin || false,
      adminEmail: e.adminEmail || "",
      fotoPerfil: e.fotoPerfil || e.foto || "",
      foto: e.fotoPerfil || e.foto || "", // 👈 agregado
      nombreArchivo: e.nombreArchivo || "",
      trabajos: e.trabajos || [],
      calendario: e.calendario || { inicio: "", fin: "", diasLibres: [] },
    }));
  }

  // Fallback: sin empleados guardados
  return [
    {
      id: negocioDocs.docs[0].id,
      nombre: negocioData.nombre || "Empleado",
      fotoPerfil: negocioData.foto || negocioData.fotoPerfil || "",
      foto: negocioData.foto || negocioData.fotoPerfil || "", // 👈 agregado
      rol: "empleado",
      admin: false,
      adminEmail: "",
      trabajos: [],
      calendario: negocioData.configuracionAgenda || {
        inicio: "",
        fin: "",
        diasLibres: [],
      },
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

  const unsubscribe = onSnapshot(negocioRef, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }

    const data = snap.data();

    if (Array.isArray(data.empleadosData) && data.empleadosData.length > 0) {
      const empleados = data.empleadosData.map((e: any, idx: number) => ({
        id: e.id || idx.toString(),
        nombre: e.nombre || "Empleado",
        email: e.email || "",
        rol: e.rol || "empleado",
        admin: e.admin || false,
        adminEmail: e.adminEmail || "",
        fotoPerfil: e.fotoPerfil || e.foto || "",
        foto: e.fotoPerfil || e.foto || "", // 👈 agregado
        nombreArchivo: e.nombreArchivo || "",
        trabajos: e.trabajos || [],
        calendario: e.calendario || { inicio: "", fin: "", diasLibres: [] },
      }));
      callback(empleados);
    } else {
      callback([
        {
          id: negocioId,
          nombre: data.nombre || "Empleado",
          fotoPerfil: data.foto || data.fotoPerfil || "",
          foto: data.foto || data.fotoPerfil || "", // 👈 agregado
          rol: "empleado",
          admin: false,
          adminEmail: "",
          trabajos: [],
          calendario: data.configuracionAgenda || {
            inicio: "",
            fin: "",
            diasLibres: [],
          },
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

