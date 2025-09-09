// astro.config.mjs
// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import netlifyFunctions from "@astrojs/netlify/functions";

const isNetlify = process.env.NETLIFY === "true";

export default defineConfig({
  integrations: [
    react(),
    tailwind({ applyBaseStyles: true }),
  ],
  output: isNetlify ? "server" : "static",
  adapter: isNetlify ? netlifyFunctions({}) : undefined,
});
