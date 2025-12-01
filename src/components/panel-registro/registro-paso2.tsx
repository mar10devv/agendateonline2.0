import React from "react";

type Props = {
  tipoNegocio: string;
  onChange: (patch: { tipoNegocio?: string }) => void;
  onNext: () => void;
  onBack: () => void;
};

const CATEGORIAS = [
  { id: "belleza-estetica", label: "Belleza & Estética (salón)" },
  { id: "barberia", label: "Barbería" },
  { id: "unas-pestanas", label: "Uñas & Pestañas" },
  { id: "tattoo-piercing", label: "Tatuajes & Piercings" },
  { id: "masajes-spa", label: "Masajes & Spa" },
  { id: "quiropraxia-fisio", label: "Quiropraxia & Fisioterapia" },
  { id: "medicina", label: "Medicina (Doctores)" },
  { id: "medicina-estetica", label: "Medicina Estética (Botox & +)" },
  { id: "odontologia", label: "Odontología" },
  { id: "abogados", label: "Legal / Abogados" },
  { id: "mascotas", label: "Mascotas" },
  { id: "fitness-clases", label: "Fitness & Clases" },
  { id: "automotor", label: "Automotor" },
  { id: "hogar-tecnicos", label: "Hogar & Técnicos" },
  { id: "foto-video", label: "Foto/Video & Estudio" },
  { id: "educacion-consultoria", label: "Educación & Consultoría" },
];

function RegistroPaso2({ tipoNegocio, onChange, onNext, onBack }: Props) {
  const esValido = !!tipoNegocio;

  const handleNextClick = () => {
    if (!esValido) {
      alert("⚠️ Elegí al menos un tipo de negocio");
      return;
    }
    onNext();
  };

  return (
    // pb-6: un poco de aire, sin espacio gigante
    <div className="space-y-6 text-gray-900 pb-6">
      {/* Título + subtítulo */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">
          ¿Qué tipo de negocio es?
        </h1>
        <p className="text-sm text-gray-600">
          Esto nos ayuda a adaptar tu agenda y los textos a tu rubro.
        </p>
      </div>

      {/* Selector de tipo de negocio */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-800">
          Selecciona el rubro
        </label>
        <select
          value={tipoNegocio}
          onChange={(e) => onChange({ tipoNegocio: e.target.value })}
          className="w-full p-2.5 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Elegí una opción</option>
          {CATEGORIAS.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
        {!esValido && (
          <p className="text-xs text-gray-500 mt-1">
            Podrás cambiar el rubro más adelante desde la configuración.
          </p>
        )}
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

export default RegistroPaso2;
