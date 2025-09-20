// src/components/panel-lite/panel-modalHorarios.tsx
import React, { useState, useEffect } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

type Props = {
  negocioId: string;
  onClose: () => void;
};

export default function PanelModalHorarios({ negocioId, onClose }: Props) {
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");

  // 🔄 Cargar datos actuales
  useEffect(() => {
    const cargarDatos = async () => {
      const negocioRef = doc(db, "Negocios", negocioId);
      const snap = await getDoc(negocioRef);
      if (snap.exists()) {
        const cfg = snap.data().configuracionAgenda || {};
        setHoraInicio(cfg.inicio || "");
        setHoraFin(cfg.fin || "");
      }
    };
    cargarDatos();
  }, [negocioId]);

  // 💾 Guardar horarios en negocio y empleados
  const handleSave = async () => {
    if (!horaInicio || !horaFin) {
      alert("Debes seleccionar hora de inicio y hora de fin");
      return;
    }

    try {
      const negocioRef = doc(db, "Negocios", negocioId);
      const snap = await getDoc(negocioRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const oldCfg = data.configuracionAgenda || {};
      const empleadosData = data.empleadosData || [];

      // 🔄 actualizar configuracionAgenda
      const nuevaConfig = {
        ...oldCfg,
        inicio: horaInicio,
        fin: horaFin,
      };

      // 🔄 actualizar cada empleado
      const nuevosEmpleados = empleadosData.map((emp: any) => ({
        ...emp,
        calendario: {
          ...(emp.calendario || {}),
          inicio: horaInicio,
          fin: horaFin,
        },
      }));

      await updateDoc(negocioRef, {
        configuracionAgenda: nuevaConfig,
        empleadosData: nuevosEmpleados,
      });

      console.log("✅ Horarios guardados correctamente en negocio y empleados");

      // 👇 cerrar modal y refrescar ventana
      onClose();
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error("❌ Error al guardar horarios:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-96 relative">
        <h2 className="text-lg font-bold mb-4">Configurar horarios</h2>

        <div className="space-y-4">
          <div>
            <label className="block mb-2 font-medium">Hora de inicio</label>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Hora de fin</label>
            <input
              type="time"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
