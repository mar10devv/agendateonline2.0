// src/components/barberia/FooterBarberia.tsx
import React from "react";
import { fuentesMap } from "../../lib/fonts";

type Props = {
  fuenteTexto?: string;
  fuenteBotones?: string;
};

export default function FooterBarberia({
  fuenteTexto = "raleway",
  fuenteBotones = "poppins",
}: Props) {
  return (
    <footer className="bg-black text-white py-8 px-6 md:px-12 lg:px-24 mt-16">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Logo o Nombre */}
        <div className={`text-xl font-bold ${fuentesMap[fuenteTexto]}`}>
          Barbería <span className="text-gray-400">Agendate</span>
        </div>

        {/* Links */}
        <nav className={`flex gap-6 text-sm ${fuentesMap[fuenteBotones]}`}>
          <a href="#servicios" className="hover:text-gray-400 transition">Servicios</a>
          <a href="#turnos" className="hover:text-gray-400 transition">Turnos</a>
          <a href="#contacto" className="hover:text-gray-400 transition">Contacto</a>
        </nav>

        {/* Copyright */}
        <p className={`text-xs text-gray-400 ${fuentesMap[fuenteTexto]}`}>
          © {new Date().getFullYear()} Barbería Agendate. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
