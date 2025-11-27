// 🎨 Paleta de colores disponibles
export const temas = {
  azul: {
    primario: "#3b82f6", // Azul claro
    fondo: "#1e3a8a",    // Azul oscuro
    oscuro: "#1e3a8a",   // Variante más oscura
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
    oscuro: "#0a0a0a", // negro casi puro, modo por defecto
  },
  // 🤍 Tema claro
  white: {
    primario: "#ffffff", // Fondo principal blanco
    fondo: "#f9fafb",    // Gris muy claro para el fondo
    oscuro: "#e5e7eb",   // Gris medio para bordes/sombras
  },
};

// 🧠 Aplica y guarda el tema en localStorage
export function aplicarTema(nombre: keyof typeof temas) {
  const tema = temas[nombre];
  if (!tema) return;

  // 🎨 Actualizar variables CSS globales
  document.documentElement.style.setProperty("--color-primario", tema.primario);
  document.documentElement.style.setProperty("--color-fondo", tema.fondo);
  document.documentElement.style.setProperty("--color-primario-oscuro", tema.oscuro);

  // 🌓 Ajuste automático del color del texto
  const colorTexto = nombre === "white" ? "#111111" : "#ffffff";
  document.documentElement.style.setProperty("--color-texto", colorTexto);

  // 🔖 Atributo auxiliar para CSS específicos
  document.documentElement.setAttribute("data-tema", nombre);

  // 💾 Guardar en localStorage
  localStorage.setItem("temaSeleccionado", nombre);
}

// 🚀 Cargar tema guardado o por defecto
export function inicializarTema() {
  const guardado = localStorage.getItem("temaSeleccionado") as keyof typeof temas;
  if (guardado && temas[guardado]) {
    aplicarTema(guardado);
  } else {
    aplicarTema("gris"); // Tema oscuro por defecto
  }
}
