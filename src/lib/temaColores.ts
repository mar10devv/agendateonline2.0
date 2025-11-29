// 🎨 Paleta de colores disponibles
export const temas = {
  azul: {
    primario: "#3b82f6",
    fondo: "#1e3a8a",
    oscuro: "#1e3a8a",
    card: "oscuro",
  },
  rosado: {
    primario: "#ec4899",
    fondo: "#831843",
    oscuro: "#500724",
    card: "oscuro",
  },
  verde: {
    primario: "#22c55e",
    fondo: "#14532d",
    oscuro: "#064e3b",
    card: "oscuro",
  },
  violeta: {
    primario: "#8b5cf6",
    fondo: "#4c1d95",
    oscuro: "#2e1065",
    card: "oscuro",
  },
  naranja: {
    primario: "#f97316",
    fondo: "#7c2d12",
    oscuro: "#431407",
    card: "oscuro",
  },
  gris: {
    primario: "#262626",
    fondo: "#171717",
    oscuro: "#0a0a0a",
    card: "oscuro",
  },

  // 🤍 Tema WHITE → cards con gradient
  white: {
    primario: "#ffffff",
    fondo: "#f9fafb",
    oscuro: "#e5e7eb",
    card: "gradient",
  },

  // 🌈 Tema GRADIENT → cards también con gradient
  gradient: {
    primario: "#ffffff",
    fondo: "linear-gradient(to right, #2563eb, #4f46e5)",
    oscuro: "#ffffff",
    card: "gradient",
  },
};


// 🧠 Aplica y guarda el tema en localStorage
export function aplicarTema(nombre: keyof typeof temas) {
  const tema = temas[nombre];
  if (!tema) return;

  // Fondo general
  if (tema.fondo.startsWith("linear-gradient")) {
    document.documentElement.style.setProperty("--color-fondo", "transparent");
    document.documentElement.style.setProperty("--color-fondo-gradient", tema.fondo);
  } else {
    document.documentElement.style.setProperty("--color-fondo", tema.fondo);
    document.documentElement.style.setProperty("--color-fondo-gradient", "none");
  }

  // 🎨 Fondo de las CARDS
  if (tema.card === "gradient") {
    document.documentElement.style.setProperty(
      "--color-card",
      "linear-gradient(to right, #2563eb, #4f46e5)"
    );
  } else {
    // Usa el color oscuro del tema
    document.documentElement.style.setProperty("--color-card", tema.oscuro);
  }

  // Colores principales de la UI
  document.documentElement.style.setProperty("--color-primario", tema.primario);
  document.documentElement.style.setProperty("--color-primario-oscuro", tema.oscuro);

  // Texto automático
  const colorTexto =
    nombre === "white" || nombre === "gradient" ? "#111111" : "#ffffff";

  document.documentElement.style.setProperty("--color-texto", colorTexto);

  // Activar tema
  document.documentElement.setAttribute("data-tema", nombre);

  // Guardar selección
  localStorage.setItem("temaSeleccionado", nombre);
}


// 🚀 Inicializar tema
export function inicializarTema() {
  const guardado = localStorage.getItem("temaSeleccionado") as keyof typeof temas;
  aplicarTema(guardado && temas[guardado] ? guardado : "gris");
}
