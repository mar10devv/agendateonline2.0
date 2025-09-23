// src/components/ui/ModalAviso.tsx
import React, { useEffect, useState } from "react";
import "animate.css";

type ModalAvisoProps = {
  abierto: boolean;
  onClose: () => void;
  titulo?: string;
  children: React.ReactNode;
  animacionEntrada?: string; // ej: "animate__bounceIn"
  animacionSalida?: string;  // ej: "animate__fadeOut"
};

const ModalAviso: React.FC<ModalAvisoProps> = ({
  abierto,
  onClose,
  titulo,
  children,
  animacionEntrada = "animate__bounceIn",
  animacionSalida = "animate__fadeOut",
}) => {
  const [visible, setVisible] = useState(false);
  const [animClass, setAnimClass] = useState("");

  useEffect(() => {
    if (abierto) {
      setVisible(true);
      setAnimClass(`animate__animated ${animacionEntrada}`);
    } else if (visible) {
      setAnimClass(`animate__animated ${animacionSalida}`);
      const timer = setTimeout(() => {
        setVisible(false);
        setAnimClass("");
      }, 600); // coincide con la duración promedio de Animate.css
      return () => clearTimeout(timer);
    }
  }, [abierto]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className={`bg-white rounded-xl shadow-lg w-[90%] max-w-sm p-6 text-center ${animClass}`}
      >
        {titulo && <h2 className="text-lg font-semibold mb-4">{titulo}</h2>}
        <div className="mb-6 text-gray-700">{children}</div>
        <button
          onClick={onClose}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default ModalAviso;
