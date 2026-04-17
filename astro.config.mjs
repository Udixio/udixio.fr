import { defineConfig, fontProviders } from "astro/config";
import { visualizer } from "rollup-plugin-visualizer";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import robotsTxt from "astro-robots-txt";
import compressor from "astro-compressor";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

import compress from "astro-compress";

import mdx from "@astrojs/mdx";
import { customIntegration } from "./integrations";
import { vitePlugin } from "@udixio/theme";

import crittersRs from "@critters-rs/astro";

// https://astro.build/config
export default defineConfig({
  site: "https://www.udixio.fr/",
  compressHTML: true,
  experimental: {
    fonts: [
      {
        provider: fontProviders.google(),
        name: "Inter",
        cssVariable: "--font-inter",
      },
      {
        provider: fontProviders.local(),
        name: "Clash Grotesk",
        cssVariable: "--font-clash-grotesk",
        options: {
          variants: [
            {
              weight: 200,
              style: "normal",
              src: [
                "./src/assets/fonts/clash-grotesk/ClashGrotesk-Extralight.woff2",
              ],
            },
            {
              weight: 300,
              style: "normal",
              src: [
                "./src/assets/fonts/clash-grotesk/ClashGrotesk-Light.woff2",
              ],
            },
            {
              weight: 400,
              style: "normal",
              src: [
                "./src/assets/fonts/clash-grotesk/ClashGrotesk-Regular.woff2",
              ],
            },
            {
              weight: 500,
              style: "normal",
              src: [
                "./src/assets/fonts/clash-grotesk/ClashGrotesk-Medium.woff2",
              ],
            },
            {
              weight: 600,
              style: "normal",
              src: [
                "./src/assets/fonts/clash-grotesk/ClashGrotesk-Semibold.woff2",
              ],
            },
            {
              weight: 700,
              style: "normal",
              src: ["./src/assets/fonts/clash-grotesk/ClashGrotesk-Bold.woff2"],
            },
          ],
        },
      },
    ],
  },
  output: "static",
  integrations: [
    react(),
    sitemap(),
    robotsTxt(),
    crittersRs(),
    mdx(),
    compress(),
    compressor(),
    customIntegration(),
  ],
  vite: {
    ssr: {
      noExternal: [],
    },
    plugins: [
      vitePlugin(),
      tailwindcss(),
      visualizer({
        open: true,
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
      }),
    ],
    build: {
      assetsInlineLimit: 0,
    },
    optimizeDeps: {
      exclude: ["@udixio/ui-react", "@udixio/ui-react/theme-worker", "puppeteer", "puppeteer-screen-recorder"],
    },
    server: {
      host: true,
      allowedHosts: [
        "8b55-2001-861-3482-2610-e5ab-5c43-fe37-372.ngrok-free.app",
      ],
    },
  },
  adapter: vercel(),
});
