import React from "react";

type TipoAgenda = "emprendimiento" | "negocio" | null;

type Props = {
  tipoAgenda: TipoAgenda;
  onChange: (valor: Exclude<TipoAgenda, null>) => void;
  onNext: () => void;
  onBack: () => void;
};

function RegistroPaso3({ tipoAgenda, onChange, onNext, onBack }: Props) {
  const esValido = tipoAgenda !== null;

  const handleSeleccion = (valor: Exclude<TipoAgenda, null>) => {
    onChange(valor);
  };

  const handleNextClick = () => {
    if (!esValido) {
      alert("⚠️ Elegí si es un emprendimiento o un negocio");
      return;
    }
    onNext();
  };

  const OpcionCard = ({
    selected,
    title,
    subtitle,
    onClick,
  }: {
    selected: boolean;
    title: string;
    subtitle: string;
    onClick: () => void;
  }) => (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={`rounded-2xl border px-4 py-3 text-sm cursor-pointer transition shadow-sm
        ${
          selected
            ? "bg-blue-600 border-blue-600 shadow-md"
            : "bg-white border-gray-200 hover:border-blue-500 hover:bg-blue-50"
        }`}
    >
      <div
        className={`font-semibold ${
          selected ? "text-white" : "text-gray-900"
        }`}
      >
        {title}
      </div>
      <div
        className={`mt-1 text-xs ${
          selected ? "text-blue-100" : "text-gray-600"
        }`}
      >
        {subtitle}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 text-gray-900">
      {/* Título + subtítulo */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">
          Configura tu agenda
        </h1>
        <p className="text-sm text-gray-600">
          Definí cómo funciona tu emprendimiento o negocio en el día a día.
        </p>
      </div>

      {/* Pregunta */}
      <p className="text-sm font-medium text-gray-800">
        ¿Qué vas a registrar?
      </p>

      {/* Tarjetas de selección */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <OpcionCard
          selected={tipoAgenda === "emprendimiento"}
          title="Emprendimiento (1 persona)"
          subtitle="Solo tu atendiendo clientes."
          onClick={() => handleSeleccion("emprendimiento")}
        />

        <OpcionCard
          selected={tipoAgenda === "negocio"}
          title="Negocio (más de 1 persona)"
          subtitle="Local con varios empleados o colaboradores."
          onClick={() => handleSeleccion("negocio")}
        />
      </div>

      {/* Botones Volver / Continuar */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-100 transition"
        >
          Volver
        </button>

        <button
          onClick={handleNextClick}
          disabled={!esValido}
          className={`flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition ${
            esValido
              ? "bg-blue-600 hover:bg-blue-700 shadow-sm"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

export default RegistroPaso3;
