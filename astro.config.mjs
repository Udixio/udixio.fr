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
                name: "Vogun",
                cssVariable: "--font-vogun",
                options: {
                    variants: [
                        {
                            weight: 500,
                            style: "normal",
                            src: ["./src/assets/fonts/vogun/Vogun-Medium.woff2"]
                        },
                        {
                            weight: 500,
                            style: "italic",
                            src: ["./src/assets/fonts/vogun/Vogun-MediumItalic.woff2"]
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