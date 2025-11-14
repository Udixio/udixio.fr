import validator from "validator";
import xss from "xss";
import {sendMail} from "@/lib/mailer.ts";

export const prerender = false;

export const POST: ({
                        request,
                    }: {
    request: any;
}) => Promise<Response> = async ({request}) => {
    const {name, email, message} = await request.json();
    let errors: Record<string, string> = {};

    if (!name) errors["name"] = "Veuillez fournir un nom";
    if (!email) errors["email"] = "Veuillez fournir un email";
    if (!message) errors["message"] = "Veuillez fournir un message";
    if (email && !validator.isEmail(email)) {
        errors["email"] = "Veuillez fournir un email valide";
    }
    if (message && !validator.isLength(message, {min: 20})) {
        errors["message"] = "Votre message doit contenir au moins 20 caractères";
    }
    if (Object.keys(errors).length > 0) {
        return new Response(
            JSON.stringify({
                status: 400,
                message: "Il y a des erreurs dans votre requête",
                errors: errors,
            }),
            {
                headers: {"Content-Type": "application/json"},
                status: 400,
            },
        );
    }

    const secretKey = import.meta.env.RECAPTCHA_SECRET_KEY;

    const recaptchaToken = request.headers.get("recaptcha-token");

    const responseRecaptcha = await fetch(
        `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`,
        {
            method: "post",
        },
    );

    const recaptchaData = await responseRecaptcha.json();

    if (!recaptchaData.success) {
        return new Response(
            JSON.stringify({
                status: 400,
                message: "reCaptcha validation failed",
            }),
            {
                headers: {"Content-Type": "application/json"},
                status: 400,
            },
        );
    } else {
        const html = `
        <h1>Nouveau message de ${xss(name)}</h1>
        <p>
          Nom: ${xss(name)}<br>
          Email: ${xss(email)}<br>
          Message: ${xss(message)}
        </p>
      `;

        try {
            await sendMail({html, subject: 'contact', to: import.meta.env.PUBLIC_EMAIL_TO});
            console.log("Email envoyé avec succès !");
            return new Response(
                JSON.stringify({
                    status: 200,
                    message: "success",
                }),
                {
                    headers: {"Content-Type": "application/json"},
                    status: 200,
                },
            );
        } catch (err) {
            console.warn('Une erreur est survenue lors de l"envoi de l"email', err);
            return new Response(
                JSON.stringify({
                    status: 400,
                    message: "Une erreur est survenue lors de l'envoi de l'email",
                }),
                {
                    headers: {"Content-Type": "application/json"},
                    status: 400,
                },
            );
        }
    }
    return new Response(
        JSON.stringify({
            status: 400,
            message: "Une erreur est survenue lors de l'envoi de l'email",
        }),
        {
            headers: {"Content-Type": "application/json"},
            status: 400,
        },
    );
};
