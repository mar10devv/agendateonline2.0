import React, { useState, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { 
  MapPin, 
  BarChart3, 
  Palette, 
  Users,
  Sparkles
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  items: string[];
  gradient: string;
  shadowColor: string;
}

// Hook para detectar visibilidad
const useInView = <T extends HTMLElement>(options: IntersectionObserverInit = {}): [RefObject<T | null>, boolean] => {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.15, ...options });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return [ref, isInView];
};

// Componente para cada feature card
const FeatureCard: React.FC<{ feature: Feature; index: number }> = ({ feature, index }) => {
  const [ref, isInView] = useInView<HTMLDivElement>();
  const Icon = feature.icon;

  return (
    <div
      ref={ref}
      className={`
        group relative
        bg-white/80 backdrop-blur-sm
        rounded-2xl sm:rounded-3xl
        p-5 sm:p-8
        border border-white/60
        shadow-[0_8px_30px_rgb(0,0,0,0.06)]
        hover:shadow-[0_20px_50px_rgb(0,0,0,0.1)]
        ${feature.shadowColor}
        transition-all duration-500 ease-out
        hover:-translate-y-2
        overflow-hidden
        ${isInView 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-12'
        }
      `}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Efecto de brillo en hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-5`}></div>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"></div>
      </div>

      {/* Decoración de esquina */}
      <div 
        className={`
          absolute -top-20 -right-20 w-40 h-40 
          bg-gradient-to-br ${feature.gradient} 
          opacity-10 rounded-full blur-3xl
          group-hover:opacity-20 transition-opacity duration-500
        `}
      />

      <div className="relative z-10">
        {/* Icono */}
        <div 
          className={`
            w-12 h-12 sm:w-16 sm:h-16
            rounded-xl sm:rounded-2xl
            bg-gradient-to-br ${feature.gradient}
            flex items-center justify-center
            mb-4 sm:mb-6
            shadow-lg
            group-hover:scale-110 group-hover:rotate-3
            transition-all duration-500
          `}
        >
          <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" strokeWidth={1.5} />
        </div>

        {/* Título y descripción */}
        <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
          {feature.title}
        </h3>
        <p className="text-gray-500 text-sm sm:text-base mb-4 sm:mb-6 leading-relaxed">
          {feature.description}
        </p>

        {/* Lista de items */}
        <ul className="space-y-2 sm:space-y-3">
          {feature.items.map((item, i) => (
            <li 
              key={i}
              className={`
                flex items-start gap-2 sm:gap-3 text-xs sm:text-base text-gray-600
                transition-all duration-300
                ${isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}
              `}
              style={{ transitionDelay: `${index * 100 + i * 80 + 200}ms` }}
            >
              <span className={`
                flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full 
                bg-gradient-to-br ${feature.gradient}
                flex items-center justify-center mt-0.5
              `}>
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default function Funcionalidades() {
  const [titleRef, titleInView] = useInView<HTMLDivElement>();

  const features: Feature[] = [
    {
      icon: MapPin,
      title: "Ubicación y servicios",
      description: "Mostrá toda la información de tu negocio en un solo lugar",
      items: [
        "Ubicación en tiempo real con mapa integrado",
        "Lista de servicios con precios visibles",
        "Horarios de atención siempre actualizados",
        "Información de contacto y redes sociales"
      ],
      gradient: "from-violet-500 to-purple-500",
      shadowColor: "hover:shadow-violet-500/20"
    },
    {
      icon: BarChart3,
      title: "Horarios y estadísticas",
      description: "Controlá tu tiempo y medí el rendimiento de tu negocio",
      items: [
        "Configurá horarios de atención flexibles",
        "Definí días libres y feriados fácilmente",
        "Mirá cuánto dinero generaste por día, semana o mes",
        "Descubrí tu servicio más vendido y empleado estrella"
      ],
      gradient: "from-purple-500 to-fuchsia-500",
      shadowColor: "hover:shadow-purple-500/20"
    },
    {
      icon: Palette,
      title: "Personalización total",
      description: "Hacé que tu agenda refleje la identidad de tu marca",
      items: [
        "Elegí los colores que combinan con tu negocio",
        "Subí tu logo o foto de perfil",
        "Escribí una descripción atractiva",
        "Tu agenda se ve única y profesional"
      ],
      gradient: "from-fuchsia-500 to-pink-500",
      shadowColor: "hover:shadow-fuchsia-500/20"
    },
    {
      icon: Users,
      title: "Gestión de empleados",
      description: "Organizá a tu equipo con total flexibilidad",
      items: [
        "Horario de entrada, salida y descanso por empleado",
        "Días libres individuales (incluso día y medio)",
        "Asigná servicios específicos a cada uno",
        "Foto de perfil para que los clientes los reconozcan",
        "Activá o desactivá empleados sin borrarlos"
      ],
      gradient: "from-violet-600 to-purple-600",
      shadowColor: "hover:shadow-violet-600/20"
    }
  ];

  return (
    <section className="bg-gradient-to-b from-violet-50/20 via-white to-purple-50/30 py-5 sm:py-5 relative overflow-hidden">
{/* Decoración de fondo */}
<div className="absolute inset-0 pointer-events-none">
  <div className="absolute top-1/4 left-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-gradient-to-br from-violet-300/10 to-purple-200/10 rounded-full blur-3xl"></div>
  <div className="absolute bottom-1/4 right-0 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-gradient-to-br from-fuchsia-300/10 to-pink-200/10 rounded-full blur-3xl"></div>
</div>

{/* Patrón de puntos */}
<div 
  className="absolute inset-0 pointer-events-none z-0"
  style={{
    backgroundImage: 'radial-gradient(#8b5cf6 1.5px, transparent 1.5px)',
    backgroundSize: '30px 30px',
    opacity: 0.1
  }}
/>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Título */}
        <div
          ref={titleRef}
          className={`
            text-center mb-12 sm:mb-16
            transition-all duration-1000
            ${titleInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
          `}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-100 text-violet-700 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Todo incluido
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tight mb-4 sm:mb-6">
            Funciones{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600">
              principales
            </span>
          </h2>
          <p className="text-base sm:text-xl text-gray-500 max-w-2xl mx-auto">
            Todo lo que necesitás para gestionar tu negocio de forma profesional ⚡
          </p>
        </div>

        {/* Grid de features - 2 columnas desde sm */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}