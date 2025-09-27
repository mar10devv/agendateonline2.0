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
import type { Empleado } from "../backend/modalEmpleadosBackend";

// ⚠️ Ícono de alerta
import AlertIcon from "../../../assets/alert.svg?url";

// ✅ Loader
import LoaderSpinner from "../../ui/loaderSpinner";

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
  const [empleadoAEliminar, setEmpleadoAEliminar] = useState<number | null>(null);
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [empleadoServicios, setEmpleadoServicios] = useState<number | null>(null);

  // 👇 Estado para loaders de fotos
  const [cargandoFoto, setCargandoFoto] = useState<{ [key: number]: boolean }>({});

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
                  : [crearEmpleadoVacio()],
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

// 📌 Manejar foto de empleado con control de duplicados + loader
const handleFotoPerfil = async (index: number, file: File | null) => {
  if (!file) return;

  // ⚡ Revisar si ya existe una URL y un nombre previo guardado
  const empleado = config.empleadosData[index];
  const yaTieneUrl = empleado.fotoPerfil && empleado.nombreArchivo;

  if (yaTieneUrl && empleado.nombreArchivo === file.name) {
    // ✅ No subimos de nuevo, solo usamos la URL existente
    console.log("Foto ya subida, usando URL existente");
    handleChangeEmpleado(index, "fotoPerfil", empleado.fotoPerfil);
    return;
  }

  // 🚀 Si es nueva, activamos loader y subimos
  setCargandoFoto((prev) => ({ ...prev, [index]: true }));

  try {
    const url = await subirImagenImgBB(file);
    if (url) {
      handleChangeEmpleado(index, "fotoPerfil", url);
      handleChangeEmpleado(index, "nombreArchivo", file.name); // 👈 guardamos referencia del archivo
    }
  } catch (err) {
    console.error("Error subiendo imagen:", err);
  } finally {
    setCargandoFoto((prev) => ({ ...prev, [index]: false }));
  }
};


  // 📌 Guardar cambios
  const handleSubmit = async () => {
    if (!user) return;

    setEstado("guardando");
    try {
      await guardarEmpleados(user.uid, config);
      setEstado("exito");

      setTimeout(() => {
        setEstado("listo");
      }, 2000);
    } catch (error) {
      console.error("Error guardando empleados:", error);
      setEstado("listo");
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
                {config.empleadosData.map((empleado: Empleado, index: number) => {
                  const faltaHorario =
                    !empleado.calendario ||
                    !empleado.calendario.inicio ||
                    !empleado.calendario.fin;

                  const faltaServicios =
                    !Array.isArray(empleado.trabajos) ||
                    empleado.trabajos.length === 0 ||
                    empleado.trabajos.every((t) => !t.trim());

                  return (
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
                          className="w-24 h-24 rounded-full bg-neutral-700 flex items-center justify-center cursor-pointer overflow-hidden shadow-sm relative"
                        >
                          {cargandoFoto[index] ? (
                            // 🔥 Loader dentro del círculo
                            <div className="flex items-center justify-center w-full h-full bg-neutral-800">
                              <LoaderSpinner />
                            </div>
                          ) : empleado.fotoPerfil ? (
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
                          {/* Botón horario */}
                          <div className="relative flex items-center">
                            <button
                              type="button"
                              onClick={() => setEmpleadoSeleccionado(index)}
                              className={`px-4 py-2 rounded-md shadow transition ${
                                faltaHorario
                                  ? "bg-yellow-500 text-black animate-pulse"
                                  : "bg-indigo-600 text-white hover:bg-indigo-700"
                              }`}
                            >
                              Configurar horario
                            </button>
                            {faltaHorario && (
                              <img
                                src={AlertIcon}
                                alt="Falta configurar horario"
                                className="absolute -right-3 -top-3 w-6 h-6 animate-pulse"
                                style={{
                                  filter:
                                    "invert(67%) sepia(90%) saturate(500%) hue-rotate(350deg) brightness(95%)",
                                }}
                              />
                            )}
                          </div>

                          {/* Botón servicios */}
                          <div className="relative flex items-center">
                            <button
                              type="button"
                              onClick={() => setEmpleadoServicios(index)}
                              className={`px-4 py-2 rounded-md shadow transition ${
                                faltaServicios
                                  ? "bg-yellow-500 text-black animate-pulse"
                                  : "bg-purple-600 text-white hover:bg-purple-700"
                              }`}
                            >
                              Configurar servicios
                            </button>
                            {faltaServicios && (
                              <img
                                src={AlertIcon}
                                alt="Falta configurar servicios"
                                className="absolute -right-3 -top-3 w-6 h-6 animate-pulse"
                                style={{
                                  filter:
                                    "invert(67%) sepia(90%) saturate(500%) hue-rotate(350deg) brightness(95%)",
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                disabled={hayEmpleadoSinEditar}
                className={`px-6 py-3 rounded-xl shadow transition ${
                  hayEmpleadoSinEditar
                    ? "bg-gray-500 cursor-not-allowed opacity-60"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                ➕ Añadir empleado
              </button>

              {/* Botón Guardar */}
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

      {/* Modal horarios */}
      {empleadoSeleccionado !== null && (
        <ModalHorariosEmpleados
          abierto={empleadoSeleccionado !== null}
          onClose={() => setEmpleadoSeleccionado(null)}
          horario={
            config.empleadosData[empleadoSeleccionado]?.calendario || {
              inicio: "",
              fin: "",
              diasLibres: [],
              diaYMedio: null,
            }
          }
          onGuardar={(nuevoHorario) => {
            const nuevo = [...config.empleadosData];
            nuevo[empleadoSeleccionado].calendario = nuevoHorario;
            setConfig({ ...config, empleadosData: nuevo });
            setEmpleadoSeleccionado(null);
          }}
        />
      )}

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
              setConfig((prev: any) => eliminarEmpleado(prev, empleadoAEliminar));
            }
            setMostrarAviso(false);
            setEmpleadoAEliminar(null);
          }}
          titulo="Eliminar empleado"
        >
          ¿Seguro que deseas eliminar este empleado?
        </ModalAviso>
      )}

      {/* Modal servicios */}
      {empleadoServicios !== null && (
        <ModalServicios
          abierto={empleadoServicios !== null}
          onCerrar={() => setEmpleadoServicios(null)}
          negocioId={user?.uid}
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
