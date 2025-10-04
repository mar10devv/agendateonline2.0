// src/components/agendaVirtual/ui/modalEmpleadosUI.tsx
import { useState, useEffect } from "react";
import ModalServicios from "../modalAsignarServiciosEmpleados";
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
  negocioId: string; // 👈 se usa SIEMPRE
};

export default function ModalEmpleadosUI({ abierto, onCerrar, negocioId }: Props) {
  const [config, setConfig] = useState<any>(null);
  const [estado, setEstado] = useState<
    "cargando" | "listo" | "guardando" | "exito" | "sin-acceso"
  >("cargando");
  const esGuardando = estado === "guardando";

  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<number | null>(null);
  const [empleadoAEliminar, setEmpleadoAEliminar] = useState<number | null>(null);
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [empleadoServicios, setEmpleadoServicios] = useState<number | null>(null);

  const [cargandoFoto, setCargandoFoto] = useState<{ [key: number]: boolean }>({});
  const hayEmpleadoSinEditar = config?.empleadosData?.some(
    (emp: Empleado) => !emp.nombre?.trim()
  );

  // 🔑 Cargar empleados del negocio actual
  useEffect(() => {
    if (!abierto || !negocioId) return;
    const cargar = async () => {
      try {
        const negocioConfig = await obtenerEmpleados(negocioId);
        if (negocioConfig) {
          setConfig({
            ...negocioConfig,
            empleados: negocioConfig.empleados || 1,
            empleadosData:
              negocioConfig.empleadosData?.length
                ? negocioConfig.empleadosData
                : [crearEmpleadoVacio()],
          });
          setEstado("listo");
        } else {
          setEstado("sin-acceso");
        }
      } catch (err) {
        console.error("Error obteniendo empleados:", err);
        setEstado("sin-acceso");
      }
    };
    cargar();
  }, [abierto, negocioId]);

  // 📌 Cambios en campos
  const handleChangeEmpleado = (index: number, field: keyof Empleado, value: any) => {
    setConfig((prev: any) => actualizarEmpleado(prev, index, field, value));
  };

  // 📌 Subir foto
  const handleFotoPerfil = async (index: number, file: File | null) => {
    if (!file) return;
    const empleado = config.empleadosData[index];
    const yaTieneUrl = empleado.fotoPerfil && empleado.nombreArchivo;

    if (yaTieneUrl && empleado.nombreArchivo === file.name) {
      handleChangeEmpleado(index, "fotoPerfil", empleado.fotoPerfil);
      return;
    }

    setCargandoFoto((prev) => ({ ...prev, [index]: true }));
    try {
      const url = await subirImagenImgBB(file);
      if (url) {
        handleChangeEmpleado(index, "fotoPerfil", url);
        handleChangeEmpleado(index, "nombreArchivo", file.name);
      }
    } catch (err) {
      console.error("Error subiendo imagen:", err);
    } finally {
      setCargandoFoto((prev) => ({ ...prev, [index]: false }));
    }
  };

  // 📌 Guardar cambios
  const handleSubmit = async () => {
    if (!negocioId) return;
    setEstado("guardando");
    try {
      await guardarEmpleados(negocioId, config); // 👈 siempre con negocioId
      setEstado("exito");
      setTimeout(() => setEstado("listo"), 2000);
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
        {estado === "sin-acceso" && <p className="text-red-400">🚫 No tienes acceso</p>}
        {(estado === "listo" || estado === "exito" || estado === "guardando") && (
          <div className="flex flex-col h-[70vh]">
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="flex flex-col gap-6">
                {config.empleadosData.map((empleado: Empleado, index: number) => {
                  const faltaHorario = !empleado.calendario?.inicio || !empleado.calendario?.fin;
                  const faltaServicios = !Array.isArray(empleado.trabajos) || empleado.trabajos.length === 0;
                  return (
                    <div key={index} className="relative border border-gray-700 rounded-xl p-6 flex flex-col sm:flex-row gap-6 items-center bg-neutral-800">
                      <button
                        type="button"
                        onClick={() => { setEmpleadoAEliminar(index); setMostrarAviso(true); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600 text-white font-bold"
                      >
                        X
                      </button>
                      <div className="relative">
                        <input id={`fotoPerfil-${index}`} type="file" accept="image/*" className="hidden"
                          onChange={(e) => handleFotoPerfil(index, e.target.files?.[0] || null)} />
                        <label htmlFor={`fotoPerfil-${index}`} className="w-24 h-24 rounded-full bg-neutral-700 flex items-center justify-center cursor-pointer overflow-hidden">
                          {cargandoFoto[index] ? <LoaderSpinner /> :
                            empleado.fotoPerfil ? <img src={empleado.fotoPerfil} alt="" className="object-cover w-full h-full" /> :
                              <span className="text-xl text-gray-400">+</span>}
                        </label>
                      </div>
                      <div className="flex-1 flex flex-col gap-3">
                        <input
                          type="text"
                          placeholder="Nombre del empleado"
                          value={empleado.nombre}
                          onChange={(e) => handleChangeEmpleado(index, "nombre", e.target.value)}
                          className="w-full px-4 py-2 bg-neutral-800 border border-gray-700 rounded-md text-white"
                        />
                        {empleado.rol === "admin" && (
                          <span className="inline-block px-2 py-1 text-xs font-semibold text-white bg-green-600 rounded-full w-fit">👑 Admin</span>
                        )}
                        <div className="flex gap-3">
                          <button onClick={() => setEmpleadoSeleccionado(index)}
                            className={faltaHorario ? "bg-yellow-500 text-black px-4 py-2 rounded-md animate-pulse" : "bg-indigo-600 text-white px-4 py-2 rounded-md"}>
                            Configurar horario
                          </button>
                          <button onClick={() => setEmpleadoServicios(index)}
                            className={faltaServicios ? "bg-yellow-500 text-black px-4 py-2 rounded-md animate-pulse" : "bg-purple-600 text-white px-4 py-2 rounded-md"}>
                            Configurar servicios
                          </button>
                          <button
                            onClick={() => {
                              const correo = prompt("Ingrese el correo Gmail del empleado para hacerlo admin:");
                              if (!correo) return;
                              setConfig((prev: any) => {
                                const nuevos = [...prev.empleadosData];
                                if (nuevos[index].admin) {
                                  nuevos[index].admin = false;
                                  nuevos[index].adminEmail = "";
                                  nuevos[index].rol = "empleado";
                                } else {
                                  nuevos[index].admin = true;
                                  nuevos[index].adminEmail = correo.trim().toLowerCase();
                                  nuevos[index].rol = "admin";
                                }
                                return { ...prev, empleadosData: nuevos };
                              });
                            }}
                            className={empleado.admin ? "bg-red-600 text-white px-4 py-2 rounded-md" : "bg-green-600 text-white px-4 py-2 rounded-md"}>
                            {empleado.admin ? "Quitar admin" : "Agregar admin"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4 border-t border-gray-700 pt-4">
              <button
                onClick={() => setConfig((prev: any) => ({
                  ...prev,
                  empleadosData: [crearEmpleadoVacio(), ...prev.empleadosData],
                }))}
                disabled={hayEmpleadoSinEditar}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl"
              >
                ➕ Añadir empleado
              </button>
              <button onClick={handleSubmit} disabled={esGuardando}
                className="bg-green-600 text-white px-8 py-3 rounded-xl">
                {estado === "guardando" ? "Guardando..." : estado === "exito" ? "✅ Guardado con éxito" : "Guardar cambios"}
              </button>
            </div>
          </div>
        )}
      </ModalBase>

      {empleadoSeleccionado !== null && (
        <ModalHorariosEmpleados
          abierto
          onClose={() => setEmpleadoSeleccionado(null)}
          horario={config.empleadosData[empleadoSeleccionado]?.calendario || { inicio: "", fin: "", diasLibres: [] }}
          onGuardar={(nuevoHorario) => {
            const nuevo = [...config.empleadosData];
            nuevo[empleadoSeleccionado].calendario = nuevoHorario;
            setConfig({ ...config, empleadosData: nuevo });
            setEmpleadoSeleccionado(null);
          }}
        />
      )}

      {mostrarAviso && (
        <ModalAviso
          abierto
          onClose={() => { setMostrarAviso(false); setEmpleadoAEliminar(null); }}
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

      {empleadoServicios !== null && (
        <ModalServicios
          abierto
          onCerrar={() => setEmpleadoServicios(null)}
          negocioId={negocioId} // 👈 SIEMPRE usa el negocio actual
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
