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

  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (valoresIniciales) {
      setValores((prev) => ({ ...prev, ...valoresIniciales }));
    }
  }, [valoresIniciales]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setValores((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const nombreValido = (valores.nombreEmpresa || "").trim().length > 2;
  const emailValido = /\S+@\S+\.\S+/.test(valores.correo || "");
  const telefonoValido = /^\d{8,15}$/.test(valores.telefono || "");
  const tipoValido = (valores.tipoNegocio || "") !== "";

  const formularioValido = nombreValido && emailValido && telefonoValido && tipoValido;

const renderIcon = (campo: string, valido: boolean) => {
  if (!touched[campo]) return null;
  return valido ? (
    <span className="text-green-600 font-bold">✔</span>
  ) : (
    <span className="text-blue-600 font-bold">✖</span> // 🔵 ahora en azul
  );
};


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formularioValido) {
      alert("⚠️ Completa todos los campos correctamente.");
      return;
    }
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
      <p className="text-gray-600 text-sm">Completa los datos de tu negocio para continuar.</p>

      {/* Nombre */}
      <div className="relative">
        <input
          required
          name="nombreEmpresa"
          type="text"
          placeholder="Nombre del negocio"
          className="border rounded px-3 py-2 w-full pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={valores.nombreEmpresa}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        <div className="absolute top-2 right-2">{renderIcon("nombreEmpresa", nombreValido)}</div>
      </div>

      {/* Correo */}
      <div className="relative">
        <input
          required
          name="correo"
          type="email"
          placeholder="Correo electrónico"
          className="border rounded px-3 py-2 w-full pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={valores.correo}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        <div className="absolute top-2 right-2">{renderIcon("correo", emailValido)}</div>
      </div>

      {/* Teléfono */}
      <div className="relative">
        <input
          required
          name="telefono"
          type="tel"
          placeholder="Número de teléfono"
          className="border rounded px-3 py-2 w-full pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={valores.telefono}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        <div className="absolute top-2 right-2">{renderIcon("telefono", telefonoValido)}</div>
      </div>

      {/* Tipo de negocio */}
      <div className="relative">
        <select
          required
          name="tipoNegocio"
          className="border rounded px-3 py-2 w-full pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={valores.tipoNegocio}
          onChange={handleChange}
          onBlur={handleBlur}
        >
          <option value="">Selecciona tipo de negocio</option>
          <option value="barberia">Barbería</option>
          <option value="peluqueria">Peluquería</option>
          <option value="spa">Spa</option>
          <option value="dentista">Dentista</option>
          <option value="tattoo">Casa de Tatuajes</option>
          <option value="otro">Otro</option>
        </select>
        <div className="absolute top-2 right-2">{renderIcon("tipoNegocio", tipoValido)}</div>
      </div>

      {/* Botón */}
      <button
        type="submit"
        disabled={!formularioValido}
        className={`py-2 px-4 rounded-lg text-white transition ${
          formularioValido
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-gray-400 cursor-not-allowed"
        }`}
      >
        Siguiente
      </button>
    </form>
  );
};

export default FormRegisterEmpresa;
