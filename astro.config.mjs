// astro.config.mjs
// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import netlify from "@astrojs/netlify";

// Detecta si estás en Netlify
const isNetlify = process.env.NETLIFY === "true";

export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: true,
    }),
  ],
  // 👇 Si estás en local = static. En Netlify = server con adapter
  output: isNetlify ? "server" : "static",
  adapter: isNetlify ? netlify() : undefined,
});
