import React, { useState, useEffect } from "react";

type ValoresFormulario = {
  nombre?: string;
  apellido?: string;
  correo?: string;
  telefono?: string;
  contraseña?: string;
  confirmarContraseña?: string;
};

type Props = {
  valoresIniciales?: ValoresFormulario;
  onSubmit: (valores: ValoresFormulario) => void;
};

const Formulario: React.FC<Props> = ({ valoresIniciales, onSubmit }) => {
  const [valores, setValores] = useState<ValoresFormulario>({
    nombre: "",
    apellido: "",
    correo: "",
    telefono: "",
    contraseña: "",
    confirmarContraseña: "",
  });

  // Actualiza valores si vienen desde fuera
  useEffect(() => {
    if (valoresIniciales) {
      setValores((prev) => ({ ...prev, ...valoresIniciales }));
    }
  }, [valoresIniciales]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        Registro
        <span className="animate-pulse w-3 h-3 bg-blue-600 rounded-full"></span>
      </h2>
      <p className="text-gray-600 text-sm">
        Crea tu cuenta y obtené acceso completo a nuestra app.
      </p>

      {/* Inputs */}
      <div className="flex gap-2">
        <input
          required
          name="nombre"
          type="text"
          placeholder="Nombre"
          className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={valores.nombre}
          onChange={handleChange}
        />
        <input
          required
          name="apellido"
          type="text"
          placeholder="Apellido"
          className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={valores.apellido}
          onChange={handleChange}
        />
      </div>

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

      <input
        required
        name="contraseña"
        type="password"
        placeholder="Contraseña"
        className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={valores.contraseña}
        onChange={handleChange}
      />

      <input
        required
        name="confirmarContraseña"
        type="password"
        placeholder="Confirmar contraseña"
        className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={valores.confirmarContraseña}
        onChange={handleChange}
      />

      {/* Botón */}
      <button
        type="submit"
        className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
      >
        Registrarme
      </button>

      {/* Link */}
      <p className="text-sm text-gray-600 text-center">
        ¿Ya tenés una cuenta?{" "}
        <a href="#" className="text-blue-600 hover:underline">
          Iniciar sesión
        </a>
      </p>
    </form>
  );
};

export default Formulario;
