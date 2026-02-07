"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type Step = "credentials" | "enroll" | "verify";

export default function AdminLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);

    const [step, setStep] = useState<Step>("credentials");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [factorId, setFactorId] = useState<string | null>(null);
    const [challengeId, setChallengeId] = useState<string | null>(null);

    useEffect(() => {
        const checkExisting = async () => {
            const res = await fetch("/api/admin/mfa/status");
            const data = await res.json();
            if (data?.authenticated && data?.isAdmin && data?.mfaValid) {
                router.replace("/admin");
            }
        };
        checkExisting();
    }, [router]);

    const handleCredentials = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        const { error: signInError } =
            await supabase.auth.signInWithPassword({
                email,
                password,
            });

        if (signInError) {
            setError(signInError.message);
            setLoading(false);
            return;
        }

        const statusRes = await fetch("/api/admin/mfa/status");
        const statusData = await statusRes.json();

        if (!statusData?.isAdmin) {
            await supabase.auth.signOut();
            setError("You are not authorized to access admin tools.");
            setLoading(false);
            return;
        }

        const { data: factors } = await supabase.auth.mfa.listFactors();
        const existingTotp = factors?.totp?.find(
            (factor) => factor.status === "verified"
        );

        if (!existingTotp) {
            const { data: enrollment, error: enrollError } =
                await supabase.auth.mfa.enroll({ factorType: "totp" });

            if (enrollError || !enrollment) {
                setError(enrollError?.message || "Failed to enroll MFA");
                setLoading(false);
                return;
            }

            setFactorId(enrollment.id);
            setQrCode(enrollment.totp?.qr_code ?? null);
            setSecret(enrollment.totp?.secret ?? null);
            setStep("enroll");
            setLoading(false);
            return;
        }

        setFactorId(existingTotp.id);
        setStep("verify");
        setLoading(false);
    };

    const ensureChallenge = async (id: string) => {
        if (challengeId) return challengeId;
        const { data, error: challengeError } =
            await supabase.auth.mfa.challenge({ factorId: id });

        if (challengeError || !data) {
            throw new Error(challengeError?.message || "MFA challenge failed");
        }

        setChallengeId(data.id);
        return data.id;
    };

    const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!factorId) return;
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const code = formData.get("code") as string;

        try {
            const currentChallengeId = await ensureChallenge(factorId);
            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: currentChallengeId,
                code,
            });

            if (verifyError) {
                setError("Invalid code. Please try again.");
                setLoading(false);
                return;
            }

            const res = await fetch("/api/admin/mfa/verify", {
                method: "POST",
            });

            if (!res.ok) {
                setError("Unable to store MFA session. Try again.");
                setLoading(false);
                return;
            }

            router.replace("/admin");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "MFA verification failed"
            );
        } finally {
            setLoading(false);
        }
    };

    const reason = searchParams.get("reason");
    const reasonMessage =
        reason === "mfa"
            ? "Your MFA session expired. Please re-verify."
            : reason === "forbidden"
              ? "Admin access only."
              : null;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 p-6">
            <Card className="w-full max-w-md shadow-2xl rounded-[2rem]">
                <CardContent className="p-8 space-y-6">
                    <div className="text-center">
                        <span className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-emerald-600 text-[10px] font-bold tracking-[0.2em] uppercase">
                            Admin Access
                        </span>
                        <h1 className="text-3xl font-bold text-zinc-900 mt-4">
                            Sign in to Admin
                        </h1>
                        <p className="text-sm text-zinc-600 mt-2">
                            MFA is required for all admin accounts.
                        </p>
                        {reasonMessage && (
                            <p className="text-sm text-orange-600 mt-3">
                                {reasonMessage}
                            </p>
                        )}
                    </div>

                    {step === "credentials" && (
                        <form className="space-y-4" onSubmit={handleCredentials}>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="admin@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                />
                            </div>
                            {error && (
                                <p className="text-sm text-red-600">{error}</p>
                            )}
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Signing in...
                                    </span>
                                ) : (
                                    "Continue"
                                )}
                            </Button>
                        </form>
                    )}

                    {step === "enroll" && (
                        <div className="space-y-4">
                            <p className="text-sm text-zinc-600">
                                Scan the QR code with your authenticator app,
                                then enter the 6-digit code to complete
                                enrollment.
                            </p>
                            {qrCode && (
                                <div className="bg-white border rounded-2xl p-4 flex items-center justify-center">
                                    <div
                                        className="max-w-[200px]"
                                        dangerouslySetInnerHTML={{
                                            __html: qrCode,
                                        }}
                                    />
                                </div>
                            )}
                            {secret && (
                                <p className="text-xs text-zinc-500">
                                    Manual key: <span>{secret}</span>
                                </p>
                            )}
                            <form className="space-y-4" onSubmit={handleVerify}>
                                <div className="space-y-2">
                                    <Label htmlFor="code">Verification code</Label>
                                    <Input
                                        id="code"
                                        name="code"
                                        inputMode="numeric"
                                        placeholder="123456"
                                        required
                                    />
                                </div>
                                {error && (
                                    <p className="text-sm text-red-600">
                                        {error}
                                    </p>
                                )}
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Verifying...
                                        </span>
                                    ) : (
                                        "Verify & Continue"
                                    )}
                                </Button>
                            </form>
                        </div>
                    )}

                    {step === "verify" && (
                        <form className="space-y-4" onSubmit={handleVerify}>
                            <p className="text-sm text-zinc-600">
                                Enter the 6-digit code from your authenticator
                                app.
                            </p>
                            <div className="space-y-2">
                                <Label htmlFor="code">Verification code</Label>
                                <Input
                                    id="code"
                                    name="code"
                                    inputMode="numeric"
                                    placeholder="123456"
                                    required
                                />
                            </div>
                            {error && (
                                <p className="text-sm text-red-600">{error}</p>
                            )}
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Verifying...
                                    </span>
                                ) : (
                                    "Verify & Continue"
                                )}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
