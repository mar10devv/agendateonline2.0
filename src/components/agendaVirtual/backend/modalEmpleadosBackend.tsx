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
import { guardarConfigNegocio, obtenerConfigNegocio } from "../../../lib/firestore";
import { compressImageFileToWebP } from "../../../lib/imageUtils"; // 👈 importamos el helper

// 🔒 Tipo base de Empleado
export type Empleado = {
  id?: string;
  nombre: string;
  email?: string;
  rol?: "empleado" | "admin";
  admin?: boolean;
  adminEmail?: string;
  fotoPerfil?: string;
  foto?: string; // 👈 compatibilidad con UI anterior
  nombreArchivo?: string;
  trabajos: string[];
  calendario: {
    inicio: string;
    fin: string;
    diasLibres: string[];
  };
  esEmpleado?: boolean; // 👈 nuevo: true = aparece como empleado disponible, false = solo dueño
};

// 🚀 Subida de imágenes a ImgBB (con compresión WebP)
export async function subirImagenImgBB(file: File): Promise<string | null> {
  try {
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
    return data?.data?.display_url || null;
  } catch (err) {
    console.error("❌ Error subiendo foto de empleado:", err);
    return null;
  }
}

// 📌 Subida de foto a Firebase Storage (opcional si no usás ImgBB)
export async function subirFotoEmpleadoStorage(file: File, empleadoId: string) {
  const storageRef = ref(storage, `empleados/${empleadoId}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

// 📌 Obtener configuración del negocio
export async function obtenerEmpleados(uid: string) {
  return await obtenerConfigNegocio(uid);
}

// 📌 Guardar configuración completa (incluye empleados)
export async function guardarEmpleados(uid: string, config: any) {
  await guardarConfigNegocio(uid, config);
}

// 📌 Agregar un nuevo empleado a la config local
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
    esEmpleado: true, // 👈 por defecto todos los nuevos son empleados activos
  };
}

// 📌 Actualizar datos de un empleado dentro de config
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

// 📌 Eliminar empleado de la config local
export function eliminarEmpleado(config: any, index: number) {
  return {
    ...config,
    empleadosData: config.empleadosData.filter((_: any, i: number) => i !== index),
  };
}
