// src/components/agendaVirtual/modalAgregarServicios.tsx
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
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import ModalBase from "../ui/modalGenerico";

type Servicio = {
  id?: string;
  servicio: string;
  precio: number | string;
  duracion: number; // minutos totales
  createdAt?: any;
};

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  negocioId: string; // ID del negocio
};

export default function ModalAgregarServicios({
  abierto,
  onCerrar,
  negocioId,
}: Props) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!abierto || !negocioId) return;

    const negocioRef = doc(db, "Negocios", negocioId);
    const preciosRef = collection(negocioRef, "Precios");
    const q = query(preciosRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snap) => {
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
    });

    return () => unsubscribe();
  }, [abierto, negocioId]);

  const handleChange = (index: number, field: keyof Servicio, value: any) => {
    setServicios((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, [field]: field === "servicio" ? value : value } : s
      )
    );
  };

  const handleDuracionChange = (
    index: number,
    tipo: "horas" | "minutos",
    value: number
  ) => {
    setServicios((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const horas = Math.floor(s.duracion / 60);
        const minutos = s.duracion % 60;
        const newHoras = tipo === "horas" ? value : horas;
        const newMin = tipo === "minutos" ? value : minutos;
        return { ...s, duracion: newHoras * 60 + newMin };
      })
    );
  };

  const handleAgregar = () => {
    setServicios([{ servicio: "", precio: "", duracion: 30 }, ...servicios]);
  };

  const handleEliminar = async (index: number) => {
    const servicio = servicios[index];
    try {
      if (servicio.id) {
        const negocioRef = doc(db, "Negocios", negocioId);
        const preciosRef = collection(negocioRef, "Precios");
        await deleteDoc(doc(preciosRef, servicio.id));
      }
      setServicios(servicios.filter((_, i) => i !== index));
    } catch (err) {
      console.error("❌ Error eliminando servicio:", err);
    }
  };

  const handleGuardar = async () => {
    try {
      const negocioRef = doc(db, "Negocios", negocioId);
      const preciosRef = collection(negocioRef, "Precios");

      for (const s of servicios) {
        if (s.servicio.trim() !== "") {
          const precioFinal = s.precio === "" ? 0 : Number(s.precio);
          if (s.id) {
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
            await addDoc(preciosRef, {
              servicio: s.servicio,
              precio: precioFinal,
              duracion: s.duracion,
              createdAt: serverTimestamp(),
            });
          }
        }
      }
    } catch (err) {
      console.error("❌ Error guardando servicios:", err);
    }
  };

  if (!abierto) return null;

  return (
    <ModalBase
      abierto={abierto}
      onClose={onCerrar}
      titulo="Servicios del negocio"
      maxWidth="max-w-3xl"
    >
      <div
        className="flex flex-col max-h-[90vh] rounded-2xl p-4 transition-colors duration-300 overflow-hidden"
        style={{ backgroundColor: "var(--color-fondo)", color: "#fff" }}
      >
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {cargando ? (
            <p className="text-gray-300">Cargando servicios...</p>
          ) : servicios.length === 0 ? (
            <p className="text-gray-400 text-sm">
              No hay servicios cargados aún.
            </p>
          ) : (
            <>
              {/* Cabecera visible solo en pantallas grandes */}
              <div className="hidden sm:grid grid-cols-[2fr_1fr_0.5fr_0.5fr_auto] gap-2 px-2 text-gray-200 text-sm font-medium">
                <span>Nombre</span>
                <span>Precio</span>
                <span>H</span>
                <span>Min</span>
                <span></span>
              </div>

              {servicios.map((serv, i) => (
                <div
                  key={serv.id || i}
                  className="grid sm:grid-cols-[2fr_1fr_0.5fr_0.5fr_auto] grid-cols-1 gap-3 items-center rounded-lg p-3 transition-colors duration-300"
                  style={{ backgroundColor: "var(--color-primario)" }}
                >
                  {/* Nombre */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-300 mb-1 sm:hidden">
                      Nombre
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={serv.servicio}
                      onChange={(e) =>
                        handleChange(i, "servicio", e.target.value)
                      }
                      className="px-2 py-1 bg-black/30 border border-white/20 rounded text-white outline-none"
                    />
                  </div>

                  {/* Precio */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-300 mb-1 sm:hidden">
                      Precio
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={serv.precio === 0 ? "" : serv.precio}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleChange(i, "precio", val === "" ? "" : Number(val));
                      }}
                      className="px-2 py-1 bg-black/30 border border-white/20 rounded text-white text-center outline-none"
                    />
                  </div>

                  {/* Horas */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-300 mb-1 sm:hidden">
                      Horas
                    </label>
                    <select
                      value={Math.floor(serv.duracion / 60)}
                      onChange={(e) => {
                        const horas = Number(e.target.value);
                        const minutos = serv.duracion % 60;
                        handleDuracionChange(i, "horas", horas);
                        handleDuracionChange(i, "minutos", minutos);
                      }}
                      className="px-2 py-1 bg-black/30 border border-white/20 rounded text-white text-center outline-none"
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Minutos */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-300 mb-1 sm:hidden">
                      Minutos
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={serv.duracion % 60 || ""}
                      onChange={(e) => {
                        const minutos =
                          e.target.value === "" ? 0 : Number(e.target.value);
                        const horas = Math.floor(serv.duracion / 60);
                        handleDuracionChange(i, "minutos", minutos);
                        handleDuracionChange(i, "horas", horas);
                      }}
                      className="px-2 py-1 bg-black/30 border border-white/20 rounded text-white text-center outline-none"
                    />
                  </div>

                  {/* Botón eliminar */}
                  <div className="flex justify-end sm:items-center">
                    <button
                      onClick={() => handleEliminar(i)}
                      className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-semibold w-full sm:w-auto"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Botón añadir */}
        <div className="mt-4">
          <button
            onClick={handleAgregar}
            className="w-full sm:w-auto px-4 py-2 rounded-lg shadow font-medium transition"
            style={{
              backgroundColor: "var(--color-primario)",
              color: "#fff",
            }}
          >
            ➕ Añadir servicio
          </button>
        </div>

        {/* Botones finales */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCerrar}
            className="px-5 py-2 rounded-lg bg-black/40 text-gray-200 hover:bg-black/60 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            className="px-6 py-2 rounded-lg text-white font-medium transition"
            style={{
              backgroundColor: "var(--color-primario)",
            }}
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
