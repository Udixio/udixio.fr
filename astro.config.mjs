import {defineConfig} from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import robotsTxt from 'astro-robots-txt';
import compressor from "astro-compressor";
import vercel from '@astrojs/vercel';

import compress from "astro-compress";

import mdx from "@astrojs/mdx";
import customIntegration from "./astro-custom-integration";

// https://astro.build/config
export default defineConfig({
    site: "https://www.udixio.fr/",
    compressHTML: true,
    experimental: {},
    output: 'static',
    integrations: [react(), tailwind({
        applyBaseStyles: false
    }), sitemap(), robotsTxt(), compress(), compressor(), mdx(), customIntegration()],
    vite: {
        ssr: {
            noExternal: ["react-markdown", "react-textarea-autosize", "@udixio/theme", "react-obfuscate", "react-google-recaptcha-v3"]
        }
    },
    adapter: vercel()
});