import React from "react";

type Props = {
  codigo: string;
  codigoValido: boolean | null;
  onChange: (codigo: string) => void;
  onValidar: () => void;
  onBack: () => void;
};

function RegistroPaso6Codigo({
  codigo,
  codigoValido,
  onChange,
  onValidar,
  onBack,
}: Props) {
  return (
    <div className="space-y-6 text-gray-900">
      {/* Título + subtítulo */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">
          Código de activación
        </h1>
        <p className="text-sm text-gray-600">
          Ingresá el código de 15 cifras que te compartimos para finalizar la
          configuración de tu agenda.
        </p>
      </div>

      {/* Tarjeta código */}
      <div className="border rounded-2xl p-6 bg-white shadow-sm">
        <p className="text-sm text-gray-600 mb-4">
          Pegá tu código acá debajo y lo validamos al instante.
        </p>

        <input
          type="text"
          maxLength={15}
          value={codigo}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-2 border rounded-lg mb-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Ej: 123456789012345"
        />

        <button
          type="button"
          onClick={onValidar}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          Validar código
        </button>

        {codigoValido === true && (
          <p className="mt-3 text-sm text-green-600 font-semibold">
            ✅ Código válido. Tu agenda queda guardada y lista para usar.
          </p>
        )}
        {codigoValido === false && (
          <p className="mt-3 text-sm text-red-600 font-semibold">
            ❌ El código no es válido o ya fue utilizado. Revisalo e intentá de
            nuevo.
          </p>
        )}

        <p className="mt-3 text-xs text-gray-500">
          Si recibiste este código desde AgendateOnline, solo necesitás
          validarlo una vez.
        </p>
      </div>

      {/* Botón volver */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-100 transition"
        >
          Volver
        </button>
      </div>
    </div>
  );
}

export default RegistroPaso6Codigo;
