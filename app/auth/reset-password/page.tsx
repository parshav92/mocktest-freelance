"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
    const [isChecking, setIsChecking] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const checkRecoverySession = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setError("This reset link is invalid or has expired. Request a new one to continue.");
            }

            setIsChecking(false);
        };

        checkRecoverySession();
    }, [supabase]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        const formData = new FormData(event.currentTarget);
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (password.length < 8) {
            setError("Use at least 8 characters for your new password.");
            return;
        }

        if (password !== confirmPassword) {
            setError("The passwords don’t match. Please try again.");
            return;
        }

        setIsLoading(true);
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setError("We couldn’t update your password. Please request a new reset link and try again.");
        } else {
            await supabase.auth.signOut();
            setIsComplete(true);
        }

        setIsLoading(false);
    };

    return (
        <main className="min-h-screen bg-white p-4 md:p-8">
            <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl items-center justify-center md:min-h-[calc(100vh-4rem)]">
                <section className="w-full max-w-md rounded-3xl border border-slate-200/70 bg-white p-8 shadow-xl shadow-sky-100/40 md:p-10">
                    <div className="mb-8 inline-flex rounded-xl bg-sky-100 p-3 text-sky-700">
                        {isComplete ? <CheckCircle2 className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {isComplete ? "Password updated" : "Choose a new password"}
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        {isComplete
                            ? "Your password has been changed. Sign in with your new password to continue."
                            : "Create a strong password for your parent account."}
                    </p>

                    {isChecking ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
                        </div>
                    ) : isComplete ? (
                        <Button
                            asChild
                            className="mt-8 h-12 w-full rounded-xl bg-slate-900 font-medium text-white hover:bg-slate-800"
                        >
                            <Link href="/auth">
                                Return to sign in
                            </Link>
                        </Button>
                    ) : error?.includes("invalid or has expired") ? (
                        <Button
                            asChild
                            className="mt-8 h-12 w-full rounded-xl bg-slate-900 font-medium text-white hover:bg-slate-800"
                        >
                            <Link href="/auth/forgot-password">
                                Request a new link
                            </Link>
                        </Button>
                    ) : (
                        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="password" className="font-medium text-slate-900">
                                    New password
                                </Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="At least 8 characters"
                                    className="h-12 rounded-xl border-slate-200 bg-white focus:border-sky-500 focus:ring-sky-500"
                                    minLength={8}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="font-medium text-slate-900">
                                    Confirm new password
                                </Label>
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="Re-enter your new password"
                                    className="h-12 rounded-xl border-slate-200 bg-white focus:border-sky-500 focus:ring-sky-500"
                                    minLength={8}
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
                                Update password
                            </Button>
                        </form>
                    )}
                </section>
            </div>
        </main>
    );
}
