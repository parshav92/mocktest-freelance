"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, GraduationCap, Users, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Role = "student" | "parent" | null;
type AuthMode = "signin" | "signup";

export default function AuthPage() {
    const [selectedRole, setSelectedRole] = useState<Role>(null);
    const [authMode, setAuthMode] = useState<AuthMode>("signin");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [checking, setChecking] = useState(true);

    const router = useRouter();
    const supabase = createClient();

    // Redirect if already authenticated
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (user) {
                    router.replace("/dashboard");
                    return;
                }

                // Check for student session
                const res = await fetch("/api/auth/student/verify", {
                    method: "GET",
                });
                if (res.ok) {
                    router.replace("/dashboard");
                    return;
                }
            } catch {
                // Not authenticated, stay on page
            } finally {
                setChecking(false);
            }
        };

        checkAuth();
    }, [router, supabase]);

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const handleParentAuth = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setMessage(null);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const fullName = formData.get("fullName") as string;

        if (authMode === "signup") {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: "parent",
                    },
                },
            });

            if (error) {
                setError(error.message);
            } else {
                setMessage("Check your email to confirm your account.");
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(error.message);
            } else {
                window.location.href = "/dashboard";
            }
        }

        setIsLoading(false);
    };

    const handleGoogleAuth = async () => {
        setIsLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    access_type: "offline",
                    prompt: "consent",
                },
            },
        });

        if (error) {
            setError(error.message);
            setIsLoading(false);
        }
    };

    const handleStudentLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const studentId = formData.get("studentId") as string;
        const password = formData.get("password") as string;

        try {
            const res = await fetch("/api/auth/student/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Login failed");
            } else {
                window.location.href = "/dashboard";
            }
        } catch {
            setError("Something went wrong. Please try again.");
        }

        setIsLoading(false);
    };

    const resetSelection = () => {
        setSelectedRole(null);
        setError(null);
        setMessage(null);
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
                <div
                    className="absolute inset-0 animate-slide-x"
                    style={{
                        backgroundImage: "url('/landing/ribbon-login-bg.avif')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-md">
                <AnimatePresence mode="wait">
                    {!selectedRole ? (
                        <motion.div
                            key="role-selection"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="glass-strong rounded-[2.5rem] p-8 shadow-2xl"
                        >
                            {/* Badge */}
                            <div className="flex justify-center mb-6">
                                <span className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-emerald-600 text-[10px] font-bold tracking-[0.2em] uppercase">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                                    LET&apos;S GET STARTED
                                </span>
                            </div>

                            {/* Heading */}
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold tracking-tight mb-2 text-zinc-900">
                                    Welcome Back!
                                </h1>
                                <p className="text-zinc-600 text-sm">
                                    Select how you want to continue
                                </p>
                            </div>

                            {/* Role Selection Cards */}
                            <div className="space-y-3 mb-8">
                                <button
                                    onClick={() => setSelectedRole("student")}
                                    className="w-full glass hover:bg-white/60 transition-all duration-300 rounded-2xl p-5 flex items-center justify-between group border border-zinc-900/10 hover:border-emerald-500/30 hover:shadow-lg"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-emerald-100">
                                            <GraduationCap className="h-6 w-6 text-emerald-600" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-semibold text-lg text-zinc-900">
                                                I&apos;m a Student
                                            </h3>
                                            <p className="text-sm text-zinc-600">
                                                Login with your Student ID
                                            </p>
                                        </div>
                                    </div>
                                    <ArrowLeft className="h-5 w-5 text-zinc-400 group-hover:text-emerald-600 rotate-180 transition-colors" />
                                </button>

                                <button
                                    onClick={() => setSelectedRole("parent")}
                                    className="w-full glass hover:bg-white/60 transition-all duration-300 rounded-2xl p-5 flex items-center justify-between group border border-zinc-900/10 hover:border-emerald-500/30 hover:shadow-lg"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-emerald-100">
                                            <Users className="h-6 w-6 text-emerald-600" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-semibold text-lg text-zinc-900">
                                                I&apos;m a Parent
                                            </h3>
                                            <p className="text-sm text-zinc-600">
                                                Sign in or create an account
                                            </p>
                                        </div>
                                    </div>
                                    <ArrowLeft className="h-5 w-5 text-zinc-400 group-hover:text-emerald-600 rotate-180 transition-colors" />
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="text-center space-y-3">
                                <p className="text-sm text-zinc-600">
                                    Need Help?{" "}
                                    <a
                                        href="/contact"
                                        className="font-semibold text-zinc-900 hover:text-emerald-600 transition-colors"
                                    >
                                        Contact Support
                                    </a>
                                </p>
                                <p className="text-xs text-zinc-500">
                                    © 2026 Company_Name. All rights reserved.
                                </p>
                            </div>
                        </motion.div>
                    ) : selectedRole === "student" ? (
                        <motion.div
                            key="student-form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="glass-strong rounded-[2.5rem] p-8 shadow-2xl"
                        >
                            <button
                                onClick={resetSelection}
                                className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 mb-6 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </button>

                            <div className="text-center mb-8">
                                <div className="inline-flex p-3 rounded-xl bg-emerald-100 mb-4">
                                    <GraduationCap className="h-6 w-6 text-emerald-600" />
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight mb-2 text-zinc-900">
                                    Student Login
                                </h1>
                                <p className="text-zinc-600 text-sm">
                                    Enter your credentials to continue
                                </p>
                            </div>

                            <form
                                onSubmit={handleStudentLogin}
                                className="space-y-5"
                            >
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="studentId"
                                        className="text-zinc-900 font-medium"
                                    >
                                        Student ID
                                    </Label>
                                    <Input
                                        id="studentId"
                                        name="studentId"
                                        placeholder="STU12345"
                                        className="uppercase glass border-zinc-900/10 focus:border-emerald-500 h-12 rounded-xl"
                                        maxLength={8}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="password"
                                        className="text-zinc-900 font-medium"
                                    >
                                        Password
                                    </Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="••••••"
                                        className="glass border-zinc-900/10 focus:border-emerald-500 h-12 rounded-xl"
                                        maxLength={6}
                                        inputMode="numeric"
                                        pattern="[0-9]{6}"
                                        required
                                        disabled={isLoading}
                                    />
                                    <p className="text-xs text-zinc-500">
                                        6-digit password
                                    </p>
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full h-12 bg-gradient-to-b from-neutral-700 via-neutral-800 to-neutral-900 hover:from-neutral-600 hover:via-neutral-700 hover:to-neutral-800 text-white rounded-xl font-medium shadow-lg"
                                    disabled={isLoading}
                                >
                                    {isLoading && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Sign In
                                </Button>
                            </form>

                            {error && (
                                <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                                    {error}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="parent-form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="glass-strong rounded-[2.5rem] p-8 shadow-2xl"
                        >
                            <button
                                onClick={resetSelection}
                                className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 mb-6 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </button>

                            <div className="text-center mb-8">
                                <div className="inline-flex p-3 rounded-xl bg-emerald-100 mb-4">
                                    <Users className="h-6 w-6 text-emerald-600" />
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight mb-2 text-zinc-900">
                                    {authMode === "signin"
                                        ? "Welcome Back"
                                        : "Create Account"}
                                </h1>
                                <p className="text-zinc-600 text-sm">
                                    {authMode === "signin"
                                        ? "Sign in to manage your students"
                                        : "Get started with your parent account"}
                                </p>
                            </div>

                            <form
                                onSubmit={handleParentAuth}
                                className="space-y-5"
                            >
                                {authMode === "signup" && (
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="fullName"
                                            className="text-zinc-900 font-medium"
                                        >
                                            Full Name
                                        </Label>
                                        <Input
                                            id="fullName"
                                            name="fullName"
                                            placeholder="John Doe"
                                            className="glass border-zinc-900/10 focus:border-emerald-500 h-12 rounded-xl"
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="email"
                                        className="text-zinc-900 font-medium"
                                    >
                                        Email
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        className="glass border-zinc-900/10 focus:border-emerald-500 h-12 rounded-xl"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="password"
                                        className="text-zinc-900 font-medium"
                                    >
                                        Password
                                    </Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="glass border-zinc-900/10 focus:border-emerald-500 h-12 rounded-xl"
                                        minLength={6}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full h-12 bg-gradient-to-b from-neutral-700 via-neutral-800 to-neutral-900 hover:from-neutral-600 hover:via-neutral-700 hover:to-neutral-800 text-white rounded-xl font-medium shadow-lg"
                                    disabled={isLoading}
                                >
                                    {isLoading && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    {authMode === "signin"
                                        ? "Sign In"
                                        : "Create Account"}
                                </Button>
                            </form>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-zinc-900/10"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white/80 px-3 text-zinc-500 font-medium">
                                        or
                                    </span>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full h-12 glass border-zinc-900/10 hover:bg-white/60 rounded-xl font-medium"
                                onClick={handleGoogleAuth}
                                disabled={isLoading}
                            >
                                <svg
                                    className="mr-2 h-4 w-4"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        fill="currentColor"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                Continue with Google
                            </Button>

                            <p className="text-center text-sm text-zinc-600 mt-6">
                                {authMode === "signin" ? (
                                    <>
                                        Don&apos;t have an account?{" "}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAuthMode("signup");
                                                setError(null);
                                                setMessage(null);
                                            }}
                                            className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                                        >
                                            Sign up
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        Already have an account?{" "}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAuthMode("signin");
                                                setError(null);
                                                setMessage(null);
                                            }}
                                            className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                                        >
                                            Sign in
                                        </button>
                                    </>
                                )}
                            </p>

                            {error && (
                                <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                                    {error}
                                </div>
                            )}
                            {message && (
                                <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm">
                                    {message}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
