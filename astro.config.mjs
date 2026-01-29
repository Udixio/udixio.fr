import {defineConfig, fontProviders} from "astro/config";
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import robotsTxt from 'astro-robots-txt';
import compressor from "astro-compressor";
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite'

import compress from "astro-compress";

import mdx from "@astrojs/mdx";
import customIntegration from "./astro-custom-integration";
import {vitePlugin} from "@udixio/theme";

// https://astro.build/config
export default defineConfig({
    site: "https://www.udixio.fr/",
    compressHTML: true,
    experimental: {
        fonts: [
            {
                provider: fontProviders.local(),
                name: "Just Sans",
                cssVariable: "--font-just-sans",
                options: {
                    variants: [
                        {
                            weight: 200,
                            style: "normal",
                            src: ["./src/assets/fonts/just-sans/JUST Sans ExLight.woff2"]
                        },
                        {
                            weight: 300,
                            style: "normal",
                            src: ["./src/assets/fonts/just-sans/JUST Sans Light.woff2"]
                        },
                        {
                            weight: 400,
                            style: "normal",
                            src: ["./src/assets/fonts/just-sans/JUST Sans Regular.woff2"]
                        },
                        {
                            weight: 500,
                            style: "normal",
                            src: ["./src/assets/fonts/just-sans/JUST Sans Medium.woff2"]
                        },
                        {
                            weight: 600,
                            style: "normal",
                            src: ["./src/assets/fonts/just-sans/JUST Sans SemiBold.woff2"]
                        },
                        {
                            weight: 700,
                            style: "normal",
                            src: ["./src/assets/fonts/just-sans/JUST Sans Bold.woff2"]
                        },
                        {
                            weight: 800,
                            style: "normal",
                            src: ["./src/assets/fonts/just-sans/JUST Sans ExBold.woff2"]
                        }
                    ]
                }
            },

        ]
    },
    output: 'static',
    integrations: [react(), sitemap(), robotsTxt(), compress(), compressor(), mdx(), customIntegration()],
    vite: {
        ssr: {
            noExternal: ["react-markdown", "react-textarea-autosize", "@udixio/theme", "react-obfuscate", "react-google-recaptcha-v3"]
        },
        plugins: [
            vitePlugin(),
            tailwindcss()
        ]
    },
    adapter: vercel()
});