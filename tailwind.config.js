/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}",
  ],

  safelist: [
    // FUENTES
    "font-montserrat",
    "font-poppins",
    "font-raleway",
    "font-playfair",
    "font-bebas",
    "font-euphoria",
    "font-anton",
    "font-oswald",

    // 🎯 COLORES FIJOS PARA TURNOS — con patrones RegExp para que NO los purge
    { pattern: /^bg-emerald-/ },
    { pattern: /^hover:bg-emerald-/ },

    { pattern: /^bg-red-/ },
    { pattern: /^hover:bg-red-/ },

    { pattern: /^bg-gray-/ },
    { pattern: /^text-gray-/ },

    // Variantes con opacidad (bg-red-600/90, bg-emerald-600/95, etc.)
    { pattern: /^bg-emerald-.*\/.*/ },
    { pattern: /^bg-red-.*\/.*/ },
    { pattern: /^bg-gray-.*\/.*/ },
  ],

  theme: {
    extend: {
      keyframes: {
        slide: {
          "0%": { transform: "translateX(0)" },
          "33%": { transform: "translateX(-100%)" },
          "66%": { transform: "translateX(-200%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        slide: "slide 12s infinite ease-in-out",
      },
      fontFamily: {
        montserrat: ["Montserrat", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
        raleway: ["Raleway", "sans-serif"],
        playfair: ["Playfair Display", "serif"],
        bebas: ["Bebas Neue", "sans-serif"],
        euphoria: ["Euphoria Script", "cursive"],
        anton: ["Anton", "sans-serif"],
        oswald: ["Oswald", "sans-serif"],
      },
    },
  },

  plugins: [],
};
