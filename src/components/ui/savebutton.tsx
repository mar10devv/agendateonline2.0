// src/components/ui/SaveButton.tsx
import React, { useState } from "react";
import LoaderSpinner from "./loaderSpinner";

type Estado = "normal" | "guardando" | "exito";

const SaveButton: React.FC = () => {
  const [estado, setEstado] = useState<Estado>("normal");

  const handleClick = () => {
    if (estado !== "normal") return;

    setEstado("guardando");

    // simulamos guardado
    setTimeout(() => {
      setEstado("exito");

      // volver a normal después de 2s
      setTimeout(() => setEstado("normal"), 2000);
    }, 2000);
  };

  return (
    <button
      onClick={handleClick}
      disabled={estado === "guardando"}
      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition ${
        estado === "exito"
          ? "bg-green-600 hover:bg-green-700"
          : "bg-blue-600 hover:bg-blue-700 disabled:opacity-70"
      }`}
    >
      {estado === "normal" && "Guardar"}

      {estado === "guardando" && (
        <>
          Guardando cambios
          <LoaderSpinner />
        </>
      )}

      {estado === "exito" && "Se guardó correctamente✔"}
    </button>
  );
};

export default SaveButton;
