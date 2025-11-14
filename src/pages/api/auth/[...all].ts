import type {APIRoute} from "astro";
import {auth} from "@/lib/auth.ts";

export const prerender = false;

export const ALL: APIRoute = async (ctx) => {

    console.log("API Route called");
    // If you want to use rate limiting, make sure to set the 'x-forwarded-for' header to the request headers from the context
    // ctx.request.headers.set("x-forwarded-for", ctx.clientAddress);
    return auth.handler(ctx.request);
};