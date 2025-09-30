/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}",
  ],
  safelist: [
    "font-montserrat",
    "font-poppins",
    "font-raleway",
    "font-playfair",
    "font-bebas",
    "font-euphoria", // 👈 agregado
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
        euphoria: ["Euphoria Script", "cursive"], // 👈 agregado
      },
    },
  },
  plugins: [],
};
