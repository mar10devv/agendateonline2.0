import { useState, useEffect } from "react";
import ModalGenerico from "../../ui/modalGenerico";
import { aplicarTema, temas } from "../../../lib/temaColores";
import { db } from "../../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  negocioId: string; // ✅ necesario para guardar el color en Firestore
};

export default function ModalTema({ abierto, onCerrar, negocioId }: Props) {
  const [temaSeleccionado, setTemaSeleccionado] = useState<string>("gris");

  // 🔹 Carga el tema guardado en localStorage
  useEffect(() => {
    const guardado = localStorage.getItem("temaSeleccionado");
    if (guardado && temas[guardado as keyof typeof temas]) {
      setTemaSeleccionado(guardado);
    }
  }, []);

  // 🔹 Guardar tema local + Firestore
  const manejarGuardar = async () => {
    aplicarTema(temaSeleccionado as keyof typeof temas);

    try {
      const tema = temas[temaSeleccionado as keyof typeof temas];
      const negocioRef = doc(db, "Negocios", negocioId);

      await updateDoc(negocioRef, {
        tema: {
          colorPrimario: tema.primario,
          colorFondo: tema.fondo,
          colorPrimarioOscuro: tema.oscuro,
        },
      });

      console.log("✅ Tema guardado en Firestore:", temaSeleccionado);
    } catch (err) {
      console.error("❌ Error al guardar el tema:", err);
    }

    onCerrar();
  };

  return (
    <ModalGenerico
      abierto={abierto}
      onClose={onCerrar}
      titulo="Seleccionar tema"
      maxWidth="max-w-sm"
    >
      <div className="grid grid-cols-3 gap-6 p-4">
        {Object.entries(temas).map(([nombre, valores]) => (
          <button
            key={nombre}
            onClick={() => setTemaSeleccionado(nombre)}
            className={`w-14 h-14 rounded-full border-4 transition ${
              temaSeleccionado === nombre
                ? "border-white scale-110"
                : "border-transparent"
            }`}
            style={{
              backgroundColor: valores.primario,
            }}
          />
        ))}
      </div>

      <div className="flex justify-end mt-4 gap-2">
        <button
          onClick={onCerrar}
          className="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600 text-white"
        >
          Cancelar
        </button>
        <button
          onClick={manejarGuardar}
          className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
        >
          Guardar
        </button>
      </div>
    </ModalGenerico>
  );
}
