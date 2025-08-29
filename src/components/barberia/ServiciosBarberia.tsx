// src/components/barberia/ServiciosBarberia.tsx
import React from "react";
import { Scissors, User, Sparkles, Droplets, Package, Baby } from "lucide-react"; 

type Servicio = {
  icon: React.ReactNode;
  titulo: string;
  descripcion: string;
};

const servicios: Servicio[] = [
  {
    icon: <Scissors className="w-8 h-8 text-orange-600" />,
    titulo: "Corte de Cabello",
    descripcion: "Desde estilos tradicionales hasta los más modernos.",
  },
  {
    icon: <User className="w-8 h-8 text-orange-600" />,
    titulo: "Arreglo de Barba",
    descripcion: "Perfeccioná tu look con un perfilado profesional.",
  },
  {
    icon: <Sparkles className="w-8 h-8 text-orange-600" />,
    titulo: "Afeitado Clásico",
    descripcion: "Una experiencia tradicional para un afeitado suave.",
  },
  {
    icon: <Droplets className="w-8 h-8 text-orange-600" />,
    titulo: "Tratamientos Capilares",
    descripcion: "Fortalecé y revitalizá tu cabello.",
  },
  {
    icon: <Package className="w-8 h-8 text-orange-600" />,
    titulo: "Paquetes Completos",
    descripcion: "Incluyen corte, barba y tratamiento.",
  },
  {
    icon: <Baby className="w-8 h-8 text-orange-600" />,
    titulo: "Corte Infantil",
    descripcion: "Para los pequeños.",
  },
];

export default function ServiciosBarberia() {
  console.log("✅ Renderizando ServiciosBarberia");

  return (
    <section id="servicios" className="mt-20 py-20 px-6 md:px-12 lg:px-24 bg-white">
      {/* Encabezado */}
      <div className="text-center mb-12">
        <span className="uppercase text-sm tracking-widest text-orange-600 flex items-center justify-center">
          <span className="w-10 h-[2px] bg-orange-600 mr-2"></span>
          Nuestros servicios
        </span>
        <h2 className="text-3xl md:text-4xl font-bold mt-4">
          Descubrí todo lo que tenemos para vos
        </h2>
      </div>

      {/* Grid de servicios */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {servicios.map((s, i) => (
          <div
            key={i}
            className="bg-white border border-gray-100 shadow-md rounded-xl p-6 text-center hover:shadow-lg transition"
          >
            <div className="flex justify-center mb-4">
              <div className="border-2 border-orange-600 rounded-lg p-3">
                {s.icon}
              </div>
            </div>
            <h3 className="text-lg font-semibold">{s.titulo}</h3>
            <p className="text-gray-600 mt-2">{s.descripcion}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
