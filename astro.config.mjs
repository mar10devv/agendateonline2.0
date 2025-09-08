// astro.config.mjs
// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import netlify from "@astrojs/netlify/static";   // 👈 usá el adaptador estático
import vercel from "@astrojs/vercel/serverless"; // 👈 si querés SSR en Vercel

const isNetlify = process.env.NETLIFY === "true";
const isVercel = process.env.VERCEL === "1";

export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: true,
    }),
  ],
  output: isVercel ? "server" : "static", // 👈 Netlify vuelve a static
  adapter: isNetlify
    ? netlify()
    : isVercel
    ? vercel({})
    : undefined,
});
