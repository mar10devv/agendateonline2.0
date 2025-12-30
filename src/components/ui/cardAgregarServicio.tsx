import React from "react";

type PropsCardAgregar = {
  onClick: () => void;
};

export default function CardServicioAgregar({ onClick }: PropsCardAgregar) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group relative p-3
        w-full sm:w-[210px]
        min-h-[120px]
        bg-[var(--color-primario-oscuro)] rounded-2xl border border-white/10
        shadow-[0_6px_16px_rgba(0,0,0,0.35)]
        hover:shadow-[0_10px_24px_rgba(0,0,0,0.55)]
        transition-all duration-300
        flex flex-col justify-center items-center gap-3
        text-white
      "
    >
      {/* SOLO EL + */}
      <span className="text-4xl leading-none font-light">+</span>

      <span className="text-xs uppercase tracking-wide opacity-70 group-hover:opacity-100">
        Agregar servicio
      </span>

      {/* HOVER */}
      <div
        className="
          absolute inset-0 rounded-2xl bg-white/5 
          opacity-0 group-hover:opacity-100 transition-opacity duration-300
          pointer-events-none
        "
      />
    </button>
  );
}
