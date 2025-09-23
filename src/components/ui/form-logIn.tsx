import React, { useState } from "react";

type ValoresLogin = {
  correo: string;
  contraseña: string;
};

type Props = {
  valoresIniciales?: ValoresLogin;
  onSubmit: (valores: ValoresLogin) => void;
};

const FormularioLogin: React.FC<Props> = ({ valoresIniciales, onSubmit }) => {
  const [valores, setValores] = useState<ValoresLogin>({
    correo: valoresIniciales?.correo || "",
    contraseña: valoresIniciales?.contraseña || "",
  });

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
        Iniciar Sesión
        <span className="animate-pulse w-3 h-3 bg-blue-600 rounded-full"></span>
      </h2>
      <p className="text-gray-600 text-sm">
        Accedé a tu cuenta para continuar.
      </p>

      {/* Inputs */}
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
        name="contraseña"
        type="password"
        placeholder="Contraseña"
        className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={valores.contraseña}
        onChange={handleChange}
      />

      {/* Botón */}
      <button
        type="submit"
        className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
      >
        Ingresar
      </button>

      {/* Link */}
      <p className="text-sm text-gray-600 text-center">
        ¿Todavía no tenés cuenta?{" "}
        <a href="#" className="text-blue-600 hover:underline">
          Registrate
        </a>
      </p>
    </form>
  );
};

export default FormularioLogin;
