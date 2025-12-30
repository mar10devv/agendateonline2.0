// src/components/agendaVirtual/ui/modalServicios.tsx
import { useState, useEffect } from "react";
import { doc, collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import ModalBase from "../../ui/modalGenerico";
import AddIcon from "../../../assets/add.svg?url";

type Servicio = {
  id?: string;
  nombre: string;
  precio: number;
  duracion: number; // minutos totales
};

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  negocioId: string; // ID del negocio
  trabajosEmpleado: string[]; // IDs de servicios asignados al empleado
  onGuardar: (trabajos: string[]) => void; // devolver servicios asignados
};

// ⏱️ mismas duraciones y formato que el modal grande
const DURACIONES = [
  10, 20, 30, 40, 50,
  60, 70, 80, 90,
  120, 150, 180, 210, 240,
];

const formatearDuracionLargo = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
};

export default function ModalServicios({
  abierto,
  onCerrar,
  negocioId,
  trabajosEmpleado,
  onGuardar,
}: Props) {
  const [serviciosCatalogo, setServiciosCatalogo] = useState<Servicio[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [modo, setModo] = useState<"lista" | "nuevo">("lista");

  const [nuevo, setNuevo] = useState<Servicio>({
    nombre: "",
    precio: 0,
    duracion: 30,
  });

  const [guardando, setGuardando] = useState<"idle" | "saving" | "ok">("idle");

  // 🔹 Cargar catálogo
  useEffect(() => {
    if (!abierto) return;

    const fetchServicios = async () => {
      try {
        const negocioRef = doc(db, "Negocios", negocioId);
        const preciosRef = collection(negocioRef, "Precios");
        const snap = await getDocs(preciosRef);

        const data = snap.docs.map(
          (d) =>
            ({
              id: d.id,
              nombre: d.data().servicio || "",
              precio: d.data().precio || 0,
              duracion: d.data().duracion || 30,
            } as Servicio)
        );

        setServiciosCatalogo(data);
        setSeleccionados(trabajosEmpleado || []);
      } catch (err) {
        console.error("❌ Error cargando servicios:", err);
      }
    };

    fetchServicios();
  }, [abierto, negocioId, trabajosEmpleado]);

  // 📌 Asignar / quitar servicio existente
  const toggleServicio = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // 📌 Crear nuevo servicio y asignar
  const handleCrearNuevo = async () => {
    if (!nuevo.nombre.trim()) return;

    try {
      const negocioRef = doc(db, "Negocios", negocioId);
      const preciosRef = collection(negocioRef, "Precios");
      const docRef = await addDoc(preciosRef, {
        servicio: nuevo.nombre.trim(),
        precio: nuevo.precio,
        duracion: nuevo.duracion,
      });

      // lo agregamos al catálogo y lo marcamos como seleccionado
      setServiciosCatalogo((prev) => [...prev, { ...nuevo, id: docRef.id }]);
      setSeleccionados((prev) => [...prev, docRef.id]);

      // limpiamos form y volvemos a la lista
      setNuevo({ nombre: "", precio: 0, duracion: 30 });
      setModo("lista");
    } catch (err) {
      console.error("❌ Error creando servicio:", err);
    }
  };

  // 📌 Guardar asignaciones
  const handleGuardar = () => {
    try {
      setGuardando("saving");
      onGuardar(seleccionados);
      setGuardando("ok");
      setTimeout(() => {
        setGuardando("idle");
        onCerrar();
      }, 400);
    } catch (e) {
      console.error(e);
      setGuardando("idle");
    }
  };

  // 🔹 Formatea minutos → "Xh Ym" para la lista
  const formatDuracion = (minutos: number) => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}m` : ""}`.trim() || "0m";
  };

  if (!abierto) return null;

  return (
    <ModalBase
      abierto={abierto}
      onClose={onCerrar}
      titulo="Servicios del negocio"
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col h-[580px]">
        {/* Texto introductorio */}
        <p className="text-sm text-gray-300 mb-3">
          Marcá los servicios que este empleado puede realizar. También podés
          crear un servicio nuevo directamente desde esta ventana.
        </p>

        {/* Contenido principal scrollable */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {modo === "lista" && (
            <>
              {/* Cabecera columnas (solo desktop) */}
              <div className="hidden md:grid grid-cols-[40px,1.5fr,0.8fr,0.8fr] gap-2 px-3 text-[11px] font-medium text-gray-400">
                <span></span>
                <span>Servicio</span>
                <span className="text-right">Precio</span>
                <span className="text-right">Duración</span>
              </div>

              {serviciosCatalogo.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-gray-600/70 bg-black/40 px-4 py-5 text-sm text-gray-300 text-center">
                  Todavía no hay servicios cargados en este negocio.
                  <br />
                  <span className="text-gray-400 text-xs">
                    Creá el primero con el botón “Añadir servicio”.
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {serviciosCatalogo.map((serv) => (
                    <label
                      key={serv.id}
                      className="
                        group
                        grid grid-cols-[40px,1.5fr,0.8fr,0.8fr]
                        items-center gap-3
                        rounded-xl
                        bg-[var(--color-primario-oscuro)]
                        border border-gray-700/80
                        px-3 py-3
                        hover:border-white/40 hover:bg-white/5
                        transition
                        cursor-pointer
                      "
                    >
                      {/* Checkbox */}
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={seleccionados.includes(serv.id!)}
                          onChange={() => toggleServicio(serv.id!)}
                          className="
                            h-4 w-4 rounded
                            border-gray-500 bg-transparent
                            accent-[var(--color-primario)]
                            cursor-pointer
                          "
                        />
                      </div>

                      {/* Nombre servicio */}
                      <div className="flex flex-col">
                        <span className="text-sm text-white font-medium">
                          {serv.nombre}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          Servicio del negocio
                        </span>
                      </div>

                      {/* Precio */}
                      <div className="text-sm text-right text-gray-100">
                        ${serv.precio}
                      </div>

                      {/* Duración */}
                      <div className="flex justify-end">
                        <span
                          className="
                            inline-flex items-center px-2 py-1
                            rounded-full border border-white/15
                            bg-black/40 text-[11px] text-gray-100
                          "
                        >
                          {formatDuracion(serv.duracion)}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}

          {modo === "nuevo" && (
            <div
              className="
                mt-2
                rounded-2xl
                bg-[var(--color-primario-oscuro)]/80
                border border-white/10
                shadow-[0_4px_14px_rgba(0,0,0,0.45)]
                overflow-hidden
              "
            >
              {/* 🔴 Cabecera compacta con X roja en lugar de texto */}
              <div
                className="
                  w-full
                  px-4 py-2.5
                  flex items-center justify-between gap-3
                  text-sm
                  bg-black/20
                "
              >
                <div className="flex flex-col text-left">
                  <span className="font-medium">
                    {nuevo.nombre.trim() !== "" ? nuevo.nombre : "Nuevo servicio"}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {(!nuevo.precio || nuevo.precio === 0
                      ? "Sin precio"
                      : `$ ${nuevo.precio}`) +
                      " · " +
                      formatearDuracionLargo(nuevo.duracion)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setModo("lista");
                    setNuevo({ nombre: "", precio: 0, duracion: 30 });
                  }}
                  className="
                    w-7 h-7
                    rounded-full
                    flex items-center justify-center
                    bg-red-600
                    hover:bg-red-700
                    text-white
                    text-xs
                    font-bold
                    shadow-[0_0_8px_rgba(0,0,0,0.6)]
                    transition
                  "
                  aria-label="Cerrar nuevo servicio"
                >
                  ✕
                </button>
              </div>

              {/* Contenido editable igual de estilo al otro modal */}
              <div className="px-4 pb-3 pt-2 space-y-3 border-t border-white/10 text-sm">
                {/* Nombre */}
                <div className="space-y-1">
                  <label className="text-xs text-neutral-300">
                    Nombre del servicio
                  </label>
                  <input
                    type="text"
                    value={nuevo.nombre}
                    onChange={(e) =>
                      setNuevo((prev) => ({ ...prev, nombre: e.target.value }))
                    }
                    className="
                      w-full
                      bg-transparent
                      border-b border-neutral-500
                      focus:border-[var(--color-primario)]
                      outline-none
                      text-sm
                      py-1
                    "
                    placeholder="Corte, color, depilación..."
                  />
                </div>

                {/* Precio */}
                <div className="space-y-1">
                  <label className="text-xs text-neutral-300">
                    Precio
                  </label>
                  <input
                    type="number"
                    value={nuevo.precio === 0 ? "" : String(nuevo.precio)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNuevo((prev) => ({
                        ...prev,
                        precio: val === "" ? 0 : Number(val),
                      }));
                    }}
                    className="
                      w-full
                      bg-transparent
                      border-b border-neutral-500
                      focus:border-[var(--color-primario)]
                      outline-none
                      text-sm
                      py-1
                    "
                    placeholder="0"
                  />
                </div>

                {/* SLIDER DURACIÓN */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-300">
                      Duración estimada
                    </span>
                    <span className="text-xs font-medium text-neutral-100">
                      {formatearDuracionLargo(nuevo.duracion)}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={DURACIONES.length - 1}
                    step={1}
                    value={Math.max(0, DURACIONES.indexOf(nuevo.duracion))}
                    onChange={(e) => {
                      const index = Number(e.target.value);
                      const nuevaDuracion = DURACIONES[index] ?? DURACIONES[0];
                      setNuevo((prev) => ({ ...prev, duracion: nuevaDuracion }));
                    }}
                    className="w-full accent-[var(--color-primario)]"
                  />
                </div>

                {/* Botones estilo "Eliminar / Listo" */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModo("lista");
                      setNuevo({ nombre: "", precio: 0, duracion: 30 });
                    }}
                    className="
                      px-4 py-1.5
                      rounded-full
                      text-xs
                      bg-red-600
                      hover:bg-red-700
                      text-white
                      font-medium
                      transition
                    "
                  >
                    Eliminar
                  </button>

                  <button
                    type="button"
                    onClick={handleCrearNuevo}
                    className="
                      px-4 py-1.5
                      rounded-full
                      text-xs
                      bg-[var(--color-primario)]
                      hover:brightness-110
                      text-white
                      font-medium
                      transition
                    "
                  >
                    Listo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer: botón añadir + cancelar/guardar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-4 border-t border-gray-700">
          {/* ➕ Añadir servicio - abre la vista 'nuevo' con la card de arriba */}
          <button
            onClick={() => setModo("nuevo")}
            className="
              w-full sm:w-auto
              px-4 py-2
              rounded-full
              flex items-center justify-center gap-2
              text-sm font-medium
              border border-white/15
              bg-[var(--color-primario-oscuro)]
              hover:bg-[var(--color-primario)]
              transition
            "
          >
            <img src={AddIcon} alt="Añadir" className="w-4 h-4 invert" />
            Añadir servicio
          </button>

          {/* Cancelar / Guardar cambios */}
          <div className="flex w-full sm:w-auto justify-end gap-2">
            <button
              onClick={onCerrar}
              disabled={guardando === "saving"}
              className="px-5 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={guardando === "saving"}
              className={`
                px-6 py-2 rounded-lg text-sm font-medium
                ${
                  guardando === "saving"
                    ? "bg-green-700 text-white opacity-70"
                    : "bg-green-600 text-white hover:bg-green-500"
                }
              `}
            >
              {guardando === "saving"
                ? "Guardando..."
                : guardando === "ok"
                ? "✅ Guardado"
                : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </ModalBase>
  );
}
