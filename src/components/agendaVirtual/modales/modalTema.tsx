// src/components/agendaVirtual/ui/ModalTema.tsx
import { useState, useEffect } from "react";
import ModalGenerico from "../../ui/modalGenerico";
import { aplicarTema, temas } from "../../../lib/temaColores";
import { db } from "../../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  negocioId: string;
};

// temas que NO queremos mostrar todavía (los blancos bugueados)
const TEMAS_OCULTOS = ["white", "white2", "blanco", "blanco2"];

export default function ModalTema({ abierto, onCerrar, negocioId }: Props) {
  // ⛔️ Hace que el modal se destruya inmediatamente (sin animación)
  if (!abierto) return null;

  const [temaSeleccionado, setTemaSeleccionado] = useState<string>("gris");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const guardado = localStorage.getItem("temaSeleccionado");
    if (guardado && temas[guardado as keyof typeof temas]) {
      // si el tema guardado está oculto, forzamos a "gris"
      if (TEMAS_OCULTOS.includes(guardado)) {
        setTemaSeleccionado("gris");
      } else {
        setTemaSeleccionado(guardado);
      }
    }
  }, []);

  const manejarGuardar = async () => {
    setGuardando(true);
    
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
      
      // Pequeña pausa para que se vea el mensaje
      setTimeout(() => {
        window.location.reload();
      }, 800);
      
    } catch (err) {
      console.error("❌ Error al guardar el tema:", err);
      setGuardando(false);
    }
  };

  // 👉 Filtramos los temas que sí queremos mostrar en el modal
  const temasVisibles = Object.entries(temas).filter(([nombre, valores]) => {
    const color = valores.primario.toLowerCase();
    const esBlanco =
      color === "#ffffff" ||
      color === "#fff" ||
      color === "#f5f5f5" ||
      color === "#f9f9f9";

    return !TEMAS_OCULTOS.includes(nombre) && !esBlanco;
  });

  return (
    <ModalGenerico
      abierto={abierto}
      onClose={guardando ? () => {} : onCerrar}
      titulo="Seleccionar tema"
      maxWidth="max-w-sm"
    >
      <div className="grid grid-cols-3 gap-6 p-4">
        {temasVisibles.map(([nombre, valores]) => (
          <button
            key={nombre}
            onClick={() => !guardando && setTemaSeleccionado(nombre)}
            disabled={guardando}
            className={`w-14 h-14 rounded-full border-4 transition ${
              temaSeleccionado === nombre
                ? "border-white scale-110"
                : "border-transparent"
            } ${guardando ? "opacity-50 cursor-not-allowed" : ""}`}
            style={{
              backgroundColor: valores.primario,
            }}
          />
        ))}
      </div>

      <div className="flex justify-end mt-4 gap-2">
        <button
          onClick={onCerrar}
          disabled={guardando}
          className={`px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600 text-white ${
            guardando ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          Cancelar
        </button>

        <button
          onClick={manejarGuardar}
          disabled={guardando}
          className={`px-4 py-2 rounded text-white font-medium flex items-center gap-2 ${
            guardando 
              ? "bg-indigo-500 cursor-wait" 
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {guardando ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Aplicando estilo...
            </>
          ) : (
            "Guardar"
          )}
        </button>
      </div>
    </ModalGenerico>
  );
}