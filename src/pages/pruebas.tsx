import React, { useState } from "react";
import InputAnimado from "../components/ui/InputAnimado";

const Pruebas: React.FC = () => {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [servicio, setServicio] = useState("");
  const [costo, setCosto] = useState("");

  return (
    <div className="w-full max-w-sm px-6 flex flex-col items-center space-y-6">
      <InputAnimado
        label="Nombre"
        id="nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />

      <InputAnimado
        label="Descripción"
        id="descripcion"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
      />

      <InputAnimado
        label="Servicio"
        id="servicio"
        value={servicio}
        onChange={(e) => setServicio(e.target.value)}
      />

      <InputAnimado
        label="Costo"
        id="costo"
        value={costo}
        onChange={(e) => setCosto(e.target.value)}
      />
    </div>
  );
};

export default Pruebas;

