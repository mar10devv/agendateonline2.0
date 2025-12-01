// src/components/agendaVirtual/backend/modalEmpleadosBackend.tsx
import { db, storage } from "../../../lib/firebase";
import {
  doc,
  getDoc,
  updateDoc
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";
import { obtenerConfigNegocio } from "../../../lib/firestore";
import { compressImageFileToWebP } from "../../../lib/imageUtils";

export type Empleado = {
  id?: string;
  nombre: string;
  email?: string;
  rol?: "empleado" | "admin" | "dueño";
  admin?: boolean;
  adminEmail?: string;
  fotoPerfil?: string;
  foto?: string;
  nombreArchivo?: string;
  trabajos: string[];
  calendario: {
    inicio: string;
    fin: string;
    diasLibres: string[];
  };
  esEmpleado?: boolean;
};

// 🔥 Subida ImgBB → con compresión
export async function subirImagenImgBB(file: File): Promise<string | null> {
  try {
    const compressedFile = await compressImageFileToWebP(file);

    const formData = new FormData();
    formData.append("image", compressedFile);

    const res = await fetch(
      `https://api.imgbb.com/1/upload?key=2d9fa5d6354c8d98e3f92b270213f787`,
      { method: "POST", body: formData }
    );

    const data = await res.json();
    return data?.data?.display_url || null;
  } catch (err) {
    console.error("❌ Error subiendo foto:", err);
    return null;
  }
}

// 📌 Storage (lo dejo porque puede estar siendo usado en otro lado)
export async function subirFotoEmpleadoStorage(file: File, empleadoId: string) {
  const storageRef = ref(storage, `empleados/${empleadoId}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

// 📌 Obtener empleados
export async function obtenerEmpleados(uid: string) {
  const data = await obtenerConfigNegocio(uid);

  if (data?.empleadosData) {
    data.empleadosData = data.empleadosData.map((e: any, idx: number) => ({
      ...e,
      id: e.id || String(idx),
      // si está en false lo respetamos, si está undefined asumimos true
      esEmpleado: e.esEmpleado === false ? false : true,
    }));
  }

  return data;
}

// 🟩 GUARDAR EMPLEADOS
export async function guardarEmpleados(uid: string, config: any) {
  try {
    const negocioRef = doc(db, "Negocios", uid);

    const empleadosNormalizados = (config.empleadosData || []).map(
      (e: any, idx: number) => ({
        id: e.id || String(idx),
        nombre: e.nombre || "",
        email: e.email || "",
        rol: e.rol || "empleado",
        admin: e.rol === "admin",
        adminEmail: e.adminEmail || "",
        fotoPerfil: e.fotoPerfil || "",
        nombreArchivo: e.nombreArchivo || "",
        trabajos: Array.isArray(e.trabajos) ? e.trabajos : [],
        calendario: e.calendario || {
          inicio: "",
          fin: "",
          diasLibres: [],
        },
        esEmpleado: e.esEmpleado === false ? false : true,
      })
    );

    // admins por correo
const adminUids = empleadosNormalizados
  .filter((e: Empleado) => e.rol === "admin" && e.adminEmail)
  .map((e: Empleado) => e.adminEmail!.trim().toLowerCase());


    // 👇 solo tocamos lo que corresponde a este modal
    await updateDoc(negocioRef, {
      empleadosData: empleadosNormalizados,
      adminUids,
    });

    console.log("✅ Empleados guardados correctamente con esEmpleado");
  } catch (err) {
    console.error("❌ Error guardando empleados:", err);
    throw err;
  }
}

// 📌 Nuevo empleado vacío
export function crearEmpleadoVacio(): Empleado {
  return {
    nombre: "",
    email: "",
    rol: "empleado",
    admin: false,
    adminEmail: "",
    fotoPerfil: "",
    trabajos: [],
    calendario: {
      inicio: "",
      fin: "",
      diasLibres: [],
    },
    esEmpleado: true, // default: empleado activo
  };
}

// 📌 Actualizar
export function actualizarEmpleado(
  config: any,
  index: number,
  field: keyof Empleado,
  value: any
) {
  const nuevo = [...config.empleadosData];
  (nuevo[index] as any)[field] = value;
  return { ...config, empleadosData: nuevo };
}

// 📌 Eliminar
export function eliminarEmpleado(config: any, index: number) {
  return {
    ...config,
    empleadosData: config.empleadosData.filter((_: any, i: number) => i !== index),
  };
}
