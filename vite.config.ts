import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  // `base` defaults to "/" so dev and `npm run preview` work locally. The
  // GitHub Pages workflow passes BASE=/thelittleway/ so production assets
  // are served from the project subpath.
  base: process.env.BASE ?? "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "The Little Way",
        short_name: "Little Way",
        description:
          "A daily devotional drawn from St Thérèse of Lisieux's Story of a Soul, with the Father's mercy as its anchor.",
        theme_color: "#6b4226",
        background_color: "#fbf8f3",
        display: "standalone",
        start_url: ".",
        scope: ".",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,json}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@data": path.resolve(__dirname, "data"),
    },
  },
});
