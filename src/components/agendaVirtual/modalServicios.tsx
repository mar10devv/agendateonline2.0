import { useState, useEffect } from "react";
import {
  doc,
  collection,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import ModalBase from "../ui/modalGenerico";

type Servicio = {
  id?: string;
  nombre: string;
  precio: number;
  duracion: number;
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
  const [modo, setModo] = useState<"lista" | "nuevo" | "existente">("lista");

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

  if (!abierto) return null;

  return (
    <ModalBase
      abierto={abierto}
      onClose={onCerrar}
      titulo="Configurar servicios del empleado"
      maxWidth="max-w-2xl"
    >
      <div className="flex flex-col h-[600px]">
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {modo === "lista" && (
            <>
              {serviciosCatalogo.length === 0 ? (
                <p className="text-gray-400">No hay servicios en el negocio.</p>
              ) : (
                serviciosCatalogo.map((serv) => (
                  <label
                    key={serv.id}
                    className="flex items-center gap-3 bg-neutral-800 p-3 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={seleccionados.includes(serv.id!)}
                      onChange={() => toggleServicio(serv.id!)}
                      className="w-5 h-5"
                    />
                    <span className="flex-1 text-white">
                      {serv.nombre} - ${serv.precio} ({serv.duracion} min)
                    </span>
                  </label>
                ))
              )}

              <button
                onClick={() => setModo("nuevo")}
                className="w-full sm:w-auto mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
              >
                ➕ Crear servicio nuevo
              </button>
            </>
          )}

          {modo === "nuevo" && (
            <div className="flex flex-col gap-3 bg-neutral-800 p-4 rounded-lg">
              <input
                type="text"
                placeholder="Nombre"
                value={nuevo.nombre}
                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                className="px-3 py-2 bg-neutral-900 border border-gray-700 rounded text-white"
              />
              <input
                type="number"
                placeholder="Precio"
                value={nuevo.precio}
                onChange={(e) =>
                  setNuevo({ ...nuevo, precio: Number(e.target.value) })
                }
                className="px-3 py-2 bg-neutral-900 border border-gray-700 rounded text-white"
              />
              <input
                type="number"
                placeholder="Duración"
                value={nuevo.duracion}
                onChange={(e) =>
                  setNuevo({ ...nuevo, duracion: Number(e.target.value) })
                }
                className="px-3 py-2 bg-neutral-900 border border-gray-700 rounded text-white"
              />

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
