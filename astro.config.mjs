// astro.config.mjs
// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import netlify from "@astrojs/netlify";

export default defineConfig({
  integrations: [
    react(),
    tailwind({ applyBaseStyles: true }),
  ],
  output: "server",   // 👈 obligatorio para SSR
  adapter: netlify(), // 👈 no hace falta nada más
});
