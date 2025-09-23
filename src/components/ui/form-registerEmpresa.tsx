import React, { useState, useEffect } from "react";

type ValoresEmpresa = {
  nombreEmpresa?: string;
  correo?: string;
  telefono?: string;
  tipoNegocio?: string;
};

type Props = {
  valoresIniciales?: ValoresEmpresa;
  onSubmit: (valores: ValoresEmpresa) => void;
};

const FormRegisterEmpresa: React.FC<Props> = ({ valoresIniciales, onSubmit }) => {
  const [valores, setValores] = useState<ValoresEmpresa>({
    nombreEmpresa: "",
    correo: "",
    telefono: "",
    tipoNegocio: "",
  });

  useEffect(() => {
    if (valoresIniciales) {
      setValores((prev) => ({ ...prev, ...valoresIniciales }));
    }
  }, [valoresIniciales]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setValores((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(valores);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 w-full bg-white p-6 rounded-xl shadow-lg"
    >
      {/* Título */}
      <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
        Registro de Negocio
        <span className="animate-pulse w-3 h-3 bg-blue-600 rounded-full"></span>
      </h2>
      <p className="text-gray-600 text-sm">
        Completa los datos de tu negocio para continuar.
      </p>

      {/* Inputs */}
      <input
        required
        name="nombreEmpresa"
        type="text"
        placeholder="Nombre del negocio"
        className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={valores.nombreEmpresa}
        onChange={handleChange}
      />

      <input
        required
        name="correo"
        type="email"
        placeholder="Correo electrónico"
        className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={valores.correo}
        onChange={handleChange}
      />

      <input
        required
        name="telefono"
        type="tel"
        placeholder="Número de teléfono"
        className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={valores.telefono}
        onChange={handleChange}
      />

      <select
        required
        name="tipoNegocio"
        className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={valores.tipoNegocio}
        onChange={handleChange}
      >
        <option value="">Selecciona tipo de negocio</option>
        <option value="barberia">Barbería</option>
        <option value="peluqueria">Peluquería</option>
        <option value="spa">Spa</option>
        <option value="dentista">Dentista</option>
        <option value="tattoo">Casa de Tatuajes</option>
        <option value="otro">Otro</option>
      </select>

      {/* Botón */}
      <button
        type="submit"
        className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
      >
        Siguiente
      </button>
    </form>
  );
};

export default FormRegisterEmpresa;
