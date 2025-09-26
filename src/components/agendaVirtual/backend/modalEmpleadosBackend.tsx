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

// 🔒 Tipo base de Empleado
export type Empleado = {
  id?: string;
  nombre: string;
  fotoPerfil?: string;
  trabajos: string[];
  calendario: {
    inicio: string;
    fin: string;
    diasLibres: string[];
  };
};

// 🚀 Subida de imágenes a ImgBB
export async function subirImagenImgBB(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(
    `https://api.imgbb.com/1/upload?key=2d9fa5d6354c8d98e3f92b270213f787`,
    { method: "POST", body: formData }
  );

  const data = await res.json();
  return data?.data?.display_url || null;
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
    fotoPerfil: "",
    trabajos: Array(6).fill(""),
    calendario: {
      inicio: "08:00",
      fin: "17:00",
      diasLibres: [],
    },
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
