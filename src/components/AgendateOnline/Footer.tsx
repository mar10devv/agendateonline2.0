import React from "react";
import { 
  Instagram, 
  Facebook, 
  Mail, 
  Phone,
  MapPin
} from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const links = {
    producto: [
      { label: "Funciones", href: "#funciones" },
      { label: "Precios", href: "#precios" },
      { label: "Cómo funciona", href: "#como-funciona" },
    ],
    soporte: [
      { label: "Centro de ayuda", href: "#" },
      { label: "Contacto", href: "#contacto" },
      { label: "WhatsApp", href: "https://wa.me/tunumero" },
    ],
    legal: [
      { label: "Términos y condiciones", href: "#" },
      { label: "Política de privacidad", href: "#" },
    ],
  };

  const socials = [
    { icon: Instagram, href: "https://instagram.com/agendateonline", label: "Instagram" },
    { icon: Facebook, href: "https://facebook.com/agendateonline", label: "Facebook" },
  ];

  return (
    <footer className="bg-gray-950 text-white relative overflow-hidden">
      {/* Decoración de fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Contenido principal */}
        <div className="py-12 sm:py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-8">
          {/* Logo y descripción */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="text-2xl font-bold mb-4">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">
                AgéndateOnline
              </span>
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              La plataforma que conecta clientes con negocios locales. 
              Reservá turnos fácil, rápido y sin esperas.
            </p>
            
            {/* Redes sociales */}
            <div className="flex gap-3">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-violet-500/20 hover:border-violet-500/30 transition-all duration-300"
                >
                  <social.icon className="w-5 h-5 text-gray-400 hover:text-violet-400" />
                </a>
              ))}
            </div>
          </div>

          {/* Links - Producto */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Producto
            </h4>
            <ul className="space-y-3">
              {links.producto.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="text-gray-400 text-sm hover:text-violet-400 transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Links - Soporte */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Soporte
            </h4>
            <ul className="space-y-3">
              {links.soporte.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="text-gray-400 text-sm hover:text-violet-400 transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Contacto
            </h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="mailto:contacto@agendateonline.com"
                  className="flex items-center gap-2 text-gray-400 text-sm hover:text-violet-400 transition-colors duration-200"
                >
                  <Mail className="w-4 h-4" />
                  <span>contacto@agendateonline.com</span>
                </a>
              </li>
              <li>
                <a 
                  href="https://wa.me/tunumero"
                  className="flex items-center gap-2 text-gray-400 text-sm hover:text-violet-400 transition-colors duration-200"
                >
                  <Phone className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              </li>
              <li>
                <span className="flex items-center gap-2 text-gray-400 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>Uruguay 🇺🇾</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Línea divisoria */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        {/* Copyright */}
        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm text-center sm:text-left">
            © {currentYear} AgéndateOnline. Todos los derechos reservados.
          </p>
          
          <div className="flex gap-6">
            {links.legal.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-gray-500 text-sm hover:text-violet-400 transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}