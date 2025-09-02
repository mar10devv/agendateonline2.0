import React, { useEffect, useState } from "react";
import { fuentesMap } from "../../lib/fonts";

type BannerImage = string | { url: string; deleteUrl?: string };

type Props = {
  images?: BannerImage[];
  nombre: string;
  eslogan?: string;
  fuenteLogo?: string;
  fuenteTexto?: string;
  fuenteBotones?: string;
  modoImagenes?: "defecto" | "personalizado"; // 👈 agregado
};

export default function HeroBarberia({
  images = [],
  nombre,
  eslogan = "Cortes modernos, clásicos y a tu medida",
  fuenteLogo = "montserrat",
  fuenteTexto = "raleway",
  fuenteBotones = "poppins",
  modoImagenes = "defecto", // 👈 valor por defecto
}: Props) {
  const [current, setCurrent] = useState(0);
  const [zoom, setZoom] = useState(false);

  // 👇 imágenes por defecto
  const IMAGENES_DEFECTO = ["/img/1.jpeg", "/img/2.jpg", "/img/3.jpg"];

  // 👇 decisión según modo
  const imagenes =
    modoImagenes === "personalizado" && images && images.length > 0
      ? images
          .filter((img) => img !== null)
          .map((img) =>
            typeof img === "string" ? img : (img as { url: string }).url
          )
      : IMAGENES_DEFECTO;

  // Efecto inicial de zoom
  useEffect(() => {
    const timer = setTimeout(() => setZoom(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Cambio de imagen cada 6s
  useEffect(() => {
    const interval = setInterval(() => {
      setZoom(false);
      setCurrent((prev) => (prev + 1) % imagenes.length);
      setTimeout(() => setZoom(true), 100);
    }, 6000);
    return () => clearInterval(interval);
  }, [imagenes.length]);

  return (
    <section className="relative w-full h-[80vh] overflow-hidden">
      {imagenes.map((img, i) => (
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
  <h1 className="text-7xl sm:text-9xl md:text-9xl lg:text-9xl font-bold font-euphoria tracking-wide">
  {nombre}
</h1>


  <p className={`mt-4 text-lg md:text-2xl ${fuentesMap[fuenteTexto]}`}>
    {eslogan}
  </p>

  <a
  href="#agendar-turno"
  className={`mt-6 inline-block px-8 py-3 rounded-lg font-semibold transition 
              bg-black text-white hover:bg-gray-800 active:scale-95 shadow-sm
              ${fuentesMap[fuenteBotones]}`}
>
  Reservar cita
</a>

</div>

    </section>
  );
}
