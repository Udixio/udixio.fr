import {defineAction} from 'astro:actions';
import {z} from 'astro:schema';

export const server = {
    login: defineAction({
        accept: 'form',
        input: z.object({
            token: z.string().min(1, 'Le token est requis.'),
        }),
        handler: async (input, {cookies}) => {
            try {
                // Stocker directement le token API fourni par l'utilisateur
                cookies.set('n8n_token', input.token, {
                    httpOnly: true,
                    secure: true,           // à activer en prod (HTTPS)
                    sameSite: 'strict',
                    path: '/',
                    maxAge: 60 * 60 * 24 * 7,   // 7 jours
                });

                return {success: true};
            } catch (err: any) {
                console.error('Error during token save:', err);
                return {success: false, error: err.message || 'Erreur serveur'};
            }
        },
    }),
    checkAuth: defineAction({
        accept: 'json',
        // Aucun input requis, mais on accepte un objet vide
        input: z.object({}).optional(),
        handler: async (_input, { cookies }) => {
            const token = cookies.get('n8n_token')?.value;
            return { authenticated: Boolean(token) };
        },
    }),
};
