// src/components/barberia/SobreNosotros.tsx
import React, { useEffect } from "react";
import { fuentesMap } from "../../lib/fonts";
import { animateSobreNosotrosImages } from "../../lib/gsapAnimations";

type Props = {
  fuenteTexto?: string;
  fuenteBotones?: string;
};

export default function SobreNosotros({
  fuenteTexto = "raleway",
  fuenteBotones = "poppins",
}: Props) {
  useEffect(() => {
    animateSobreNosotrosImages();
  }, []);

  return (
    <section className="py-20 px-6 md:px-12 lg:px-24 bg-white">
      <div className="grid md:grid-cols-2 gap-12 items-start">
        {/* Columna izquierda - galería de imágenes */}
        <div className="grid grid-cols-2 gap-4">
          <img
            src="/img/barberia5.jpg"
            alt="Barbería 1"
            className="sobre-nosotros-img w-full h-60 object-cover rounded-lg shadow-md"
          />
          <img
            src="/img/barberia6.jpg"
            alt="Barbería 2"
            className="sobre-nosotros-img w-full h-60 object-cover rounded-lg shadow-md"
          />
          <img
            src="/img/barberia8.jpg"
            alt="Barbería 3"
            className="sobre-nosotros-img col-span-2 w-full h-72 object-cover rounded-lg shadow-md"
          />
        </div>

        {/* Columna derecha - texto */}
        <div>
          <span
            className={`uppercase text-sm tracking-widest text-black flex items-center ${fuentesMap[fuenteTexto]}`}
          >
            <span className="w-10 h-[2px] bg-black mr-2"></span>
            Sobre nosotros
          </span>
          <h2
            className={`text-3xl md:text-4xl font-bold mt-4 ${fuentesMap[fuenteTexto]}`}
          >
            Desde 2019, cuidando de vos.
          </h2>
          <p
            className={`mt-4 text-gray-600 leading-relaxed ${fuentesMap[fuenteTexto]}`}
          >
            En nuestra barbería, mezclamos tradición y vanguardia para darte una
            experiencia única. Más que un lugar para cortarte el pelo, somos un
            espacio pensado en vos. Acá los detalles cuentan, el estilo se
            define, y lo más importante: que te vayas contento y te sientas
            bien.
          </p>
          <p
            className={`mt-2 text-gray-600 leading-relaxed ${fuentesMap[fuenteTexto]}`}
          >
            Creemos que tu look dice mucho de vos, y estamos para ayudarte a que
            te represente bien.
          </p>
          <button
            className={`mt-6 px-6 py-3 bg-black text-white rounded-lg shadow hover:bg-gray-800 transition ${fuentesMap[fuenteBotones]}`}
          >
            Ver cortes
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="mt-16 grid sm:grid-cols-3 gap-6 text-center">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-2xl font-bold text-black">1,500+</h3>
          <p className={`text-gray-600 mt-1 ${fuentesMap[fuenteTexto]}`}>
            Clientes satisfechos
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-2xl font-bold text-black">50+</h3>
          <p className={`text-gray-600 mt-1 ${fuentesMap[fuenteTexto]}`}>
            Servicios diarios
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-2xl font-bold text-black">10+</h3>
          <p className={`text-gray-600 mt-1 ${fuentesMap[fuenteTexto]}`}>
            Barberos profesionales
          </p>
        </div>
      </div>
    </section>
  );
}
