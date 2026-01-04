import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

interface NavLink {
  label: string;
  href: string;
}

export default function NavBar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const links: NavLink[] = [
    { label: "Qué es", href: "#que-es" },
    { label: "Cómo funciona", href: "#como-funciona" },
    { label: "Funciones", href: "#funciones" },
    { label: "Precios", href: "#precios" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Cerrar menú móvil al hacer click en un link
  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  // Bloquear scroll cuando el menú móvil está abierto
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav
        className={`
          fixed top-0 left-0 right-0 z-50
          transition-all duration-300
          ${isScrolled 
            ? "bg-white/80 backdrop-blur-xl shadow-[0_2px_20px_rgb(0,0,0,0.08)] py-3" 
            : "bg-transparent py-4 sm:py-5"
          }
        `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <a 
            href="#" 
            className={`
              text-xl sm:text-2xl font-bold
              transition-colors duration-300
              ${isScrolled 
                ? "text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600" 
                : "text-white"
              }
            `}
          >
            AgéndateOnline
          </a>

          {/* Links - Desktop */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`
                  px-3 lg:px-4 py-2 rounded-full text-sm font-medium
                  transition-all duration-200
                  ${isScrolled 
                    ? "text-gray-600 hover:text-violet-600 hover:bg-violet-50" 
                    : "text-white/80 hover:text-white hover:bg-white/10"
                  }
                `}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA Button - Desktop */}
          <div className="hidden md:block">
            <a
              href="#precios"
              className={`
                px-5 py-2.5 rounded-full text-sm font-semibold
                transition-all duration-300
                ${isScrolled 
                  ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600 shadow-lg shadow-violet-500/25" 
                  : "bg-white/15 text-white border border-white/25 hover:bg-white/25 backdrop-blur-sm"
                }
              `}
            >
              Empezar gratis
            </a>
          </div>

          {/* Hamburger - Mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`
              md:hidden p-2 rounded-xl
              transition-colors duration-200
              ${isScrolled 
                ? "text-gray-700 hover:bg-gray-100" 
                : "text-white hover:bg-white/10"
              }
            `}
            aria-label="Menú"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`
          fixed inset-0 z-40 md:hidden
          transition-all duration-300
          ${isMobileMenuOpen 
            ? "opacity-100 pointer-events-auto" 
            : "opacity-0 pointer-events-none"
          }
        `}
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Menu Panel */}
        <div
          className={`
            absolute top-0 right-0 h-full w-[280px] sm:w-[320px]
            bg-white shadow-2xl
            transition-transform duration-300 ease-out
            ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600">
              AgéndateOnline
            </span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Links */}
          <div className="p-5 space-y-1">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={handleLinkClick}
                className="block px-4 py-3 rounded-xl text-gray-700 font-medium hover:bg-violet-50 hover:text-violet-600 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="absolute bottom-0 left-0 right-0 p-5 border-t border-gray-100 bg-gray-50/50">
            <a
              href="#precios"
              onClick={handleLinkClick}
              className="block w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-center font-semibold shadow-lg shadow-violet-500/25 hover:from-violet-600 hover:to-purple-600 transition-all"
            >
              Empezar gratis
            </a>
            <p className="text-center text-gray-500 text-xs mt-3">
              1 mes de prueba sin compromiso
            </p>
          </div>
        </div>
      </div>
    </>
  );
}