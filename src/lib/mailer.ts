// src/lib/mailer.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: import.meta.env.EMAIL_HOST,
    port: 465,
    secure: true,
    auth: {
        user: import.meta.env.EMAIL_FROM,
        pass: import.meta.env.EMAIL_PASSWORD,
    },
});

type SendMailParams = {
    html: string;
    subject: string;
    to: string;
    from?: string;
};

export async function sendMail({
                                   html,
                                   subject,
                                   to,
                                   from = import.meta.env.EMAIL_FROM,
                               }: SendMailParams) {
    await transporter.sendMail({
        from,
        to,
        subject,
        html,
    });
}