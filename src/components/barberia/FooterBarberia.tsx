// src/components/barberia/FooterBarberia.tsx
import React from "react";
import { fuentesMap } from "../../lib/fonts";
import { MapPin, Phone, Mail } from "lucide-react";

type Props = {
  nombre?: string;
  eslogan?: string;
  fuenteTexto?: string;
  fuenteBotones?: string;
  direccion?: string;
  telefono?: string;
  emailContacto?: string;
  lat?: number;
  lng?: number;
};

export default function FooterBarberia({
  nombre = "Mi negocio",
  eslogan = "Cortes modernos, clásicos y a tu medida",
  fuenteTexto = "raleway",
  fuenteBotones = "poppins",
  direccion,
  telefono,
  emailContacto,
  lat,
  lng,
}: Props) {
  return (
    <footer className="bg-black text-white mt-16">
      <div
        className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-12 
                grid grid-cols-1 md:grid-cols-3 gap-10 text-center md:text-left"
      >
        {/* Columna 1 - Nombre + eslogan */}
        <div>
          <h2 className={`text-2xl font-bold mb-3 ${fuentesMap[fuenteTexto]}`}>
            {nombre}
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">{eslogan}</p>
        </div>

        {/* Columna 2 - Menú */}
        <div>
          <h3
            className={`text-lg font-semibold mb-4 text-amber-600 ${fuentesMap[fuenteBotones]}`}
          >
            Menú
          </h3>
          <ul className={`space-y-2 text-sm ${fuentesMap[fuenteTexto]}`}>
            <li>
              <a href="#inicio" className="hover:text-amber-500 transition">
                Inicio
              </a>
            </li>
            <li>
              <a href="#servicios" className="hover:text-amber-500 transition">
                Servicios
              </a>
            </li>
            <li>
              <a
                href="#sobre-nosotros"
                className="hover:text-amber-500 transition"
              >
                Sobre nosotros
              </a>
            </li>
            <li>
              <a href="#contacto" className="hover:text-amber-500 transition">
                Contacto
              </a>
            </li>
          </ul>
        </div>

        {/* Columna 3 - Contacto */}
        <div>
          <h3
            className={`text-lg font-semibold mb-4 text-amber-600 ${fuentesMap[fuenteBotones]}`}
          >
            Contacto
          </h3>
          <ul className="space-y-3 text-sm text-gray-300 flex flex-col items-center md:items-start">
            {lat && lng && (
              <li className="flex items-center gap-2 justify-center md:justify-start">
                <MapPin size={16} className="text-amber-500" />
                <a
                  href={`https://www.google.com/maps?q=${lat},${lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-400 transition"
                >
                  Ver ubicación en Google Maps
                </a>
              </li>
            )}
            {telefono && (
              <li className="flex items-center gap-2 justify-center md:justify-start">
                <Phone size={16} className="text-amber-500" />
                <span>{telefono}</span>
              </li>
            )}
            {emailContacto && (
              <li className="flex items-center gap-2 justify-center md:justify-start">
                <Mail size={16} className="text-amber-500" />
                <span>{emailContacto}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Línea inferior */}
      <div className="border-t border-gray-800 mt-8 py-6 px-6 md:px-12 lg:px-24 flex flex-col md:flex-row items-center justify-between text-gray-500 text-xs">
        <p>
          © {new Date().getFullYear()} {nombre} — Todos los derechos reservados.
        </p>
        <p>
          Desarrollado por{" "}
          <span className="text-amber-600 font-semibold">AgéndateOnline</span>
        </p>
      </div>

      {/* Botón flotante */}
      <a
        href="#agendar-turno"
        className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg bg-black text-white font-semibold shadow-lg transition ${fuentesMap[fuenteBotones]}`}
      >
        Reservar cita!
      </a>
    </footer>
  );
}
