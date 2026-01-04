import React, { useState, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { 
  UserPlus, 
  Settings, 
  Share2, 
  CalendarCheck, 
  Eye, 
  CheckCircle,
  ArrowRight
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Step {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
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
    }, { threshold: 0.2, ...options });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return [ref, isInView];
};

// Componente para cada paso
const StepCard: React.FC<{ step: Step; index: number; isLast: boolean }> = ({ step, index, isLast }) => {
  const [ref, isInView] = useInView<HTMLDivElement>();
  const Icon = step.icon;

  return (
    <div className="relative flex flex-col items-center">
      {/* Línea conectora (no en el último) */}
      {!isLast && (
        <div className="hidden lg:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-80px)] h-[2px]">
          <div 
            className={`
              h-full bg-gradient-to-r from-violet-300 to-purple-300
              transition-all duration-1000 ease-out
              ${isInView ? 'w-full opacity-100' : 'w-0 opacity-0'}
            `}
            style={{ transitionDelay: `${index * 200 + 400}ms` }}
          />
        </div>
      )}

      {/* Card del paso */}
      <div
        ref={ref}
        className={`
          relative flex flex-col items-center text-center
          transition-all duration-700 ease-out
          ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        `}
        style={{ transitionDelay: `${index * 150}ms` }}
      >
        {/* Número y círculo con icono */}
        <div className="relative mb-4 sm:mb-6">
          {/* Número pequeño */}
          <span 
            className={`
              absolute -top-2 -right-2 w-6 h-6 sm:w-7 sm:h-7
              rounded-full bg-gradient-to-br from-violet-500 to-purple-500
              text-white text-xs sm:text-sm font-bold
              flex items-center justify-center
              shadow-lg shadow-violet-500/30
              z-10
            `}
          >
            {step.number}
          </span>

          {/* Círculo con icono */}
          <div 
            className={`
              w-16 h-16 sm:w-20 sm:h-20
              rounded-2xl sm:rounded-3xl
              bg-white
              border-2 border-violet-100
              flex items-center justify-center
              shadow-[0_8px_30px_rgb(0,0,0,0.08)]
              group-hover:shadow-[0_12px_40px_rgb(139,92,246,0.15)]
              transition-all duration-300
            `}
          >
            <Icon className="w-7 h-7 sm:w-9 sm:h-9 text-violet-600" strokeWidth={1.5} />
          </div>
        </div>

        {/* Contenido */}
        <div className="max-w-[200px] sm:max-w-[240px]">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
            {step.title}
          </h3>
          <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
            {step.description}
          </p>
        </div>
      </div>

      {/* Flecha móvil (solo visible en móvil, no en el último) */}
      {!isLast && (
        <div 
          className={`
            lg:hidden my-4 sm:my-6
            transition-all duration-500
            ${isInView ? 'opacity-100' : 'opacity-0'}
          `}
          style={{ transitionDelay: `${index * 150 + 300}ms` }}
        >
          <ArrowRight className="w-5 h-5 text-violet-300 rotate-90" />
        </div>
      )}
    </div>
  );
};

export default function ComoFunciona() {
  const [titleRef, titleInView] = useInView<HTMLDivElement>();
  const [noteRef, noteInView] = useInView<HTMLDivElement>();

  const steps: Step[] = [
    {
      number: 1,
      icon: UserPlus,
      title: "Creá tu agenda",
      description: "Registrate gratis y obtené 1 mes de prueba sin compromiso",
    },
    {
      number: 2,
      icon: Settings,
      title: "Configurá todo",
      description: "Agregá servicios, precios, horarios, fotos y descripción",
    },
    {
      number: 3,
      icon: Share2,
      title: "Compartí tu link",
      description: "Envialo por WhatsApp, Instagram o generá un código QR",
    },
    {
      number: 4,
      icon: CalendarCheck,
      title: "Recibí turnos",
      description: "Tus clientes se agendan solos, 24/7, sin que hagas nada",
    },
    {
      number: 5,
      icon: Eye,
      title: "Mirá en tiempo real",
      description: "Visualizá quién se agendó, cuándo y qué servicio eligió",
    },
    {
      number: 6,
      icon: CheckCircle,
      title: "Validá y listo",
      description: "Marcá el turno como atendido y se suma a tus estadísticas",
    },
  ];

  return (
    <section className="bg-gradient-to-b from-purple-50/20 via-white to-violet-50/20 py-2 sm:py-5 relative overflow-hidden">
      {/* Decoración de fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-gradient-to-br from-violet-300/10 to-purple-200/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-gradient-to-br from-purple-300/10 to-fuchsia-200/10 rounded-full blur-3xl"></div>
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
            text-center mb-12 sm:mb-20
            transition-all duration-1000
            ${titleInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
          `}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-violet-100 text-violet-700 text-sm font-medium mb-4">
            Súper fácil
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tight mb-4 sm:mb-6">
            ¿Cómo{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600">
              funciona
            </span>
            ?
          </h2>
          <p className="text-base sm:text-xl text-gray-500 max-w-2xl mx-auto">
            En solo 6 pasos tenés tu agenda online funcionando 🎯
          </p>
        </div>

        {/* Grid de pasos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 lg:gap-4">
          {steps.map((step, index) => (
            <StepCard 
              key={step.number} 
              step={step} 
              index={index}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>

        {/* Nota final */}
        <div
          ref={noteRef}
          className={`
            mt-12 sm:mt-16 text-center
            transition-all duration-700
            ${noteInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
          `}
        >
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-6 px-6 py-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-violet-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
            <div className="flex items-center gap-2 text-sm sm:text-base text-gray-600">
              <span className="text-lg">💻</span>
              <span>Funciona desde el navegador</span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-violet-200"></div>
            <div className="flex items-center gap-2 text-sm sm:text-base text-gray-600">
              <span className="text-lg">📱</span>
              <span>No necesitás instalar nada</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}