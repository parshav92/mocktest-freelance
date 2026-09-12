"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        const callbackUrl = new URL("/auth/callback", window.location.origin);
        callbackUrl.searchParams.set("redirect", "/auth/reset-password");

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: callbackUrl.toString(),
        });

        if (error) {
            setError("We couldn’t send the reset email. Please try again.");
        } else {
            setIsSent(true);
        }

        setIsLoading(false);
    };

    return (
        <main className="min-h-screen bg-white p-4 md:p-8">
            <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl items-center justify-center md:min-h-[calc(100vh-4rem)]">
                <section className="w-full max-w-md rounded-3xl border border-slate-200/70 bg-white p-8 shadow-xl shadow-sky-100/40 md:p-10">
                    <Link
                        href="/auth"
                        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to sign in
                    </Link>

                    <div className="mb-8">
                        <div className="mb-4 inline-flex rounded-xl bg-sky-100 p-3 text-sky-700">
                            {isSent ? <Mail className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            {isSent ? "Check your inbox" : "Reset your password"}
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            {isSent
                                ? "If an account matches that email address, we’ll send a secure password-reset link shortly."
                                : "Enter the email address for your parent account and we’ll send a secure reset link."}
                        </p>
                    </div>

                    {isSent ? (
                        <div className="space-y-5">
                            <div className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-700">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                                <p>Use the link in the email to choose a new password. It may take a minute to arrive.</p>
                            </div>
                            <Button
                                className="h-12 w-full rounded-xl bg-slate-900 font-medium text-white hover:bg-slate-800"
                                onClick={() => setIsSent(false)}
                            >
                                Send another link
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="font-medium text-slate-900">
                                    Email address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    className="h-12 rounded-xl border-slate-200 bg-white focus:border-sky-500 focus:ring-sky-500"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            {error && (
                                <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                                    {error}
                                </p>
                            )}

                            <Button
                                type="submit"
                                className="h-12 w-full rounded-xl bg-slate-900 font-medium text-white hover:bg-slate-800"
                                disabled={isLoading}
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send reset link
                            </Button>
                        </form>
                    )}
                </section>
            </div>
        </main>
    );
}
