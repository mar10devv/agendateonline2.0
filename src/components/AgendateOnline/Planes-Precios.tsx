import React, { useState, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { 
  Sprout, 
  Rocket, 
  Check,
  Star
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Plan {
  icon: LucideIcon;
  name: string;
  description: string;
  price: string;
  priceDetail: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
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

// Componente para cada plan
const PlanCard: React.FC<{ plan: Plan; index: number }> = ({ plan, index }) => {
  const [ref, isInView] = useInView<HTMLDivElement>();
  const Icon = plan.icon;

  return (
    <div
      ref={ref}
      className={`
        relative
        bg-white
        rounded-2xl sm:rounded-3xl
        p-6 sm:p-8
        border-2
        ${plan.highlighted 
          ? 'border-violet-500 shadow-[0_8px_40px_rgb(139,92,246,0.2)]' 
          : 'border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)]'
        }
        transition-all duration-500 ease-out
        hover:-translate-y-2
        hover:shadow-[0_20px_50px_rgb(139,92,246,0.15)]
        ${isInView 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-12'
        }
      `}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      {/* Badge destacado */}
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-violet-500/30">
            <Star className="w-3.5 h-3.5" fill="currentColor" />
            {plan.badge}
          </span>
        </div>
      )}

      {/* Icono */}
      <div 
        className={`
          w-14 h-14 sm:w-16 sm:h-16
          rounded-xl sm:rounded-2xl
          ${plan.highlighted 
            ? 'bg-gradient-to-br from-violet-500 to-purple-500' 
            : 'bg-violet-100'
          }
          flex items-center justify-center
          mb-5 sm:mb-6
        `}
      >
        <Icon 
          className={`w-7 h-7 sm:w-8 sm:h-8 ${plan.highlighted ? 'text-white' : 'text-violet-600'}`} 
          strokeWidth={1.5} 
        />
      </div>

      {/* Nombre del plan */}
      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
        {plan.name}
      </h3>

      {/* Descripción */}
      <p className="text-gray-500 text-sm sm:text-base mb-6 leading-relaxed">
        {plan.description}
      </p>

      {/* Precio */}
      <div className="mb-6 pb-6 border-b border-gray-100">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl sm:text-5xl font-black text-gray-900">
            ${plan.price}
          </span>
          <span className="text-gray-500 text-sm sm:text-base">/mes</span>
        </div>
        <p className="text-violet-600 text-sm font-medium mt-1">
          {plan.priceDetail}
        </p>
      </div>

      {/* Features */}
      <ul className="space-y-3 sm:space-y-4 mb-8">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className={`
              flex-shrink-0 w-5 h-5 rounded-full 
              ${plan.highlighted 
                ? 'bg-gradient-to-br from-violet-500 to-purple-500' 
                : 'bg-violet-100'
              }
              flex items-center justify-center mt-0.5
            `}>
              <Check 
                className={`w-3 h-3 ${plan.highlighted ? 'text-white' : 'text-violet-600'}`} 
                strokeWidth={3} 
              />
            </span>
            <span className="text-gray-600 text-sm sm:text-base">{feature}</span>
          </li>
        ))}
      </ul>

      {/* Botón */}
      <button
        className={`
          w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl
          font-semibold text-sm sm:text-base
          transition-all duration-300
          ${plan.highlighted 
            ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600 shadow-lg shadow-violet-500/30 hover:shadow-violet-500/40' 
            : 'bg-gray-100 text-gray-900 hover:bg-violet-100 hover:text-violet-700'
          }
        `}
      >
        Empezar ahora
      </button>
    </div>
  );
};

export default function PlanesPrecios() {
  const [titleRef, titleInView] = useInView<HTMLDivElement>();
  const [noteRef, noteInView] = useInView<HTMLDivElement>();

  const plans: Plan[] = [
    {
      icon: Sprout,
      name: "Plan Emprendimiento",
      description: "Ideal para una persona sola que atiende a sus clientes: uñas, pestañas, cejas, masajes, tatuajes, etc.",
      price: "299",
      priceDetail: "1 agenda virtual incluida",
      features: [
        "1 agenda virtual con todas las funciones",
        "Servicios, precios y ubicación",
        "Personalización de colores y foto",
        "Estadísticas de dinero generado",
        "Recordatorios automáticos",
        "Soporte por WhatsApp"
      ]
    },
    {
      icon: Rocket,
      name: "Plan Negocio",
      description: "Pensado para negocios con varios empleados: barberías, salones, estudios de tatuajes, centros estéticos, etc.",
      price: "399",
      priceDetail: "por empleado / mes",
      features: [
        "1 agenda por cada empleado",
        "Todas las funciones del Plan Emprendimiento",
        "Panel de control centralizado",
        "Ver estadísticas de todo el equipo",
        "Clientes eligen con quién agendarse",
        "Soporte prioritario"
      ],
      highlighted: true,
      badge: "Más popular"
    }
  ];

  return (
    <section className="bg-gradient-to-b from-purple-50/30 via-white to-violet-50/20 py-10 sm:py-16 relative overflow-hidden">
      {/* Decoración de fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-gradient-to-br from-violet-300/10 to-purple-200/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-0 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-gradient-to-br from-purple-300/10 to-fuchsia-200/10 rounded-full blur-3xl"></div>
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Título */}
        <div
          ref={titleRef}
          className={`
            text-center mb-12 sm:mb-16
            transition-all duration-1000
            ${titleInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
          `}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-violet-100 text-violet-700 text-sm font-medium mb-4">
            💰 Precios simples
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tight mb-4 sm:mb-6">
            Planes y{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600">
              precios
            </span>
          </h2>
          <p className="text-base sm:text-xl text-gray-500 max-w-2xl mx-auto">
            1 mes de prueba gratis en cualquier plan. Sin tarjeta, sin compromiso 🎁
          </p>
        </div>

        {/* Grid de planes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <PlanCard key={index} plan={plan} index={index} />
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
          <p className="text-gray-500 text-sm sm:text-base max-w-xl mx-auto">
            Ambos planes incluyen las <span className="font-semibold text-violet-600">mismas funciones</span>. 
            La diferencia es la cantidad de agendas: Emprendimiento tiene 1, Negocio permite tener una por cada empleado.
          </p>
        </div>
      </div>
    </section>
  );
}