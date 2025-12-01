import React, {useEffect, useMemo, useState} from "react";
import {Button, Card, TextField} from "@udixio/ui-react";
import {authClient} from "@/lib/auth-client.ts";

export const Login: React.FC = () => {
    type Phase = "email" | "otp";
    const [phase, setPhase] = useState<Phase>("email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [message, setMessage] = useState<string>("");
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);

    // Session hook provided by better-auth/react client
    const {data: session, isPending} = authClient.useSession();

    const redirectParam = useMemo(() => {
        if (typeof window === "undefined") return null;
        const params = new URLSearchParams(window.location.search);
        return params.get("redirect");
    }, []);

    // If already logged in, redirect to /app
    useEffect(() => {
        if (isPending) return;
        if (session) {
            window.location.href = "/app";
        }
    }, [session, isPending]);

    function showMessage(msg: string, error = false) {
        setMessage(msg);
        setIsError(error);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (loading) return;
        showMessage("");

        try {
            if (phase === "email") {
                const emailTrimmed = email.trim();
                if (!emailTrimmed) {
                    showMessage("Veuillez saisir votre email.", true);
                    return;
                }
                setLoading(true);

                const {error} = await authClient.emailOtp.sendVerificationOtp({
                    email: emailTrimmed,
                    type: "sign-in",
                });
                setLoading(false);
                if (error) {
                    showMessage(error.message || "Impossible d'envoyer le code. Réessayez.", true);
                    return;
                }
                setEmail(emailTrimmed);
                setPhase("otp");
                showMessage("Un code vous a été envoyé par email.");
            } else {
                const otpTrimmed = otp.trim();
                if (!otpTrimmed) {
                    showMessage("Veuillez saisir le code OTP.", true);
                    return;
                }
                setLoading(true);
                const {error} = await authClient.signIn.emailOtp({
                    email,
                    otp: otpTrimmed,
                });
                setLoading(false);
                if (error) {
                    showMessage(error.message || "Code invalide ou expiré.", true);
                    return;
                }
                const redirect = redirectParam || "/app";
                window.location.href = redirect;
            }
        } catch (err) {
            setLoading(false);
            showMessage("Une erreur est survenue. Réessayez.", true);
            console.error(err);
        }
    }

    return (
        <section className="mx-auto max-w-md">
            <Card className="p-8">
                <h1 className="text-headline-small">Connexion</h1>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                    {phase === "email" && (
                        <div className="flex flex-col gap-4">
                            <TextField
                                variant="outlined"
                                name="email"
                                label="Email"
                                value={email}
                                onChange={(v) => setEmail(v)}
                            />
                        </div>
                    )}
                    {phase === "otp" && (
                        <div className="flex flex-col gap-4">
                            <TextField
                                variant="outlined"
                                name="otp"
                                label="Code OTP"
                                type="number"
                                value={otp}
                                onChange={(v) => setOtp(v)}
                                autoFocus
                            />
                        </div>
                    )}

                    {!!message && (
                        <div className={`text-sm ${isError ? "text-error" : "text-primary"}`}>
                            {message}
                        </div>
                    )}

                    <Button type="submit" disabled={loading} className="mt-6">
                        {phase === "email" ? (loading ? "Envoi..." : "Continuer") : (loading ? "Connexion..." : "Valider")}
                    </Button>
                </form>
            </Card>
        </section>
    );
};

export default Login;