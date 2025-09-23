import React, { useState } from "react";
import ModalAviso from "../components/ui/modalAviso";

const Pruebas = () => {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      <button
        onClick={() => setAbierto(true)}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
      >
        Abrir modal
      </button>

      <ModalAviso
        abierto={abierto}
        onClose={() => setAbierto(false)}
        titulo="Acción completada"
      >
        📋 El link de tu agenda fue copiado al portapapeles.
      </ModalAviso>
    </div>
  );
};

export default Pruebas;
