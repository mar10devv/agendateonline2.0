// src/components/barberia/SobreNosotros.tsx
import React, { useEffect, useRef } from "react";
import { fuentesMap } from "../../lib/fonts";
import {
  registerGsapPlugins,
  animateSobreNosotrosImages,
} from "../../lib/gsapAnimations";
import { animateCounterOnScroll } from "../../lib/animaciones";


type Imagen = {
  url: string;
};

type Props = {
  fuenteTexto?: string;
  fuenteBotones?: string;
  sobreNosotrosImages?: Imagen[];
  modoSobreNosotros?: "defecto" | "personalizado";
};

export default function SobreNosotros({
  fuenteTexto = "raleway",
  fuenteBotones = "poppins",
  sobreNosotrosImages = [],
  modoSobreNosotros = "defecto",
}: Props) {
  const clientesRef = useRef<HTMLHeadingElement>(null);
  const serviciosRef = useRef<HTMLHeadingElement>(null);
  const barberosRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const initAnimations = async () => {
      await registerGsapPlugins();
      animateSobreNosotrosImages();

      // 👇 animar contadores
      if (clientesRef.current) animateCounterOnScroll(clientesRef.current, 1500, 2);
    if (serviciosRef.current) animateCounterOnScroll(serviciosRef.current, 50, 2);
    if (barberosRef.current) animateCounterOnScroll(barberosRef.current, 10, 2);
    };
    initAnimations();
  }, []);

  // 👇 elegir imágenes a mostrar
  const imagenesMostrar =
    modoSobreNosotros === "defecto"
      ? ["/img/barberia5.jpg", "/img/barberia6.jpg", "/img/barberia8.jpg"]
      : sobreNosotrosImages
          .map((img: any) =>
            img?.url && img.url.includes("i.ibb.co") ? img.url : null
          )
          .filter(Boolean);

  return (
    <section className="px-6 md:px-12 lg:px-24 bg-white">
      <div className="grid md:grid-cols-2 gap-12 items-start">
        {/* Columna izquierda - galería de imágenes */}
        <div className="grid grid-cols-2 gap-4">
          {imagenesMostrar.slice(0, 3).map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`sobre-nosotros-${i}`}
              className={`sobre-nosotros-img w-full object-cover rounded-lg shadow-md ${
                i === 2 ? "col-span-2 h-72" : "h-60"
              }`}
            />
          ))}
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
            Cada detalle importa, porque un buen corte habla antes que las
            palabras.
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
        </div>
      </div>

      {/* Estadísticas */}
      <div className="mt-16 grid sm:grid-cols-3 gap-6 text-center">
        <div className="bg-white shadow-xl shadow-gray-400/70 rounded-lg p-6">
          <h3 ref={clientesRef} className="text-2xl font-bold text-black">
            0
          </h3>
          <p className={`text-gray-600 mt-1 ${fuentesMap[fuenteTexto]}`}>
            Clientes satisfechos
          </p>
        </div>
        <div className="bg-white shadow-xl shadow-gray-400/70 rounded-lg p-6">
          <h3 ref={serviciosRef} className="text-2xl font-bold text-black">
            0
          </h3>
          <p className={`text-gray-600 mt-1 ${fuentesMap[fuenteTexto]}`}>
            Servicios diarios
          </p>
        </div>
        <div className="bg-white shadow-xl shadow-gray-400/70 rounded-lg p-6">
          <h3 ref={barberosRef} className="text-2xl font-bold text-black">
            0
          </h3>
          <p className={`text-gray-600 mt-1 ${fuentesMap[fuenteTexto]}`}>
            Barberos profesionales
          </p>
        </div>
      </div>
    </section>
  );
}
