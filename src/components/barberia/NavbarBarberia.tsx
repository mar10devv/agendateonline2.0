import React from "react";

type Props = {
  title?: string;
  hoverColor?: string; // color dinámico desde Firestore
  logoUrl?: string;    // Ej: "/uploads/logo.png"
};

export default function NavbarBarberia({
  title = "GALANO BARBERSHOP",
  hoverColor,
  logoUrl,
}: Props) {
  // ✅ fallback si no viene color
  const color = hoverColor || "#3b82f6";

  return (
    <nav className="w-full bg-black text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          
          {/* Izquierda: logo (si hay) + nombre */}
          <div className="flex items-center gap-3 shrink-0">
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
            )}
            <span className="text-sm uppercase tracking-wide">{title}</span>
          </div>

          {/* Centro: menú con hover dinámico */}
          <ul className="hidden md:flex flex-1 justify-center gap-10 text-sm font-medium">
            {[
              { href: "#inicio", label: "Inicio" },
              { href: "#sobrenosotros", label: "Sobre nosotros" },
              { href: "#cursos", label: "Cursos" },
              { href: "#contacto", label: "Contacto" },
            ].map(({ href, label }) => (
              <li key={href}>
                <a href={href} className="relative group text-white">
                  {label}
                  <span
                    className="absolute left-0 -bottom-1 w-full h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"
                    style={{ backgroundColor: color }}
                  ></span>
                </a>
              </li>
            ))}
          </ul>

          {/* Derecha: botón */}
          <div className="shrink-0">
            <a
              href="#reservar"
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors text-white"
              style={{ backgroundColor: color }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = darkenColor(color))
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = color)
              }
            >
              Reservar cita
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}

// Función para oscurecer ligeramente el color del botón en hover
function darkenColor(hex: string, amount = 0.15) {
  let col = hex.replace("#", "");
  if (col.length === 3) col = col.split("").map((c) => c + c).join("");

  const num = parseInt(col, 16);
  const r = Math.max(0, ((num >> 16) & 255) * (1 - amount));
  const g = Math.max(0, ((num >> 8) & 255) * (1 - amount));
  const b = Math.max(0, (num & 255) * (1 - amount));

  return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
}
