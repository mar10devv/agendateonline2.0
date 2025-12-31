import React, { useState, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { Users, Store, Briefcase, Calendar, Search, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Tipos
interface StatItem {
  icon: LucideIcon;
  number: string;
  label: string;
  color: string;
}

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface StatCardProps {
  stat: StatItem;
  index: number;
}

interface FeatureItemProps {
  item: FeatureItem;
  index: number;
  colorScheme: 'blue' | 'purple';
}

// Hook personalizado para detectar cuando un elemento es visible
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

// Hook para animar números
const useCountUp = (end: string, isInView: boolean, duration: number = 2000): string => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!isInView) return;
    
    const numericEnd = parseInt(end.replace(/[^0-9]/g, ''));
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * numericEnd));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [isInView, end, duration]);
  
  return count.toLocaleString();
};

// Componente para cada stat card con animación
const StatCard: React.FC<StatCardProps> = ({ stat, index }) => {
  const [ref, isInView] = useInView<HTMLDivElement>();
  const animatedNumber = useCountUp(stat.number, isInView);
  const Icon = stat.icon;
  const suffix = stat.number.includes('+') ? '+' : '';
  
  // Colores de sombra según el gradiente de cada card
  const shadowColors: Record<string, string> = {
    "from-blue-500 to-cyan-400": "hover:shadow-blue-500/25",
    "from-purple-500 to-pink-400": "hover:shadow-purple-500/25",
    "from-indigo-500 to-blue-400": "hover:shadow-indigo-500/25",
  };
  
  const hoverShadow = shadowColors[stat.color] || "hover:shadow-gray-500/25";
  
  return (
    <div
      ref={ref}
      className={`
        relative
        bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl lg:rounded-2xl p-5 sm:p-8 lg:p-5
        shadow-[0_4px_20px_rgb(0,0,0,0.08)] 
        hover:shadow-[0_20px_40px_rgb(0,0,0,0.12)]
        ${hoverShadow}
        transition-all duration-500 ease-out
        border border-white/60
        group cursor-pointer
        hover:-translate-y-2
        overflow-hidden
        ${isInView 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-12'
        }
      `}
      style={{ 
        transitionDelay: `${index * 150}ms`,
        transitionProperty: 'all'
      }}
    >
      {/* Efecto de brillo en hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-transparent"></div>
      </div>
      
      {/* Borde gradiente sutil */}
      <div className="absolute inset-0 rounded-2xl sm:rounded-3xl lg:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className={`absolute inset-0 rounded-2xl sm:rounded-3xl lg:rounded-2xl bg-gradient-to-br ${stat.color} opacity-10`}></div>
      </div>

      <div className="relative z-10">
        <div
          className={`
            w-14 h-14 sm:w-20 sm:h-20 lg:w-14 lg:h-14 
            rounded-xl sm:rounded-2xl lg:rounded-xl 
            bg-gradient-to-br ${stat.color} 
            flex items-center justify-center mb-4 sm:mb-6 lg:mb-3 mx-auto 
            shadow-lg
            group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-xl
            transition-all duration-500 ease-out
          `}
        >
          <Icon className="w-7 h-7 sm:w-10 sm:h-10 lg:w-7 lg:h-7 text-white drop-shadow-sm" strokeWidth={1.5} />
        </div>
        <h3 className="text-3xl sm:text-5xl lg:text-3xl font-black text-gray-900 text-center mb-2 sm:mb-3 lg:mb-1 tracking-tight group-hover:text-gray-800 transition-colors">
          {animatedNumber}{suffix}
        </h3>
        <p className="text-gray-500 text-center font-medium text-sm sm:text-lg lg:text-sm group-hover:text-gray-600 transition-colors">
          {stat.label}
        </p>
      </div>
    </div>
  );
};

// Componente para items de features
const FeatureItemComponent: React.FC<FeatureItemProps> = ({ item, index, colorScheme }) => {
  const [ref, isInView] = useInView<HTMLDivElement>();
  const Icon = item.icon;
  
  const colors = {
    blue: {
      hover: 'hover:bg-blue-50/80',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    purple: {
      hover: 'hover:bg-purple-50/80',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    }
  };
  
  const scheme = colors[colorScheme];
  
  return (
    <div
      ref={ref}
      className={`
        flex gap-3 sm:gap-5 p-3 sm:p-5 rounded-xl sm:rounded-2xl ${scheme.hover}
        transition-all duration-500 cursor-pointer
        group
        ${isInView 
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 -translate-x-8'
        }
      `}
      style={{ transitionDelay: `${index * 100 + 200}ms` }}
    >
      <div className="flex-shrink-0">
        <div className={`
          w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ${scheme.iconBg} 
          flex items-center justify-center
          group-hover:scale-110 transition-transform duration-300
        `}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${scheme.iconColor}`} />
        </div>
      </div>
      <div>
        <h4 className="font-bold text-gray-800 mb-1 text-base sm:text-lg">
          {item.title}
        </h4>
        <p className="text-gray-500 leading-relaxed text-sm sm:text-base">
          {item.description}
        </p>
      </div>
    </div>
  );
};

// Componente principal
export default function AgendateOnlineInfo() {
  const [titleRef, titleInView] = useInView<HTMLDivElement>();
  const [clientsRef, clientsInView] = useInView<HTMLDivElement>();
  const [businessRef, businessInView] = useInView<HTMLDivElement>();
  const [ctaRef, ctaInView] = useInView<HTMLDivElement>();

  const stats: StatItem[] = [
    {
      icon: Users,
      number: "15000+",
      label: "Usuarios Activos",
      color: "from-blue-500 to-cyan-400",
    },
    {
      icon: Store,
      number: "850+",
      label: "Negocios Activos",
      color: "from-purple-500 to-pink-400",
    },
    {
      icon: Briefcase,
      number: "1200+",
      label: "Emprendimientos Activos",
      color: "from-indigo-500 to-blue-400",
    },
  ];

  const forClients: FeatureItem[] = [
    {
      icon: Search,
      title: "Busca fácilmente",
      description: "Encuentra negocios locales y servicios cercanos en segundos",
    },
    {
      icon: Calendar,
      title: "Reserva al instante",
      description: "Agenda tu turno en cualquier momento, sin llamadas ni esperas",
    },
    {
      icon: Clock,
      title: "Gestiona tus turnos",
      description: "Revisa, modifica o cancela tus reservas desde tu dispositivo",
    },
  ];

  const forBusinesses: FeatureItem[] = [
    {
      icon: Users,
      title: "Gestiona tu equipo",
      description: "Organiza empleados, horarios y disponibilidad en un solo lugar",
    },
    {
      icon: Calendar,
      title: "Controla tu agenda",
      description: "Visualiza todas tus reservas y optimiza tu tiempo",
    },
    {
      icon: Store,
      title: "Crece tu negocio",
      description: "Atrae más clientes y profesionaliza tu imagen online",
    },
  ];

  return (
    <section className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 py-12 sm:py-24 relative overflow-hidden">
{/* Decoración de fondo mejorada */}
<div className="absolute inset-0 overflow-hidden">
  <div className="absolute top-32 sm:top-40 left-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-gradient-to-br from-blue-400/15 to-cyan-300/15 rounded-full blur-3xl animate-pulse"></div>
  <div className="absolute bottom-20 right-1/4 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-gradient-to-br from-purple-400/15 to-pink-300/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[800px] h-[500px] sm:h-[800px] bg-gradient-to-br from-indigo-200/5 to-transparent rounded-full blur-3xl"></div>
  
  {/* Patrón de puntos */}
  <div 
    className="absolute inset-0 opacity-[0.03]"
    style={{
      backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
      backgroundSize: '30px 30px'
    }}
  ></div>
</div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Título con animación */}
        <div
          ref={titleRef}
          className={`
            transition-all duration-1000
            ${titleInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
          `}
        >
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black mb-4 sm:mb-6 text-gray-900 text-center tracking-tight">
            ¿Qué es{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
              AgéndateOnline
            </span>
            ?
          </h2>

          <p className="text-base sm:text-xl md:text-2xl text-gray-500 text-center max-w-3xl mx-auto mb-12 sm:mb-20 font-light px-2">
            La plataforma que conecta clientes con negocios locales en segundos 🚀
          </p>
        </div>

        {/* Cards de estadísticas - 2 columnas en móvil, 3 en desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 lg:gap-5 mb-12 sm:mb-24 lg:mb-16">
          {stats.map((stat, index) => (
            <StatCard key={index} stat={stat} index={index} />
          ))}
        </div>

        {/* Secciones explicativas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
          {/* Para Clientes */}
          <div
            ref={clientsRef}
            className={`
              bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-[2rem] p-6 sm:p-10 
              shadow-[0_8px_30px_rgb(0,0,0,0.06)] 
              border border-white/80
              transition-all duration-700
              ${clientsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}
            `}
          >
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-8">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                Para Clientes
              </h3>
            </div>
            <p className="text-gray-500 mb-4 sm:mb-8 leading-relaxed text-base sm:text-lg">
              Reserva turnos de forma rápida y sencilla desde cualquier
              dispositivo 📱💻
            </p>
            <div className="space-y-1 sm:space-y-2">
              {forClients.map((item, index) => (
                <FeatureItemComponent 
                  key={index} 
                  item={item} 
                  index={index} 
                  colorScheme="blue"
                />
              ))}
            </div>
          </div>

          {/* Para Negocios */}
          <div
            ref={businessRef}
            className={`
              bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-[2rem] p-6 sm:p-10 
              shadow-[0_8px_30px_rgb(0,0,0,0.06)] 
              border border-white/80
              transition-all duration-700
              ${businessInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}
            `}
            style={{ transitionDelay: '150ms' }}
          >
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-8">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Store className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                Para Negocios
              </h3>
            </div>
            <p className="text-gray-500 mb-4 sm:mb-8 leading-relaxed text-base sm:text-lg">
              Gestiona tu agenda, empleados y servicios en un solo lugar.
              Todo organizado y disponible online 🎯
            </p>
            <div className="space-y-1 sm:space-y-2">
              {forBusinesses.map((item, index) => (
                <FeatureItemComponent 
                  key={index} 
                  item={item} 
                  index={index} 
                  colorScheme="purple"
                />
              ))}
            </div>
          </div>
        </div>

        {/* CTA final */}
        <div 
          ref={ctaRef}
          className={`
            text-center mt-12 sm:mt-20
            transition-all duration-700
            ${ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
          `}
        >
          <p className="text-lg sm:text-xl text-gray-600 font-medium">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 font-bold text-xl sm:text-2xl">
              AgéndateOnline
            </span>
            <br />
            <span className="text-gray-400 text-base sm:text-lg">
              Conectando comunidades, simplificando reservas ✨
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}