import React from "react";

type PropsCard = {
  nombre: string;
  precio: number | string;
  duracion?: number;
};

const CardServicioPrueba: React.FC<PropsCard> = ({
  nombre,
  precio,
  duracion,
}) => {
  return (
    <div
      className="
        group
        bg-gradient-to-br from-white/20 via-white/5 to-transparent
        rounded-3xl p-[1px]
        shadow-[0_4px_14px_rgba(255,255,255,0.05)]
        hover:shadow-[0_6px_20px_rgba(255,255,255,0.12)]
        transition-all duration-300
        cursor-pointer
        w-full max-w-[260px]
      "
    >
      <div
        className="
          rounded-3xl bg-[#111]
          flex flex-col
          px-5 py-4
          text-gray-100
          group-hover:bg-[#151515]
          transition-colors duration-300
          
          /* Esto asegura que la card CREZCA si es necesario */
          w-full min-h-[130px] 
        "
      >
<div
  className="
    flex flex-wrap 
    items-start 
    justify-between 
    w-full 
    gap-x-2 gap-y-2
  "
>
  {/* TÍTULO → ocupa todo el espacio disponible */}
  <h3
    className="
      font-semibold text-base leading-snug
      flex-1 min-w-[120px]    /* 🔥 evita romperse en pantallas pequeñas */
      break-words whitespace-normal
    "
  >
    {nombre}
  </h3>

  {/* PRECIO → se acomoda arriba si hay espacio, sino baja */}
  <span
    className="
      px-3 py-1 rounded-full text-xs font-semibold shrink-0
      text-white bg-white/10 border border-white/30
      shadow-[0_0_6px_rgba(255,255,255,0.4)]
    "
  >
    ${precio}
  </span>
</div>


        {/* Duración */}
        <p className="text-xs text-gray-400 mt-4">
          {duracion ? `${duracion} min aprox.` : "Duración variable"}
        </p>
      </div>
    </div>
  );
};

export default function Pruebass() {
  return (
    <div
      className="
        w-full
        grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
        gap-8 mt-10 place-items-center
      "
    >
      <CardServicioPrueba nombre="Corte de pelo" precio={250} duracion={30} />
      <CardServicioPrueba nombre="Barba y cejas" precio={150} duracion={20} />
    </div>
  );
}
