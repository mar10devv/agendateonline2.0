import React from "react";

type TipoAgenda = "emprendimiento" | "negocio" | null;

type Props = {
  tipoAgenda: TipoAgenda;
  diasSeleccionados: string[];
  onChange: (dias: string[]) => void;
  onNext: () => void;
  onBack: () => void;
};

const DIAS = [
  { id: "lunes", label: "Lunes" },
  { id: "martes", label: "Martes" },
  { id: "miercoles", label: "Miércoles" },
  { id: "jueves", label: "Jueves" },
  { id: "viernes", label: "Viernes" },
  { id: "sabado", label: "Sábado" },
  { id: "domingo", label: "Domingo" },
];

function RegistroPaso4Dias({
  tipoAgenda,
  diasSeleccionados,
  onChange,
  onNext,
  onBack,
}: Props) {
  const esEmprendimiento = tipoAgenda === "emprendimiento";

  const toggleDia = (id: string) => {
    if (diasSeleccionados.includes(id)) {
      onChange(diasSeleccionados.filter((d) => d !== id));
    } else {
      onChange([...diasSeleccionados, id]);
    }
  };

  const titulo = esEmprendimiento
    ? "¿Qué días libres querés tener a la semana?"
    : "¿Qué días tiene cerrado el local?";

  const subtitulo = esEmprendimiento
    ? "Seleccioná los días que NO vas a trabajar. Podés no elegir ninguno si atendés toda la semana."
    : "Seleccioná los días en los que tu negocio permanece cerrado.";

  const handleNextClick = () => {
    onNext(); // no es obligatorio elegir días
  };

  const DiaCard = ({
    id,
    label,
    selected,
    onClick,
  }: {
    id: string;
    label: string;
    selected: boolean;
    onClick: () => void;
  }) => (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={`rounded-2xl border px-3 py-2 text-xs font-medium cursor-pointer transition shadow-sm
        ${
          selected
            ? "bg-blue-600 border-blue-600 text-white"
            : "bg-white border-gray-200 text-gray-800 hover:border-blue-500 hover:bg-blue-50"
        }`}
    >
      {label}
    </div>
  );

  return (
    <div className="space-y-6 text-gray-900">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">
          Configura tus días
        </h1>
        <p className="text-sm text-gray-600">{subtitulo}</p>
      </div>

      <p className="text-sm font-medium text-gray-800">{titulo}</p>

      {/* Días */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {DIAS.map((dia) => (
          <DiaCard
            key={dia.id}
            id={dia.id}
            label={dia.label}
            selected={diasSeleccionados.includes(dia.id)}
            onClick={() => toggleDia(dia.id)}
          />
        ))}
      </div>

      {/* Tip para ambos casos */}
      {esEmprendimiento ? (
        <p className="text-xs text-gray-500">
          Tip: si no marcás ningún día, asumimos que podés agendar clientes todos los
          días.
        </p>
      ) : (
        <p className="text-xs text-gray-500">
          Tip: si no marcás ningún día, asumimos que tu negocio abre todos los
          días de la semana.
        </p>
      )}

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
          className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition shadow-sm"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

export default RegistroPaso4Dias;
