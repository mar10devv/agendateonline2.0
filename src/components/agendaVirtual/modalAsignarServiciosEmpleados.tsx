import { useState, useEffect } from "react";
import {
  doc,
  collection,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import ModalBase from "../ui/modalGenerico";

type Servicio = {
  id?: string;
  nombre: string;
  precio: number;
  duracion: number; // minutos totales
};

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  negocioId: string;     // ID del negocio
  trabajosEmpleado: string[]; // IDs de servicios asignados al empleado
  onGuardar: (trabajos: string[]) => void; // devolver servicios asignados
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
        servicio: nuevo.nombre,
        precio: nuevo.precio,
        duracion: nuevo.duracion,
      });
      setSeleccionados((prev) => [...prev, docRef.id]);
      setModo("lista");
    } catch (err) {
      console.error("❌ Error creando servicio:", err);
    }
  };

  // 📌 Guardar asignaciones
  const handleGuardar = () => {
    onGuardar(seleccionados);
    onCerrar();
  };

  // 🔹 Formatea minutos → "Xh Ym"
  const formatDuracion = (minutos: number) => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}m` : ""}`;
  };

  if (!abierto) return null;

  return (
    <ModalBase
      abierto={abierto}
      onClose={onCerrar}
      titulo="Servicios del negocio"
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col h-[600px]">
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {modo === "lista" && (
            <>
              {/* Cabecera */}
              <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 px-2 text-gray-300 text-sm font-medium">
                <span>Servicio</span>
                <span>Precio</span>
                <span>Duración</span>
              </div>

              {serviciosCatalogo.length === 0 ? (
                <p className="text-gray-400 mt-2">No hay servicios en el negocio.</p>
              ) : (
                serviciosCatalogo.map((serv) => (
                  <label
                    key={serv.id}
                    className="grid grid-cols-[2fr_1fr_1fr] gap-2 items-center bg-neutral-800 p-3 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={seleccionados.includes(serv.id!)}
                      onChange={() => toggleServicio(serv.id!)}
                      className="w-5 h-5"
                    />
                    <span className="text-white">{serv.nombre}</span>
                    <span className="text-white">${serv.precio}</span>
                    <span className="text-gray-300">{formatDuracion(serv.duracion)}</span>
                  </label>
                ))
              )}

              <button
                onClick={() => setModo("nuevo")}
                className="w-full sm:w-auto mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
              >
                ➕ Añadir servicio
              </button>
            </>
          )}

          {modo === "nuevo" && (
            <div className="flex flex-col gap-3 bg-neutral-800 p-4 rounded-lg">
              {/* Nombre */}
              <label className="flex flex-col text-white">
                Nombre del servicio
                <input
                  type="text"
                  placeholder="Ej: Corte de cabello"
                  value={nuevo.nombre}
                  onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                  className="mt-1 px-3 py-2 bg-neutral-900 border border-gray-700 rounded text-white"
                />
              </label>

              {/* Precio */}
              <label className="flex flex-col text-white">
                Precio
                <input
                  type="number"
                  placeholder="0"
                  value={nuevo.precio}
                  onFocus={(e) => {
                    if (e.target.value === "0") e.target.value = "";
                  }}
                  onChange={(e) =>
                    setNuevo({ ...nuevo, precio: Number(e.target.value) || 0 })
                  }
                  className="mt-1 px-3 py-2 bg-neutral-900 border border-gray-700 rounded text-white"
                />
              </label>

              {/* Duración */}
              <label className="flex flex-col text-white">
                Tiempo estimado
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    min="0"
                    value={Math.floor(nuevo.duracion / 60)} // horas
                    onChange={(e) => {
                      const horas = Number(e.target.value) || 0;
                      const minutos = nuevo.duracion % 60;
                      setNuevo({ ...nuevo, duracion: horas * 60 + minutos });
                    }}
                    className="w-20 px-3 py-2 bg-neutral-900 border border-gray-700 rounded text-white"
                  />
                  <span className="flex items-center text-gray-300">h</span>

                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={nuevo.duracion % 60} // minutos
                    onChange={(e) => {
                      const minutos = Number(e.target.value) || 0;
                      const horas = Math.floor(nuevo.duracion / 60);
                      setNuevo({ ...nuevo, duracion: horas * 60 + minutos });
                    }}
                    className="w-20 px-3 py-2 bg-neutral-900 border border-gray-700 rounded text-white"
                  />
                  <span className="flex items-center text-gray-300">min</span>
                </div>
              </label>

              {/* Botones */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setModo("lista")}
                  className="px-5 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCrearNuevo}
                  className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                >
                  Guardar servicio
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCerrar}
            className="px-5 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
