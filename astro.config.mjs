// astro.config.mjs
// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import netlify from "@astrojs/netlify"; // 👈 agregado

// Netlify pone NETLIFY="true" en el build
const isNetlify = process.env.NETLIFY === "true";

export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: true, // ok para v3
    }),
  ],
  // 👉 En local sigue "static"; en Netlify usa SSR + adapter
  output: isNetlify ? "server" : "static",
  adapter: isNetlify ? netlify() : undefined,
});
