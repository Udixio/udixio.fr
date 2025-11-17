import {betterAuth} from "better-auth";
import {prismaAdapter} from "better-auth/adapters/prisma";
import prisma from "@/lib/prisma.ts";
import {admin, emailOTP, organization} from "better-auth/plugins"
import {sendMail} from "@/lib/mailer.ts";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 jours
        updateAge: 60 * 60 * 24,     // rafraîchit la session si actif
    },
    // actions: {
    //     signUp: async () => {
    //         throw new Error("Inscription publique désactivée. Contactez un admin.");
    //     },
    // },

    hooks: {
        async onUserCreated(user) {
            const count = await prisma.user.count();
            if (count === 1) {
                await prisma.user.update({
                    where: {id: user.id},
                    data: {role: "admin"},
                });
            }
        },
    },

    plugins: [
        emailOTP({
            async sendVerificationOTP({
                                          email,
                                          otp,
                                          type,
                                      }: {
                email: string;
                otp: string;
                type: "sign-in" | "email-verification" | "forget-password";
            }): Promise<void> {
                let subject: string;
                let html: string;

                if (type === "sign-in") {
                    subject = "Code de connexion";
                    html = `
        <h1>Code de connexion</h1>
        <p>Bonjour,</p>
        <p>Voici votre code pour vous connecter : <strong>${otp}</strong></p>
        <p>Ce code est valable pendant quelques minutes.</p>
      `;
                } else if (type === "email-verification") {
                    subject = "Vérification de votre email";
                    html = `
        <h1>Vérification de votre email</h1>
        <p>Bonjour,</p>
        <p>Voici votre code de vérification : <strong>${otp}</strong></p>
        <p>Veuillez saisir ce code pour confirmer votre adresse email.</p>
      `;
                } else {
                    // forget-password
                    subject = "Réinitialisation de votre mot de passe";
                    html = `
        <h1>Réinitialisation de mot de passe</h1>
        <p>Bonjour,</p>
        <p>Voici votre code pour réinitialiser votre mot de passe : <strong>${otp}</strong></p>
        <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
      `;
                }

                // Envoi de l'email – pas de Response ici, juste une Promise<void>
                await sendMail({
                    html,
                    subject,
                    to: email, // ou import.meta.env.PUBLIC_EMAIL_TO si tu veux un destinataire fixe
                });
            },
        }),
        organization(),
        admin({
            adminRoles: ["admin"], // seuls les admins peuvent créer/éditer users
        }),
    ]
});