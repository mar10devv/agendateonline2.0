// astro.config.mjs
// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import netlify from "@astrojs/netlify";
import vercel from "@astrojs/vercel/serverless"; 
// 👉 podés usar "@astrojs/vercel/static" si NO usás SSR

const isNetlify = process.env.NETLIFY === "true";
const isVercel = process.env.VERCEL === "1";

export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: true,
    }),
  ],
  output: (isNetlify || isVercel) ? "server" : "static",
  adapter: isNetlify
    ? netlify()
    : isVercel
    ? vercel({})
    : undefined,
});
