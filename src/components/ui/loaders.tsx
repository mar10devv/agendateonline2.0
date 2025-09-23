// src/components/ui/Loader.tsx
import React from "react";
import "../../styles/loader.css";

type LoaderProps = {
  mensaje?: string;
  textColor?: string;   // Tailwind para texto
  circleColor?: string; // Hex/rgb/hsl para círculos
};

const Loader: React.FC<LoaderProps> = ({
  mensaje = "Cargando...",
  textColor = "text-indigo-600",
  circleColor = "#2563eb", // fallback azul
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div
        className="loader"
        style={{ ["--loader-color" as any]: circleColor }} // ✅ seteamos la variable
      >
        <div className="circle" />
        <div className="circle" />
        <div className="circle" />
        <div className="circle" />
      </div>
      <p className={`mt-6 text-lg font-medium ${textColor}`}>{mensaje}</p>
    </div>
  );
};

export default Loader;
