// src/components/ui/ModalAviso.tsx
import React, { useEffect, useState } from "react";
import "animate.css";

type ModalAvisoProps = {
  abierto: boolean;
  onClose: () => void;          // cerrar sin confirmar
  onConfirm?: () => void;       // confirmar acción (opcional)
  titulo?: string;
  children: React.ReactNode;    // contenido del modal
  animacionEntrada?: string;    // ej: "animate__bounceIn"
  animacionSalida?: string;     // ej: "animate__fadeOut"
};

const ModalAviso: React.FC<ModalAvisoProps> = ({
  abierto,
  onClose,
  onConfirm,
  titulo,
  children,
  animacionEntrada = "animate__bounceIn",
  animacionSalida = "animate__fadeOut",
}) => {
  const [visible, setVisible] = useState(false);
  const [animClass, setAnimClass] = useState("");

  // 🚫 Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (abierto) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [abierto]);

  useEffect(() => {
    if (abierto) {
      setVisible(true);
      setAnimClass(`animate__animated ${animacionEntrada}`);
    } else if (visible) {
      setAnimClass(`animate__animated ${animacionSalida}`);
      const timer = setTimeout(() => {
        setVisible(false);
        setAnimClass("");
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [abierto]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-md">
      <div
        className={`bg-neutral-900 text-white rounded-xl shadow-2xl w-[90%] max-w-sm p-6 text-center ${animClass}`}
      >
        {titulo && <h2 className="text-lg font-semibold mb-4">{titulo}</h2>}
        <div className="mb-6 text-gray-300">{children}</div>

        <div className="flex justify-center gap-4">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-gray-700 text-gray-200 font-medium hover:bg-gray-600 transition"
          >
            Cancelar
          </button>
          {onConfirm && (
            <button
              onClick={onConfirm}
              className="px-5 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalAviso;
