// src/components/panel-lite/panel-servicios.tsx
import React, { useState, useEffect } from "react";
import { doc, collection, getDocs, setDoc, addDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

// 📂 Icono papelera
import PapeleraIcon from "../../assets/papelera-svg.svg?url";

type Props = {
  negocioId: string;
  onSaved?: () => void; // 👈 nueva prop opcional
};

type Servicio = {
  id?: string;
  servicio: string;
  precio: number;
};

export default function PanelServiciosLite({ negocioId }: Props) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // 🔹 Cargar servicios de Firestore al iniciar
  useEffect(() => {
    const fetchServicios = async () => {
      try {
        const negocioRef = doc(db, "Negocios", negocioId);
        const preciosRef = collection(negocioRef, "Precios");
        const snap = await getDocs(preciosRef);

        const serviciosData = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Servicio[];

        setServicios(serviciosData);
      } catch (error) {
        console.error("❌ Error cargando servicios:", error);
      }
    };

    fetchServicios();
  }, [negocioId]);

  const handleChange = (index: number, campo: "servicio" | "precio", valor: string) => {
    setServicios((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, [campo]: campo === "precio" ? Number(valor) : valor } : s
      )
    );
  };

  const agregarServicio = () => {
    setServicios((prev) => [...prev, { servicio: "", precio: 0 }]);
  };

  const eliminarServicio = async (index: number) => {
    const servicio = servicios[index];
    try {
      if (servicio.id) {
        const negocioRef = doc(db, "Negocios", negocioId);
        const preciosRef = collection(negocioRef, "Precios");
        await deleteDoc(doc(preciosRef, servicio.id));
      }
      setServicios((prev) => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error("❌ Error eliminando servicio:", error);
    }
  };

  const guardarServicios = async () => {
    setGuardando(true);
    setMensaje("");

    try {
      const negocioRef = doc(db, "Negocios", negocioId);
      const preciosRef = collection(negocioRef, "Precios");

      for (const item of servicios) {
        if (item.servicio.trim() !== "") {
          if (item.id) {
            // 🔹 Actualizar si ya existe
            await setDoc(
              doc(preciosRef, item.id),
              { servicio: item.servicio, precio: item.precio },
              { merge: true }
            );
          } else {
            // 🔹 Crear si es nuevo
            await addDoc(preciosRef, {
              servicio: item.servicio,
              precio: item.precio,
            });
          }
        }
      }

      setMensaje("✅ Servicios guardados correctamente.");
    } catch (error) {
      console.error(error);
      setMensaje("❌ Error al guardar servicios.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Servicios</h2>

      <div className="space-y-4">
        {servicios.length === 0 ? (
          <p className="text-gray-500">No hay servicios agregados aún.</p>
        ) : (
          servicios.map((item, i) => (
            <div
              key={item.id || i}
              className="bg-gray-50 p-4 rounded-lg border flex flex-col md:flex-row md:items-end md:gap-4"
            >
              {/* Servicio */}
              <div className="flex-1 flex flex-col mb-3 md:mb-0">
                <label className="mb-1 text-sm font-bold text-gray-600">
                  Servicio
                </label>
                <input
                  type="text"
                  value={item.servicio}
                  onChange={(e) => handleChange(i, "servicio", e.target.value)}
                  placeholder="Ej: Corte de pelo"
                  className="h-11 px-3 rounded-lg border bg-white focus:border-indigo-600 focus:outline-none transition"
                />
              </div>

              {/* Precio */}
              <div className="w-full md:w-32 flex flex-col mb-3 md:mb-0">
                <label className="mb-1 text-sm font-bold text-gray-600">
                  Precio
                </label>
                <input
                  type="number"
                  value={item.precio}
                  onChange={(e) => handleChange(i, "precio", e.target.value)}
                  placeholder="0"
                  className="h-11 px-3 rounded-lg border bg-white focus:border-indigo-600 focus:outline-none transition text-left"
                />
              </div>

              {/* Papelera */}
              <button
                type="button"
                onClick={() => eliminarServicio(i)}
                className="ml-auto p-2 rounded-lg hover:bg-red-100 transition"
                title="Eliminar servicio"
              >
                <img src={PapeleraIcon} alt="Eliminar" className="w-6 h-6" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Botones */}
      <div className="flex gap-3 mt-4 justify-end">
        <button
          type="button"
          onClick={agregarServicio}
          className="bg-indigo-500 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-600 transition text-sm"
        >
          + Agregar servicio
        </button>

        <button
          type="button"
          onClick={guardarServicios}
          disabled={guardando}
          className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2 text-sm"
        >
          {guardando && (
            <div className="w-5 h-5 border-2 border-t-white border-white/30 rounded-full animate-spin"></div>
          )}
          {guardando ? "Guardando..." : "Guardar"}
        </button>
      </div>

      {/* Mensaje */}
      {mensaje && <p className="text-sm text-gray-700 mt-3">{mensaje}</p>}
    </div>
  );
}
