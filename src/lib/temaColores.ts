// src/lib/temaColores.ts

// 🎨 Paleta de colores disponibles
export const temas = {
  azul: {
    primario: "#3b82f6",           // Azul claro
    fondo: "#1e3a8a",              // Azul oscuro
    oscuro: "#1e3a8a",             // Variante más oscura
  },
  rosado: {
    primario: "#ec4899",
    fondo: "#831843",
    oscuro: "#500724",
  },
  verde: {
    primario: "#22c55e",
    fondo: "#14532d",
    oscuro: "#064e3b",
  },
  violeta: {
    primario: "#8b5cf6",
    fondo: "#4c1d95",
    oscuro: "#2e1065",
  },
  naranja: {
    primario: "#f97316",
    fondo: "#7c2d12",
    oscuro: "#431407",
  },
  gris: {
    primario: "#262626",
    fondo: "#171717",
    oscuro: "#0a0a0a", // 👈 negro casi puro, modo por defecto
  },
};

// 🧠 Guarda el tema en localStorage y aplica colores
export function aplicarTema(nombre: keyof typeof temas) {
  const tema = temas[nombre];
  if (!tema) return;

  document.documentElement.style.setProperty("--color-primario", tema.primario);
  document.documentElement.style.setProperty("--color-fondo", tema.fondo);
  document.documentElement.style.setProperty("--color-primario-oscuro", tema.oscuro); // 👈 nueva variable

  localStorage.setItem("temaSeleccionado", nombre);
}

// 🚀 Carga el tema guardado al iniciar
export function inicializarTema() {
  const guardado = localStorage.getItem("temaSeleccionado") as keyof typeof temas;
  if (guardado && temas[guardado]) {
    aplicarTema(guardado);
  } else {
    aplicarTema("gris"); // tema oscuro por defecto
  }
}
