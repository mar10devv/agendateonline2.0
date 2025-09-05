// src/components/barberia/ServiciosBarberia.tsx
import React, { useEffect } from "react";
import { Scissors, User, Sparkles, Droplets, Package, Baby } from "lucide-react";
import { fuentesMap } from "../../lib/fonts";
import { registerGsapPlugins, animateCardsCascadeOnScroll } from "../../lib/gsapAnimations";

type Props = {
  fuenteTexto?: string;
  fuenteBotones?: string;
};

type Servicio = {
  icon: React.ReactNode;
  titulo: string;
  descripcion: string;
};

const servicios: Servicio[] = [
  {
    icon: <Scissors className="w-8 h-8 text-black servicio-icon" />,
    titulo: "Corte de Cabello",
    descripcion: "Desde estilos tradicionales hasta los más modernos.",
  },
  {
    icon: <User className="w-8 h-8 text-black servicio-icon" />,
    titulo: "Arreglo de Barba",
    descripcion: "Perfeccioná tu look con un perfilado profesional.",
  },
  {
    icon: <Sparkles className="w-8 h-8 text-black servicio-icon" />,
    titulo: "Afeitado Clásico",
    descripcion: "Una experiencia tradicional para un afeitado suave.",
  },
  {
    icon: <Droplets className="w-8 h-8 text-black servicio-icon" />,
    titulo: "Tratamientos Capilares",
    descripcion: "Fortalecé y revitalizá tu cabello.",
  },
  {
    icon: <Package className="w-8 h-8 text-black servicio-icon" />,
    titulo: "Paquetes Completos",
    descripcion: "Incluyen corte, barba y tratamiento.",
  },
  {
    icon: <Baby className="w-8 h-8 text-black servicio-icon" />,
    titulo: "Corte Infantil",
    descripcion: "Para los pequeños.",
  },
];

export default function ServiciosBarberia({
  fuenteTexto = "raleway",
  fuenteBotones = "poppins",
}: Props) {
  useEffect(() => {
    const initAnimations = async () => {
      await registerGsapPlugins(); // 👈 registrar primero
      animateCardsCascadeOnScroll(".servicio-card"); // 👈 luego correr animación
    };
    initAnimations();
  }, []);

  return (
    <section id="servicios" className="mt-8 py-12 px-6 md:px-12 lg:px-24 bg-white">
      {/* Encabezado alineado a la izquierda */}
      <div className="mb-12">
        <span
          className={`uppercase text-sm tracking-widest text-black flex items-center ${fuentesMap[fuenteTexto]}`}
        >
          <span className="w-10 h-[2px] bg-black mr-2"></span>
          Nuestros servicios
        </span>
        <h2
          className={`text-3xl md:text-4xl font-bold mt-4 ${fuentesMap[fuenteTexto]}`}
        >
          Descubrí todo lo que tenemos para vos
        </h2>
      </div>

      {/* Grid de servicios */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {servicios.map((s, i) => (
          <div
            key={i}
  className="servicio-card bg-white border border-gray-100 shadow-md rounded-xl 
             p-8 text-center cursor-pointer
             transform transition duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="flex justify-center mb-4">
              <div className="border-2 border-black rounded-lg p-4 flex items-center justify-center">
                {s.icon}
              </div>
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${fuentesMap[fuenteTexto]}`}>
              {s.titulo}
            </h3>
            <p className={`text-gray-600 ${fuentesMap[fuenteTexto]}`}>
              {s.descripcion}
            </p>
            <button
              className={`mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition ${fuentesMap[fuenteBotones]}`}
            >
              Reservar
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
