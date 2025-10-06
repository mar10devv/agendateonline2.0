// src/components/ui/SelectorTema.tsx
import { aplicarTema, temas } from "../../../lib/temaColores";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

/**
 * Selector de tema de color.
 * @param negocioId - ID del negocio actual (para guardar tema en Firestore)
 */
export default function SelectorTema({ negocioId }: { negocioId?: string }) {
  const handleSeleccionarTema = async (nombre: keyof typeof temas) => {
    // 1️⃣ Aplicar tema localmente
    aplicarTema(nombre);

    // 2️⃣ Guardar el tema en Firestore (para reflejarlo a los clientes)
    if (negocioId) {
      const ref = doc(db, "Negocios", negocioId);
      const { primario, fondo, oscuro } = temas[nombre];

      try {
        await updateDoc(ref, {
          "tema.colorPrimario": primario,
          "tema.colorFondo": fondo,
          "tema.colorPrimarioOscuro": oscuro,
        });
        console.log(`🎨 Tema "${nombre}" guardado en Firestore para negocio ${negocioId}`);
      } catch (error) {
        console.error("❌ Error al guardar el tema en Firestore:", error);
      }
    }
  };

  return (
    <div className="flex gap-2 p-3 justify-center">
      {Object.entries(temas).map(([nombre, { primario }]) => (
        <button
          key={nombre}
          onClick={() => handleSeleccionarTema(nombre as keyof typeof temas)}
          className="w-7 h-7 rounded-full border-2 border-white hover:scale-110 transition"
          style={{ backgroundColor: primario }}
          title={`Tema ${nombre}`}
        />
      ))}
    </div>
  );
}
