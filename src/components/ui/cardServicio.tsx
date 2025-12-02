import React from "react";

type PropsCard = {
  nombre: string;
  precio: number | string;
  duracion: number | string;
  onClick?: () => void;
};

export default function CardServicio({
  nombre,
  precio,
  duracion,
  onClick,
}: PropsCard) {
  return (
    <div
      onClick={onClick}
      className="
        group relative p-3
        w-full sm:w-[210px]
        min-h-[120px]
        bg-[#111] rounded-2xl border border-white/10
        shadow-[0_6px_16px_rgba(0,0,0,0.35)]
        hover:shadow-[0_10px_24px_rgba(0,0,0,0.55)]
        transition-all duration-300 cursor-pointer
        flex flex-col justify-between
        text-white
      "
    >
      {/* TITULO + PRECIO */}
      <div
        className="
          flex flex-wrap 
          items-start 
          justify-between 
          w-full 
          gap-x-2 gap-y-1
        "
      >
        {/* NOMBRE */}
        <h3
          className="
            font-semibold text-base 
            leading-snug 
            flex-1 min-w-[120px]
            break-words whitespace-normal
          "
        >
          {nombre}
        </h3>

        {/* PRECIO */}
        <span
          className="
            px-3 py-0.5 rounded-full text-xs font-semibold shrink-0
            text-white bg-white/10 border border-white/20
            shadow-[0_0_6px_rgba(255,255,255,0.4)]
          "
        >
          ${precio}
        </span>
      </div>

      {/* DURACIÓN */}
      <p className="text-xs opacity-70 mt-2">
        {duracion} min aprox.
      </p>

      {/* HOVER */}
      <div
        className="
          absolute inset-0 rounded-2xl bg-white/5 
          opacity-0 group-hover:opacity-100 transition-opacity duration-300
          pointer-events-none
        "
      />
    </div>
  );
}
