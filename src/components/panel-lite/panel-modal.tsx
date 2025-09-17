// src/components/panel-lite/panel-modal.tsx
import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import PanelServiciosLite from "./panel-servicios";

type Props = {
  negocioId: string;
  slug: string;
  onClose: () => void;
};

export default function ConfigModalLite({ negocioId, slug, onClose }: Props) {
  const [nuevoSlug, setNuevoSlug] = useState(slug);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const guardarSlug = async () => {
    setGuardando(true);
    setMensaje("");

    try {
      const negocioRef = doc(db, "Negocios", negocioId);
      await updateDoc(negocioRef, { slug: nuevoSlug });

      setMensaje("✅ Nombre de la agenda actualizado.");
    } catch (err) {
      console.error("❌ Error guardando slug:", err);
      setMensaje("❌ No se pudo guardar el nombre de la agenda.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl relative flex flex-col max-h-[70vh]">
        {/* 🔹 Cabecera fija */}
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b rounded-t-2xl flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            ⚙️ Configuración de la agenda
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* 🔹 Contenido scrolleable con scrollbar custom */}
        <div className="p-6 overflow-y-auto custom-scroll">
          {/* Slug */}
          <div className="mb-6 text-center">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la agenda (slug actual: <b>{slug}</b>)
            </label>
            <input
              type="text"
              value={nuevoSlug}
              onChange={(e) => setNuevoSlug(e.target.value)}
              placeholder="Nuevo nombre de la agenda"
              className="w-full md:w-3/4 mx-auto px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-600"
            />
            <button
              onClick={guardarSlug}
              disabled={guardando}
              className="mt-4 px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar nombre"}
            </button>
            {mensaje && <p className="text-sm text-gray-600 mt-2">{mensaje}</p>}
          </div>

          {/* Servicios */}
          <PanelServiciosLite negocioId={negocioId} />
        </div>
      </div>
    </div>
  );
}
