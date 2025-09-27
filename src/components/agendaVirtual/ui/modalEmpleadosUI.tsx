// src/components/agendaVirtual/ui/modalEmpleadosUI.tsx
import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import ModalServicios from "../modalServicios";

import ModalBase from "../../ui/modalGenerico";
import ModalAviso from "../../ui/modalAviso";
import ModalHorariosEmpleados from "./modalEmpleadosHorarios";


import {
  subirImagenImgBB,
  guardarEmpleados,
  obtenerEmpleados,
  crearEmpleadoVacio,
  actualizarEmpleado,
  eliminarEmpleado,
} from "../backend/modalEmpleadosBackend";
import type { Empleado } from "../backend/modalEmpleadosBackend"; // ✅ import type

type Props = {
  abierto: boolean;
  onCerrar: () => void;
};

export default function ModalEmpleadosUI({ abierto, onCerrar }: Props) {
  const [user, setUser] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
const [estado, setEstado] = useState<
  "cargando" | "listo" | "guardando" | "exito" | "sin-acceso"
>("cargando");
const esGuardando = estado === "guardando";


  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<number | null>(null);
  const [horarioTemp, setHorarioTemp] = useState({
    inicio: "08:00",
    fin: "17:00",
    diasLibres: [] as string[],
  });

  const [empleadoAEliminar, setEmpleadoAEliminar] = useState<number | null>(null);
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const hayEmpleadoSinEditar = config?.empleadosData?.some(
  (emp: Empleado) => !emp.nombre?.trim()
);


  // 🔑 Detectar usuario y cargar config
  useEffect(() => {
    if (!abierto) return;

    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (usuario) => {
      if (usuario) {
        const userRef = doc(db, "Usuarios", usuario.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          setEstado("sin-acceso");
          return;
        }

        const data = snap.data();
        if (data?.premium) {
          const negocioConfig = await obtenerEmpleados(usuario.uid);
          if (negocioConfig) {
            setUser(usuario);
            setConfig({
              ...negocioConfig,
              empleados: negocioConfig.empleados || 1,
              empleadosData:
                negocioConfig.empleadosData?.length
                  ? negocioConfig.empleadosData
                  : [crearEmpleadoVacio()], // ✅ safe-check
            });
            setEstado("listo");
          }
        } else {
          setEstado("sin-acceso");
        }
      }
    });

    return () => unsub();
  }, [abierto]);

  // 📌 Manejar cambios en campos de empleado
  const handleChangeEmpleado = (index: number, field: keyof Empleado, value: any) => {
    setConfig((prev: any) => actualizarEmpleado(prev, index, field, value));
  };

  // 📌 Manejar foto de empleado
  const handleFotoPerfil = async (index: number, file: File | null) => {
    if (!file) return;
    const url = await subirImagenImgBB(file);
    if (!url) return;
    handleChangeEmpleado(index, "fotoPerfil", url);
  };

  const [empleadoServicios, setEmpleadoServicios] = useState<number | null>(null);


// 📌 Guardar cambios
const handleSubmit = async () => {
  if (!user) return;

  setEstado("guardando"); // ⏳ Arrancamos guardando
  try {
    await guardarEmpleados(user.uid, config); // ✅ Guardamos en Firebase
    setEstado("exito"); // 🎉 Mostramos "Guardado con éxito"

    // Después de 2s volvemos a "listo" para permitir otro guardado
    setTimeout(() => {
      setEstado("listo");
    }, 2000);
  } catch (error) {
    console.error("Error guardando empleados:", error);
    setEstado("listo"); // 🔄 volvemos a listo si falla
  }
};


  if (!abierto) return null;

  return (
    <>
      <ModalBase
  abierto={abierto}
  onClose={onCerrar}
  titulo="Configuración de empleados"
  maxWidth="max-w-4xl"
>
  {estado === "cargando" && <p>Cargando...</p>}
  {estado === "sin-acceso" && (
    <p className="text-red-400">🚫 No tienes acceso</p>
  )}
{(estado === "listo" || estado === "exito" || estado === "guardando") && (
  <div className="flex flex-col h-[70vh]">
      {/* 🔹 Contenido scrollable */}
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="flex flex-col gap-6">
          {config.empleadosData.map((empleado: Empleado, index: number) => (
            <div
              key={index}
              className="relative border border-gray-700 rounded-xl p-6 flex flex-col sm:flex-row gap-6 items-center bg-neutral-800"
            >
              {/* Botón eliminar */}
              <button
                type="button"
                onClick={() => {
                  setEmpleadoAEliminar(index);
                  setMostrarAviso(true);
                }}
                className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full 
                           bg-red-600 text-white text-sm font-bold 
                           hover:bg-red-700 active:bg-red-800"
                title="Eliminar empleado"
              >
                X
              </button>

              {/* Foto perfil */}
              <div className="relative">
                <input
                  id={`fotoPerfil-${index}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleFotoPerfil(index, e.target.files?.[0] || null)
                  }
                />
                <label
                  htmlFor={`fotoPerfil-${index}`}
                  className="w-24 h-24 rounded-full bg-neutral-700 flex items-center justify-center cursor-pointer overflow-hidden shadow-sm hover:border-green-500 transition"
                >
                  {empleado.fotoPerfil ? (
                    <img
                      src={empleado.fotoPerfil}
                      alt=""
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-xl text-gray-400">+</span>
                  )}
                </label>
              </div>

              {/* Datos */}
              <div className="flex-1 flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Nombre del empleado"
                  value={empleado.nombre}
                  onChange={(e) =>
                    handleChangeEmpleado(index, "nombre", e.target.value)
                  }
                  className="w-full px-4 py-2 bg-neutral-800 border border-gray-700 rounded-md text-white focus:ring-2 focus:ring-green-600"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEmpleadoSeleccionado(index)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 transition"
                  >
                    Configurar horario
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmpleadoServicios(index)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md shadow hover:bg-purple-700 transition"
                  >
                    Configurar servicios
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* 🔹 Botones fijos abajo */}
<div className="flex flex-col sm:flex-row justify-between sm:justify-end mt-4 pt-4 border-t border-gray-700 bg-neutral-900 gap-3">
  <button
    onClick={() =>
      setConfig((prev: any) => ({
        ...prev,
        empleadosData: [crearEmpleadoVacio(), ...prev.empleadosData],
      }))
    }
    disabled={hayEmpleadoSinEditar} // 👈 deshabilitado si hay uno en edición
    className={`px-6 py-3 rounded-xl shadow transition ${
      hayEmpleadoSinEditar
        ? "bg-gray-500 cursor-not-allowed opacity-60"
        : "bg-blue-600 hover:bg-blue-700 text-white"
    }`}
  >
    ➕ Añadir empleado
  </button>

  {/* Botón Guardar con labels dinámicos */}

<button
  onClick={handleSubmit}
  disabled={esGuardando}
  className={`px-8 py-3 rounded-xl shadow transition ${
    esGuardando
      ? "bg-gray-500 cursor-not-allowed"
      : "bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 text-white"
  }`}
>
  {{
    cargando: "Guardar cambios",
    listo: "Guardar cambios",
    guardando: "Guardando...",
    exito: "✅ Guardado con éxito",
    "sin-acceso": "Guardar cambios",
  }[estado]}
</button>

</div>

</div>
  )}
</ModalBase>


      <ModalHorariosEmpleados
  abierto={empleadoSeleccionado !== null}
  onClose={() => setEmpleadoSeleccionado(null)}
  horario={
    config.empleadosData[empleadoSeleccionado!]?.calendario || {
      inicio: "08:00",
      fin: "17:00",
      diasLibres: [],
    }
  }
  onGuardar={(nuevoHorario) => {
    const nuevo = [...config.empleadosData];
    nuevo[empleadoSeleccionado!].calendario = nuevoHorario;
    setConfig({ ...config, empleadosData: nuevo });
    setEmpleadoSeleccionado(null);
  }}
/>



      {/* Modal aviso eliminación */}
{mostrarAviso && (
  <ModalAviso
    abierto={mostrarAviso}
    onClose={() => {
      setMostrarAviso(false);
      setEmpleadoAEliminar(null);
    }}
    onConfirm={() => {
      if (empleadoAEliminar !== null) {
        setConfig((prev: any) =>
          eliminarEmpleado(prev, empleadoAEliminar)
        );
      }
      setMostrarAviso(false);
      setEmpleadoAEliminar(null);
    }}
    titulo="Eliminar empleado"
  >
    ¿Seguro que deseas eliminar este empleado?
  </ModalAviso>
)}

/* Modal servicios */
{empleadoServicios !== null && (
  <ModalServicios
    abierto={empleadoServicios !== null}
    onCerrar={() => setEmpleadoServicios(null)}
    negocioId={user?.uid} // 👈 ID del negocio dueño de los servicios
    trabajosEmpleado={config.empleadosData[empleadoServicios].trabajos || []}
    onGuardar={(trabajosActualizados) => {
      const nuevo = [...config.empleadosData];
      nuevo[empleadoServicios].trabajos = trabajosActualizados;
      setConfig({ ...config, empleadosData: nuevo });
    }}
  />
)}


    </>
  );
}
