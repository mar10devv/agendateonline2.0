import React from "react";

type Props = {
  nombre: string;
  email: string;        // reservado para pasos futuros
  telefono: string;
  tipoNegocio: string;
  onChange: (patch: {
    nombre?: string;
    email?: string;
    telefono?: string;
    tipoNegocio?: string;
  }) => void;
  onNext: () => void;
};

// Solo para la vista previa del enlace
function normalizarTexto(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function RegistroPaso1({
  nombre,
  email: _email,
  telefono: _telefono,
  tipoNegocio: _tipoNegocio,
  onChange,
  onNext,
}: Props) {
  const nombreValido = nombre.trim().length > 2;
  const slugPreview = nombreValido
    ? normalizarTexto(nombre)
    : "miagenda";

  const handleNextClick = () => {
    if (!nombreValido) {
      alert("⚠️ Elige un nombre con al menos 3 caracteres");
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6 text-gray-900">
      {/* Título + subtítulo */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">
          ¿Cómo se va a llamar tu agenda?
        </h1>
        <p className="text-sm text-gray-600">
          Este será el nombre que verán tus clientes cuando reserven. Podrás
          cambiarlo más adelante si lo necesitas.
        </p>
      </div>

      {/* Campo nombre */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-800">
          Escribe el nombre aquí
        </label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => onChange({ nombre: e.target.value })}
          placeholder="Ej: Barbería Central"
          className="w-full p-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        />
        {!nombreValido && nombre.length > 0 && (
          <p className="text-red-600 text-xs mt-1">
            Debe tener al menos 3 caracteres.
          </p>
        )}
      </div>

      {/* Vista previa del enlace */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-700">
        <p className="mb-1 font-medium text-gray-800">
          Tu enlace podría verse así:
        </p>
        <code className="block text-[11px] break-all bg-white border border-gray-200 rounded px-2 py-1 text-gray-800">
          https://agendateonline.com/agenda/{slugPreview}
        </code>
      </div>

      {/* Botón siguiente */}
      <button
        onClick={handleNextClick}
        disabled={!nombreValido}
        className={`w-full py-2.5 rounded-lg text-white text-sm font-medium transition ${
          nombreValido
            ? "bg-blue-600 hover:bg-blue-700 shadow-sm"
            : "bg-gray-400 cursor-not-allowed"
        }`}
      >
        Continuar
      </button>

      <p className="text-[11px] text-gray-500 text-center">
        Tranquilo, todavía no se publica nada. Solo estamos preparando tu
        agenda.
      </p>
    </div>
  );
}

export default RegistroPaso1;
