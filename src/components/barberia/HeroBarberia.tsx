import React, { useEffect, useState } from "react";
import { fuentesMap } from "../../lib/fonts"; // ✅ Importar mapa de fuentes

type Props = {
  images: string[];
  nombre: string;
  eslogan?: string; // 👈 añadimos eslogan
  fuenteLogo?: string;
  fuenteTexto?: string;
  fuenteBotones?: string;
};

export default function HeroBarberia({
  images,
  nombre,
  eslogan = "Cortes modernos, clásicos y a tu medida", // 👈 valor por defecto
  fuenteLogo = "montserrat",
  fuenteTexto = "raleway",
  fuenteBotones = "poppins",
}: Props) {
  const [current, setCurrent] = useState(0);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setZoom(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setZoom(false);
      setCurrent((prev) => (prev + 1) % images.length);
      setTimeout(() => setZoom(true), 100);
    }, 6000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <section className="relative w-full h-[80vh] overflow-hidden">
      {images.map((img, i) => (
        <div
          key={i}
          className={`absolute top-0 left-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src={img}
            alt={`slide-${i}`}
            className={`w-full h-full object-cover transition-transform duration-[6000ms] ease-in-out ${
              i === current && zoom ? "scale-110" : "scale-100"
            }`}
          />
        </div>
      ))}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Texto */}
      <div className="absolute inset-0 flex flex-col justify-center items-center text-center text-white z-10">
        <h1 className={`text-4xl md:text-6xl font-bold ${fuentesMap[fuenteLogo]}`}>
          Bienvenido a {nombre}
        </h1>

        <p className={`mt-4 text-lg md:text-2xl ${fuentesMap[fuenteTexto]}`}>
          {eslogan}
        </p>

        <a
          href="#reservar"
          className={`mt-6 inline-block px-6 py-3 rounded-xl font-semibold transition bg-yellow-500 text-black hover:bg-yellow-600 ${fuentesMap[fuenteBotones]}`}
        >
          Reservar cita
        </a>
      </div>
    </section>
  );
}
