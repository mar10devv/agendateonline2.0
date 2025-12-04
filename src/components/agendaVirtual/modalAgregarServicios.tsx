import { useState, useEffect } from "react";
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import ModalBase from "../ui/modalGenerico";
import LoaderSpinner from "../ui/loaderSpinner";
import AddIcon from "../../assets/add.svg?url";

type Servicio = {
  id?: string;
  servicio: string;
  precio: number | string;
  duracion: number;
  createdAt?: any;
};

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  negocioId: string;
  esEmprendimiento: boolean;
};

export default function ModalAgregarServicios({
  abierto,
  onCerrar,
  negocioId,
  esEmprendimiento,
}: Props) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [estadoBoton, setEstadoBoton] = useState<
    "normal" | "guardando" | "exito" | "error"
  >("normal");

  const [abiertoIndex, setAbiertoIndex] = useState<number | null>(null);

  // ============================================
  // Duraciones predefinidas (EN MINUTOS)
  // ============================================
  const duraciones = [
    10, 20, 30, 40, 50,
    60, 70, 80, 90,
    120, 150, 180, 210, 240,
  ];

  const formatearDuracion = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h} hr ${m} min`;
  };

  const esServicioVacio = (s: Servicio) => {
    return (
      s.servicio.trim() === "" &&
      (s.precio === "" || s.precio === 0) &&
      s.duracion === 30
    );
  };

  const limpiarServiciosVacios = () => {
    setServicios((prev) => prev.filter((s) => s.id || !esServicioVacio(s)));
  };

  const toggleExpand = (i: number) => {
    setServicios((prevServicios) => {
      let nuevaLista = [...prevServicios];

      if (abiertoIndex !== null && abiertoIndex !== i) {
        const anterior = nuevaLista[abiertoIndex];

        if (!anterior.id && esServicioVacio(anterior)) {
          nuevaLista.splice(abiertoIndex, 1);
          if (i > abiertoIndex) i--;
        }
      }

      setAbiertoIndex((prev) => (prev === i ? null : i));
      return nuevaLista;
    });
  };

  // ============================================
  // Carga en tiempo real
  // ============================================
  useEffect(() => {
    if (!abierto || !negocioId) return;

    const negocioRef = doc(db, "Negocios", negocioId);
    const preciosRef = collection(negocioRef, "Precios");
    const qPrecios = query(preciosRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(qPrecios, (snap) => {
      const data = snap.docs.map(
        (d) =>
          ({
            id: d.id,
            servicio: d.data().servicio || "",
            precio: d.data().precio || 0,
            duracion: d.data().duracion || 30,
            createdAt: d.data().createdAt,
          } as Servicio)
      );

      setServicios(data);
      setCargando(false);
      setAbiertoIndex(null);
    });

    return () => unsubscribe();
  }, [abierto, negocioId]);

  const handleChange = (index: number, field: keyof Servicio, value: any) => {
    setServicios((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const handleAgregar = () => {
    limpiarServiciosVacios();
    setServicios((prev) => [
      { servicio: "", precio: "", duracion: 30 },
      ...prev,
    ]);
    setAbiertoIndex(0);
  };

  const handleEliminar = async (index: number) => {
    const servicio = servicios[index];
    try {
      if (servicio.id) {
        const negocioRef = doc(db, "Negocios", negocioId);
        const preciosRef = collection(negocioRef, "Precios");
        await deleteDoc(doc(preciosRef, servicio.id));
      }

      setServicios((prev) => prev.filter((_, i) => i !== index));

      if (abiertoIndex === index) setAbiertoIndex(null);
    } catch (err) {
      console.error("❌ Error eliminando servicio:", err);
    }
  };

  // ============================================
  // GUARDAR (y refrescar si hay nuevos)
  // ============================================
  const handleGuardar = async () => {
    limpiarServiciosVacios();

    try {
      setEstadoBoton("guardando");

      const negocioRef = doc(db, "Negocios", negocioId);
      const preciosRef = collection(negocioRef, "Precios");

      const nuevosServiciosIds: string[] = [];

      for (const s of servicios) {
        if (s.servicio.trim() !== "") {
          const precioFinal = s.precio === "" ? 0 : Number(s.precio);

          if (s.id) {
            // Actualizar servicio existente
            await setDoc(
              doc(preciosRef, s.id),
              {
                servicio: s.servicio,
                precio: precioFinal,
                duracion: s.duracion,
              },
              { merge: true }
            );
          } else {
            // Crear servicio nuevo
            const nuevoDoc = await addDoc(preciosRef, {
              servicio: s.servicio,
              precio: precioFinal,
              duracion: s.duracion,
              createdAt: serverTimestamp(),
            });

            nuevosServiciosIds.push(nuevoDoc.id);
          }
        }
      }

      // Vincular servicios nuevos al único empleado (emprendimiento)
      if (esEmprendimiento && nuevosServiciosIds.length > 0) {
        const snapNegocio = await getDoc(negocioRef);

        if (snapNegocio.exists()) {
          const data: any = snapNegocio.data();
          const empleadosData: any[] = Array.isArray(data.empleadosData)
            ? data.empleadosData
            : [];

          if (empleadosData.length > 0) {
            let idxPrincipal = empleadosData.findIndex(
              (e) => e && e.esEmpleado === true
            );
            if (idxPrincipal === -1) idxPrincipal = 0;

            const empleadoPrincipal = empleadosData[idxPrincipal] || {};
            const trabajosActuales: string[] = Array.isArray(
              empleadoPrincipal.trabajos
            )
              ? empleadoPrincipal.trabajos
              : [];

            const setTrabajos = new Set<string>(trabajosActuales);
            for (const idServ of nuevosServiciosIds) {
              setTrabajos.add(idServ);
            }

            const empleadoActualizado = {
              ...empleadoPrincipal,
              trabajos: Array.from(setTrabajos),
            };

            const nuevosEmpleadosData = empleadosData.map((e, idx) =>
              idx === idxPrincipal ? empleadoActualizado : e
            );

            await updateDoc(negocioRef, {
              empleadosData: nuevosEmpleadosData,
            });
          }
        }
      }

      const hayNuevos = nuevosServiciosIds.length > 0;

      setEstadoBoton("exito");
      setTimeout(() => {
        setEstadoBoton("normal");
        // cerramos el modal
        limpiarServiciosVacios();
        onCerrar();

        // si se agregaron servicios nuevos, refrescamos la web
        if (hayNuevos) {
          window.location.reload();
        }
      }, 600);
    } catch (err) {
      console.error("❌ Error guardando servicios:", err);
      setEstadoBoton("error");
      setTimeout(() => setEstadoBoton("normal"), 3000);
    }
  };

  const cerrarModal = () => {
    limpiarServiciosVacios();
    onCerrar();
  };

  if (!abierto) return null;

  return (
    <ModalBase
      abierto={abierto}
      onClose={cerrarModal}
      titulo="Servicios del negocio"
      maxWidth="max-w-2xl"
    >
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
        {/* Lista */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {cargando ? (
            <div className="flex items-center justify-center py-10 gap-3 text-sm text-neutral-300">
              <LoaderSpinner size={22} />
              Cargando servicios...
            </div>
          ) : servicios.length === 0 ? (
            <p className="text-neutral-400 text-sm py-4">
              No hay servicios cargados aún. Añadí el primero con el botón de abajo.
            </p>
          ) : (
            servicios.map((serv, i) => (
              <div
                key={serv.id || i}
                className="
                  rounded-2xl
                  bg-[var(--color-primario-oscuro)]/80
                  border border-white/10
                  shadow-[0_4px_14px_rgba(0,0,0,0.45)]
                  overflow-hidden
                "
              >
                {/* Cabecera compacta */}
                <button
                  onClick={() => toggleExpand(i)}
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
                      {serv.servicio || "Nuevo servicio"}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {serv.precio === "" || serv.precio === 0
                        ? "Sin precio"
                        : `$ ${serv.precio}`}{" "}
                      · {formatearDuracion(serv.duracion)}
                    </span>
                  </div>

                  <span className="text-xs opacity-70">
                    {abiertoIndex === i ? "▲" : "▼"}
                  </span>
                </button>

                {/* Contenido editable */}
                {abiertoIndex === i && (
                  <div className="px-4 pb-3 pt-2 space-y-3 border-t border-white/10 text-sm">
                    {/* Nombre */}
                    <div className="space-y-1">
                      <label
                        htmlFor={`nombre-${i}`}
                        className="text-xs text-neutral-300"
                      >
                        Nombre del servicio
                      </label>
                      <input
                        id={`nombre-${i}`}
                        type="text"
                        value={serv.servicio}
                        onChange={(e) =>
                          handleChange(i, "servicio", e.target.value)
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
                      <label
                        htmlFor={`precio-${i}`}
                        className="text-xs text-neutral-300"
                      >
                        Precio
                      </label>
                      <input
                        id={`precio-${i}`}
                        type="number"
                        value={serv.precio === 0 ? "" : String(serv.precio)}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleChange(
                            i,
                            "precio",
                            val === "" ? "" : Number(val)
                          );
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
                          {formatearDuracion(serv.duracion)}
                        </span>
                      </div>

                      <input
                        type="range"
                        min={0}
                        max={duraciones.length - 1}
                        step={1}
                        value={Math.max(
                          0,
                          duraciones.indexOf(serv.duracion)
                        )}
                        onChange={(e) => {
                          const index = Number(e.target.value);
                          const nuevaDuracion = duraciones[index];
                          handleChange(i, "duracion", nuevaDuracion);
                        }}
                        className="w-full accent-[var(--color-primario)]"
                      />
                    </div>

                    {/* Eliminar (izquierda) + Listo (derecha) */}
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleEliminar(i)}
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
                        onClick={() =>
                          setAbiertoIndex((prev) =>
                            prev === i ? null : prev
                          )
                        }
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
                )}
              </div>
            ))
          )}
        </div>

        {/* Botones inferiores */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <button
            onClick={handleAgregar}
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

          <div className="flex w-full sm:w-auto justify-end gap-2">
            <button
              onClick={cerrarModal}
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
              onClick={handleGuardar}
              disabled={estadoBoton === "guardando"}
              className={`
                px-5 py-2
                rounded-full
                text-sm font-medium
                flex items-center justify-center gap-2
                ${
                  estadoBoton === "guardando"
                    ? "bg-neutral-600 text-neutral-200 cursor-not-allowed"
                    : estadoBoton === "exito"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : estadoBoton === "error"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[var(--color-primario)] hover:brightness-110"
                }
              `}
            >
              {estadoBoton === "guardando" && <LoaderSpinner size={16} />}

              {estadoBoton === "guardando"
                ? "Guardando..."
                : estadoBoton === "exito"
                ? "✔ Guardado"
                : estadoBoton === "error"
                ? "Error al guardar"
                : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </ModalBase>
  );
}
