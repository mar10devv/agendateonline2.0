// src/components/agendaVirtual/ui/modalEmpleadosUI.tsx
import { useState, useEffect } from "react";
import ModalServicios from "../modales/modalAsignarServiciosEmpleados";
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

import LoaderSpinner from "../../ui/loaderSpinner";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  negocioId: string;
  modo: "dueño" | "admin";
  userUid?: string;

  // 👇 NUEVO: flag para saber si la agenda es EMPRENDIMIENTO
  esEmprendimiento?: boolean;
};

export default function ModalEmpleadosUI({
  abierto,
  onCerrar,
  negocioId,
  modo,
  userUid,
  esEmprendimiento = false, // 👈 valor por defecto
}: Props) {
  const [config, setConfig] = useState<any>(null);
  const [estado, setEstado] = useState<
    "cargando" | "listo" | "guardando" | "exito" | "sin-acceso"
  >("cargando");

  const esGuardando = estado === "guardando";

  const [empleadoSeleccionado, setEmpleadoSeleccionado] =
    useState<number | null>(null);
  const [empleadoAEliminar, setEmpleadoAEliminar] =
    useState<number | null>(null);
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [empleadoServicios, setEmpleadoServicios] =
    useState<number | null>(null);

  const [cargandoFoto, setCargandoFoto] = useState<{ [key: number]: boolean }>(
    {}
  );

  // 🆕 empleado abierto en el acordeón
  const [empleadoAbierto, setEmpleadoAbierto] = useState<number | null>(null);

  const hayEmpleadoSinEditar = config?.empleadosData?.some(
    (emp: Empleado) => !emp.nombre?.trim()
  );

  // 🔑 Cargar empleados (solo si NO es emprendimiento)
  useEffect(() => {
    if (!abierto || !negocioId || esEmprendimiento) return;

    const cargar = async () => {
      try {
        const negocioConfig = await obtenerEmpleados(negocioId);
        if (!negocioConfig) return setEstado("sin-acceso");

        let empleados = negocioConfig.empleadosData?.length
          ? negocioConfig.empleadosData
          : [crearEmpleadoVacio()];

        // 🔥 Asignar roles si faltan
        empleados = empleados.map((emp: any) => {
          if (!emp.rol) emp.rol = emp.admin ? "admin" : "empleado";
          return emp;
        });

        // Garantizar que haya un dueño
        if (!empleados.some((e: any) => e.rol === "dueño")) {
          empleados[0].rol = "dueño";
        }

        setConfig({
          ...negocioConfig,
          empleados: empleados.length,
          empleadosData: empleados,
        });

        setEstado("listo");
      } catch (err) {
        console.error("Error obteniendo empleados:", err);
        setEstado("sin-acceso");
      }
    };

    cargar();
  }, [abierto, negocioId, esEmprendimiento]);

  // Cambia campos
  const handleChangeEmpleado = (
    index: number,
    field: keyof Empleado,
    value: any
  ) => {
    setConfig((prev: any) => actualizarEmpleado(prev, index, field, value));
  };

  // Maneja fotos
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

  // Guardar cambios
  const handleSubmit = async () => {
    if (!negocioId) return;

    setEstado("guardando");

    try {
      // 🔥 ORDEN REAL ANTES DE GUARDAR
      const ordenados = [...config.empleadosData].sort((a, b) => {
        const peso = (emp: any) =>
          emp.rol === "dueño" ? 0 : emp.rol === "admin" ? 1 : 2;
        return peso(a) - peso(b);
      });

      const configFinal = { ...config, empleadosData: ordenados };

      await guardarEmpleados(negocioId, configFinal);

      // Mostrar éxito
      setEstado("exito");

      // 👇 Refrescar web para arreglar el body bugeado
      setTimeout(() => {
        location.reload();
      }, 700);
    } catch (error) {
      console.error("Error guardando empleados:", error);
      setEstado("listo");
    }
  };

  const soyDueno = modo === "dueño";
  const soyAdmin = modo === "admin";

  if (!abierto) return null;

  // 🟢 MODO EMPRENDIMIENTO: bloquear todo el editor de empleados
  if (esEmprendimiento) {
    return (
      <ModalBase
        abierto={abierto}
        onClose={onCerrar}
        titulo="Empleados"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Esta agenda está en modo{" "}
            <span className="text-yellow-300">emprendimiento</span>
          </h2>

          <p className="text-sm text-gray-300">
            En un <strong>emprendimiento</strong> solo trabaja el creador de la
            agenda, por lo que no podés agregar ni gestionar empleados
            adicionales.
          </p>

          <p className="text-sm text-gray-400">
            Si tu proyecto crece y necesitás sumar más personas a tu equipo,
            podés pasar tu cuenta a modo <strong>negocio</strong> y habilitar la
            gestión de empleados, roles y horarios por persona.
          </p>

          <button
            type="button"
            className="
              w-full mt-2 px-4 py-2 rounded-xl text-sm font-medium
              bg-yellow-400 text-black
              hover:bg-yellow-300 transition
            "
            onClick={() => {
              alert(
                "Próximamente: cambiar de emprendimiento a negocio desde acá 😎"
              );
            }}
          >
            Pasar a modo negocio
          </button>
        </div>
      </ModalBase>
    );
  }

  // 🔵 MODO NEGOCIO: editor normal de empleados (más compacto)
  return (
    <>
      <ModalBase
        abierto={abierto}
        onClose={onCerrar}
        titulo="Configuración de empleados"
        maxWidth="max-w-3xl"
      >
        {/* Estados simples arriba */}
        {estado === "cargando" && (
          <div className="flex items-center justify-center gap-3 py-8 text-sm text-neutral-300">
            <LoaderSpinner size={22} />
            Cargando empleados...
          </div>
        )}

        {estado === "sin-acceso" && (
          <p className="text-red-400 py-6 text-sm text-center">
            🚫 No tienes acceso a la configuración de empleados.
          </p>
        )}

        {(estado === "listo" ||
          estado === "exito" ||
          estado === "guardando") &&
          config && (
            <div
              className="
                flex flex-col gap-4
                max-h-[80vh]
                rounded-3xl
                p-4
                bg-[var(--color-fondo)]
                text-[var(--color-texto)]
                transition-colors
                duration-300
              "
            >
              {/* LISTA DE EMPLEADOS */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {config.empleadosData.map(
                  (empleado: Empleado, index: number) => {
                    const esDueno = empleado.rol === "dueño";

                    const faltaHorario =
                      !empleado.calendario?.inicio ||
                      !empleado.calendario?.fin;
                    const faltaServicios =
                      !Array.isArray(empleado.trabajos) ||
                      empleado.trabajos.length === 0;

                    const abierto = empleadoAbierto === index;

                    return (
                      <div
                        key={index}
                        className="
                          rounded-2xl
                          bg-[var(--color-primario-oscuro)]/80
                          border border-white/10
                          shadow-[0_4px_14px_rgba(0,0,0,0.45)]
                          overflow-hidden
                          relative
                        "
                      >
                        {/* Cabecera compacta tipo acordeón */}
                        <button
                          type="button"
                          onClick={() =>
                            setEmpleadoAbierto((prev) =>
                              prev === index ? null : index
                            )
                          }
                          className="
                            w-full
                            px-4 py-2.5
                            flex items-center justify-between gap-3
                            text-sm
                            hover:bg-black/20
                            transition
                          "
                        >
                          <div className="flex flex-col text-left">
                            <span className="font-medium">
                              {empleado.nombre || "Nuevo empleado"}
                            </span>

                            <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-neutral-400">
                              <span>
                                {esDueno
                                  ? "Dueño"
                                  : empleado.rol === "admin"
                                  ? "Admin"
                                  : "Empleado"}
                              </span>

                              <span
                                className={
                                  faltaHorario
                                    ? "text-amber-300"
                                    : "text-emerald-300"
                                }
                              >
                                {faltaHorario
                                  ? "Horario sin configurar"
                                  : "Horario listo"}
                              </span>

                              <span
                                className={
                                  faltaServicios
                                    ? "text-amber-300"
                                    : "text-emerald-300"
                                }
                              >
                                {faltaServicios
                                  ? "Servicios sin asignar"
                                  : "Servicios asignados"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {(soyDueno || soyAdmin) && !esDueno && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEmpleadoAEliminar(index);
                                  setMostrarAviso(true);
                                }}
                                className="
                                  w-7 h-7
                                  rounded-full
                                  bg-red-600
                                  hover:bg-red-700
                                  text-white
                                  text-xs
                                  font-bold
                                  flex items-center justify-center
                                "
                              >
                                ✕
                              </button>
                            )}

                            <span className="text-xs opacity-70">
                              {abierto ? "▲" : "▼"}
                            </span>
                          </div>
                        </button>

                        {/* Contenido editable */}
                        {abierto && (
                          <div className="border-t border-white/10 px-4 py-3 text-sm">
                            <div className="flex flex-col sm:flex-row gap-4">
                              {/* Foto */}
                              <div className="flex flex-col items-center gap-2 sm:w-1/4">
                                <input
                                  id={`fotoPerfil-${index}`}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={false}
                                  onChange={(e) =>
                                    handleFotoPerfil(
                                      index,
                                      e.target.files?.[0] || null
                                    )
                                  }
                                />

                                <label
                                  htmlFor={`fotoPerfil-${index}`}
                                  className="
                                    w-20 h-20
                                    rounded-full
                                    flex items-center justify-center
                                    overflow-hidden
                                    cursor-pointer
                                    bg-neutral-800
                                    border border-white/10
                                  "
                                >
                                  {cargandoFoto[index] ? (
                                    <LoaderSpinner size={20} />
                                  ) : empleado.fotoPerfil ? (
                                    <img
                                      src={empleado.fotoPerfil}
                                      alt=""
                                      className="object-cover w-full h-full"
                                    />
                                  ) : (
                                    <span className="text-lg text-gray-400">
                                      +
                                    </span>
                                  )}
                                </label>

                                <span className="text-[11px] text-neutral-400 text-center">
                                  Cambiar foto
                                </span>
                              </div>

                              {/* Datos y acciones */}
                              <div className="flex-1 flex flex-col gap-3">
                                {/* Nombre */}
                                <div className="space-y-1">
                                  <label className="text-xs text-neutral-300">
                                    Nombre del empleado
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Nombre del empleado"
                                    value={empleado.nombre}
                                    onChange={(e) =>
                                      handleChangeEmpleado(
                                        index,
                                        "nombre",
                                        e.target.value
                                      )
                                    }
                                    disabled={false}
                                    className="
                                      w-full
                                      px-3 py-1.5
                                      bg-transparent
                                      border-b border-neutral-600
                                      focus:border-[var(--color-primario)]
                                      outline-none
                                      text-sm
                                    "
                                  />
                                </div>

                                {/* Badges rol */}
<div className="flex flex-wrap gap-2">
  {esDueno && (
    <span className="px-2 py-1 text-[11px] font-semibold text-black bg-yellow-400 rounded-full">
      Creador
    </span>
  )}

  {empleado.rol === "admin" && (
    <span className="px-2 py-1 text-[11px] font-semibold text-white bg-green-600 rounded-full">
      👑 Admin
    </span>
  )}

  {/* 🔵 Solo mostrar si ES el dueño y además trabaja en el negocio */}
  {esDueno && empleado.esEmpleado && (
    <span className="px-2 py-1 text-[11px] font-semibold text-white bg-sky-600 rounded-full">
      Trabaja en este negocio
    </span>
  )}
</div>

                                {/* Botones principales */}
                                {(soyDueno || soyAdmin) && (
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {/* Config horario */}
                                    <button
                                      onClick={() =>
                                        setEmpleadoSeleccionado(index)
                                      }
                                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition
                                        ${
                                          faltaHorario
                                            ? "bg-yellow-500 text-black animate-pulse"
                                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                                        }`}
                                    >
                                      Configurar horario
                                    </button>

                                    {/* Config servicios */}
                                    <button
                                      onClick={() =>
                                        setEmpleadoServicios(index)
                                      }
                                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition
                                        ${
                                          faltaServicios
                                            ? "bg-yellow-500 text-black animate-pulse"
                                            : "bg-purple-600 text-white hover:bg-purple-700"
                                        }`}
                                    >
                                      Configurar servicios
                                    </button>

                                    {/* Admin ON/OFF (corregido para que correo no sea null) */}
                                    {!esDueno && (
                                      <button
                                        onClick={() => {
                                          // Si YA es admin, lo quitamos sin pedir correo
                                          if (empleado.rol === "admin") {
                                            setConfig((prev: any) => {
                                              const nuevos = [
                                                ...prev.empleadosData,
                                              ];
                                              nuevos[index].rol = "empleado";
                                              nuevos[index].adminEmail = "";
                                              return {
                                                ...prev,
                                                empleadosData: nuevos,
                                              };
                                            });
                                            return;
                                          }

                                          // Si NO es admin, pedimos correo
                                          const correoRaw = prompt(
                                            "Ingrese el correo Gmail del empleado para hacerlo admin:"
                                          );

                                          if (!correoRaw) {
                                            // canceló o vacío
                                            return;
                                          }

                                          const correo = correoRaw
                                            .trim()
                                            .toLowerCase();

                                          setConfig((prev: any) => {
                                            const nuevos = [
                                              ...prev.empleadosData,
                                            ];
                                            nuevos[index].rol = "admin";
                                            nuevos[index].adminEmail = correo;
                                            return {
                                              ...prev,
                                              empleadosData: nuevos,
                                            };
                                          });
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition
                                          ${
                                            empleado.rol === "admin"
                                              ? "bg-red-600 hover:bg-red-700 text-white"
                                              : "bg-green-600 hover:bg-green-700 text-white"
                                          }`}
                                      >
                                        {empleado.rol === "admin"
                                          ? "Quitar admin"
                                          : "Hacer admin"}
                                      </button>
                                    )}

                                    {/* Soy empleado (solo dueño) */}
                                    {esDueno && (
                                      <button
                                        onClick={() => {
                                          setConfig((prev: any) => {
                                            const nuevos = [
                                              ...prev.empleadosData,
                                            ];
                                            nuevos[index].esEmpleado =
                                              !nuevos[index].esEmpleado;
                                            return {
                                              ...prev,
                                              empleadosData: nuevos,
                                            };
                                          });
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition
                                          ${
                                            empleado.esEmpleado
                                              ? "bg-gray-600 hover:bg-gray-700 text-white"
                                              : "bg-orange-600 hover:bg-orange-700 text-white"
                                          }`}
                                      >
                                        {empleado.esEmpleado
                                          ? "No trabajar en la agenda"
                                          : "Soy empleado"}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>

              {/* FOOTER COMPACTO */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-neutral-700/70">
                {(soyDueno || soyAdmin) && (
                  <button
                    onClick={() =>
                      setConfig((prev: any) => ({
                        ...prev,
                        empleadosData: [
                          crearEmpleadoVacio(), // 👈 aparece primero
                          ...prev.empleadosData,
                        ],
                      }))
                    }
                    disabled={hayEmpleadoSinEditar}
                    className="
                      w-full sm:w-auto
                      px-4 py-2
                      rounded-full
                      text-sm font-medium
                      border border-white/15
                      bg-[var(--color-primario-oscuro)]
                      hover:bg-[var(--color-primario)]
                      disabled:opacity-50
                      disabled:cursor-not-allowed
                      transition
                    "
                  >
                    ➕ Añadir empleado
                  </button>
                )}

                <div className="flex w-full sm:w-auto justify-end gap-2">
                  <button
                    onClick={onCerrar}
                    className="
                      px-4 py-2
                      rounded-full
                      text-sm
                      bg-black/40
                      text-neutral-200
                      hover:bg-black/60
                      transition
                    "
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={handleSubmit}
                    disabled={esGuardando}
                    className={`
                      px-5 py-2
                      rounded-full
                      text-sm font-medium
                      flex items-center justify-center gap-2
                      ${
                        estado === "guardando"
                          ? "bg-neutral-600 text-neutral-200 cursor-not-allowed"
                          : estado === "exito"
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : "bg-green-600 hover:bg-green-700"
                      }
                    `}
                  >
                    {estado === "guardando" && <LoaderSpinner size={16} />}

                    {estado === "guardando"
                      ? "Guardando..."
                      : estado === "exito"
                      ? "✅ Guardado con éxito"
                      : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </div>
          )}
      </ModalBase>

      {/* Modales secundarios */}
      {empleadoSeleccionado !== null && (
        <ModalHorariosEmpleados
          abierto
          onClose={() => setEmpleadoSeleccionado(null)}
          horario={
            config.empleadosData[empleadoSeleccionado]?.calendario || {
              inicio: "",
              fin: "",
              diasLibres: [],
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

      {mostrarAviso && (
        <ModalAviso
          abierto
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

      {empleadoServicios !== null && (
        <ModalServicios
          abierto
          onCerrar={() => setEmpleadoServicios(null)}
          negocioId={negocioId}
          trabajosEmpleado={
            config.empleadosData[empleadoServicios].trabajos || []
          }
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
