import { useState, useEffect } from "react";
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import ModalBase from "../ui/modalGenerico";

type Servicio = {
  id?: string;
  servicio: string;
  precio: number;
  duracion: number;
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

  // 🔹 Escuchar en tiempo real los servicios del negocio
  useEffect(() => {
    if (!abierto) return;
    if (!negocioId) return;

    const negocioRef = doc(db, "Negocios", negocioId);
    const preciosRef = collection(negocioRef, "Precios");

    const unsubscribe = onSnapshot(preciosRef, (snap) => {
      const data = snap.docs.map(
        (d) =>
          ({
            id: d.id,
            servicio: d.data().servicio || "",
            precio: d.data().precio || 0,
            duracion: d.data().duracion || 30,
          } as Servicio)
      );
      setServicios(data);
      setCargando(false);
    });

    return () => unsubscribe();
  }, [abierto, negocioId]);

  // 📌 Handlers
  const handleChange = (index: number, field: keyof Servicio, value: any) => {
    setServicios((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, [field]: field === "servicio" ? value : Number(value) } : s
      )
    );
  };

const handleAgregar = () => {
  setServicios([{ servicio: "", precio: 0, duracion: 30 }, ...servicios]);
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
          if (s.id) {
            await setDoc(
              doc(preciosRef, s.id),
              { servicio: s.servicio, precio: s.precio, duracion: s.duracion },
              { merge: true }
            );
          } else {
            await addDoc(preciosRef, {
              servicio: s.servicio,
              precio: s.precio,
              duracion: s.duracion,
            });
          }
        }
      }
      onCerrar();
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
      maxWidth="max-w-2xl"
    >
      <div className="flex flex-col h-[600px]">
        {/* Scroll interno */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {cargando ? (
            <p className="text-gray-400">Cargando servicios...</p>
          ) : servicios.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay servicios cargados aún.</p>
          ) : (
            servicios.map((serv, i) => (
              <div
                key={serv.id || i}
                className="flex flex-col sm:flex-row gap-3 bg-neutral-800 p-4 rounded-lg items-center"
              >
                <input
                  type="text"
                  placeholder="Nombre"
                  value={serv.servicio}
                  onChange={(e) => handleChange(i, "servicio", e.target.value)}
                  className="flex-1 px-3 py-2 bg-neutral-900 border border-gray-700 rounded text-white"
                />
                <input
                  type="number"
                  placeholder="Precio"
                  value={serv.precio}
                  onChange={(e) => handleChange(i, "precio", e.target.value)}
                  className="w-full sm:w-24 px-2 py-2 bg-neutral-900 border border-gray-700 rounded text-white"
                />
                <input
                  type="number"
                  placeholder="Duración"
                  value={serv.duracion}
                  onChange={(e) => handleChange(i, "duracion", e.target.value)}
                  className="w-full sm:w-24 px-2 py-2 bg-neutral-900 border border-gray-700 rounded text-white"
                />
                <button
                  onClick={() => handleEliminar(i)}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  X
                </button>
              </div>
            ))
          )}
        </div>

        {/* Botón añadir */}
        <div className="mt-4">
          <button
            onClick={handleAgregar}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
          >
            ➕ Añadir servicio
          </button>
        </div>

        {/* Botones finales */}
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
