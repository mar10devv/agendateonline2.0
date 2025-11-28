// src/components/ui/ModalGenerico.tsx
import React, { useEffect, useState } from "react";
import "animate.css";
import CloseIcon from "../../assets/close-svg.svg?url";

type ModalGenericoProps = {
  abierto: boolean;
  onClose: () => void;
  titulo?: string;
  children: React.ReactNode;
  maxWidth?: string;
  animacionEntrada?: string;
  animacionSalida?: string;
};

const ModalGenerico: React.FC<ModalGenericoProps> = ({
  abierto,
  onClose,
  titulo,
  children,
  maxWidth = "max-w-lg",
  animacionEntrada = "animate__bounceIn",
  animacionSalida = "animate__fadeOut",
}) => {
  const [visible, setVisible] = useState(false);
  const [animClass, setAnimClass] = useState("");

  // 🛑 BLOQUEO REAL DEL SCROLL DE FONDO (sin bugs)
  useEffect(() => {
    const body = document.body;

    if (abierto) {
      const scrollBarWidth = window.innerWidth - body.clientWidth + "px";
      body.style.overflow = "hidden";
      body.style.paddingRight = scrollBarWidth; // evita el salto del layout
      body.style.touchAction = "none"; // bloquea scroll táctil en mobile
    } else {
      body.style.overflow = "";
      body.style.paddingRight = "";
      body.style.touchAction = "";
    }

    return () => {
      body.style.overflow = "";
      body.style.paddingRight = "";
      body.style.touchAction = "";
    };
  }, [abierto]);

  // 🎬 Animaciones
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
        className={`
          text-white rounded-xl shadow-2xl w-[90%] ${maxWidth}
          p-6 relative transition-colors duration-300
          ${animClass}
        `}
        style={{ backgroundColor: "var(--color-fondo)" }}
      >
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 transition"
          title="Cerrar"
        >
          <img
            src={CloseIcon}
            alt="Cerrar"
            className="w-5 h-5 invert opacity-80 hover:opacity-100 transition"
          />
        </button>

        {/* Título opcional */}
        {titulo && (
          <h2 className="text-lg font-semibold mb-4 text-center">
            {titulo}
          </h2>
        )}

        {/* Contenido con scroll interno */}
        <div className="max-h-[80vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ModalGenerico;
