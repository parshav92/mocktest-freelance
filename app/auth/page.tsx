"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    ArrowLeft,
    GraduationCap,
    Users,
    Loader2,
    BookOpen,
    Award,
    TrendingUp,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Role = "student" | "parent" | null;
type AuthMode = "signin" | "signup";

function AuthPageInner() {
    const [selectedRole, setSelectedRole] = useState<Role>(null);
    const [authMode, setAuthMode] = useState<AuthMode>("signin");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [checking, setChecking] = useState(true);

    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirect") || "/dashboard";
    const supabase = createClient();

    // Redirect if already authenticated
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (user) {
                    router.replace(redirectTo);
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
    }, [router, supabase, redirectTo]);

    if (checking) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{
                    background:
                        "linear-gradient(135deg, #7DD3FC 0%, #BAE6FD 50%, #E0F2FE 100%)",
                }}
            >
                <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
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
                window.location.href = redirectTo;
            }
        }

        setIsLoading(false);
    };

    const handleGoogleAuth = async () => {
        setIsLoading(true);
        setError(null);

        const callbackBase = `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`;
        const callbackUrl =
            redirectTo !== "/dashboard"
                ? `${callbackBase}?redirect=${encodeURIComponent(redirectTo)}`
                : callbackBase;

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: callbackUrl,
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
        <div className="min-h-screen bg-white flex items-center justify-center p-4 md:p-8">
            {/* Main Container with rounded borders */}
            <div className="w-[96vw] h-[90vh] bg-white rounded-[3rem] border border-slate-200/50 overflow-hidden flex">
                {/* Left Side - Gradient */}
                <div
                    className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
                    style={{
                        background:
                            "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 30%, #7DD3FC 60%, #BAE6FD 100%)",
                    }}
                >
                    {/* Home Link */}
                    <Link
                        href="/"
                        className="absolute top-6 left-6 z-20 inline-flex items-center gap-2 px-4 py-2 rounded-full  text-white text-sm font-medium transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>

                    {/* Decorative Elements */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
                    </div>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16 xl:px-20">
                        <div className="max-w-md">
                            <h1
                                className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight"
                                style={{ letterSpacing: "-0.04em" }}
                            >
                                Unlock Your Academic Potential
                            </h1>
                            <p className="text-lg text-sky-100 mb-12 leading-relaxed">
                                Join thousands of students achieving excellence
                                through personalized mock tests and expert
                                guidance.
                            </p>

                            {/* Feature List */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <BookOpen className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold">
                                            Comprehensive Tests
                                        </h3>
                                        <p className="text-sky-100 text-sm">
                                            Access 1000+ practice questions
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold">
                                            Track Progress
                                        </h3>
                                        <p className="text-sky-100 text-sm">
                                            Detailed analytics & insights
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <Award className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold">
                                            Achieve Excellence
                                        </h3>
                                        <p className="text-sky-100 text-sm">
                                            Top results guaranteed
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-slate-50/50 relative">
                    {/* Mobile Home Link */}
                    <Link
                        href="/"
                        className="lg:hidden absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Home
                    </Link>

                    <div className="w-full max-w-md">
                        <AnimatePresence mode="wait">
                            {!selectedRole ? (
                                <motion.div
                                    key="role-selection"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-200/50"
                                >
                                    {/* Badge */}
                                    <div className="flex justify-center mb-6">
                                        <span className="inline-flex items-center gap-2 bg-sky-50 rounded-full px-4 py-2 text-sky-700 text-[10px] font-bold tracking-[0.2em] uppercase border border-sky-100">
                                            <span className="w-2 h-2 bg-sky-500 rounded-full" />
                                            LET&apos;S GET STARTED
                                        </span>
                                    </div>

                                    {/* Heading */}
                                    <div className="text-center mb-8">
                                        <h1 className="text-3xl font-bold tracking-tight mb-2 text-slate-900">
                                            Welcome Back!
                                        </h1>
                                        <p className="text-slate-600 text-sm">
                                            Select how you want to continue
                                        </p>
                                    </div>

                                    {/* Role Selection Cards */}
                                    <div className="space-y-3 mb-8">
                                        <button
                                            onClick={() =>
                                                setSelectedRole("student")
                                            }
                                            className="w-full bg-white hover:bg-sky-50/50 transition-all duration-300 rounded-2xl p-5 flex items-center justify-between group border border-slate-200 hover:border-sky-300 hover:shadow-lg"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-sky-100">
                                                    <GraduationCap className="h-6 w-6 text-sky-600" />
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="font-semibold text-lg text-slate-900">
                                                        I&apos;m a Student
                                                    </h3>
                                                    <p className="text-sm text-slate-600">
                                                        Login with your Student
                                                        ID
                                                    </p>
                                                </div>
                                            </div>
                                            <ArrowLeft className="h-5 w-5 text-slate-400 group-hover:text-sky-600 rotate-180 transition-colors" />
                                        </button>

                                        <button
                                            onClick={() =>
                                                setSelectedRole("parent")
                                            }
                                            className="w-full bg-white hover:bg-sky-50/50 transition-all duration-300 rounded-2xl p-5 flex items-center justify-between group border border-slate-200 hover:border-sky-300 hover:shadow-lg"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-sky-100">
                                                    <Users className="h-6 w-6 text-sky-600" />
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="font-semibold text-lg text-slate-900">
                                                        I&apos;m a Parent
                                                    </h3>
                                                    <p className="text-sm text-slate-600">
                                                        Sign in or create an
                                                        account
                                                    </p>
                                                </div>
                                            </div>
                                            <ArrowLeft className="h-5 w-5 text-slate-400 group-hover:text-sky-600 rotate-180 transition-colors" />
                                        </button>
                                    </div>

                                    {/* Footer */}
                                    <div className="text-center space-y-3">
                                        <Link
                                            href="/"
                                            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                                        >
                                            <ArrowLeft className="w-4 h-4" />
                                            Back to Home
                                        </Link>
                                        <p className="text-sm text-slate-600">
                                            Need Help?{" "}
                                            <a
                                                href="/contact"
                                                className="font-semibold text-slate-900 hover:text-sky-600 transition-colors"
                                            >
                                                Contact Support
                                            </a>
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
                                    className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-200/50"
                                >
                                    <button
                                        onClick={resetSelection}
                                        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6 transition-colors"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back
                                    </button>

                                    <div className="text-center mb-8">
                                        <div className="inline-flex p-3 rounded-xl bg-sky-100 mb-4">
                                            <GraduationCap className="h-6 w-6 text-sky-600" />
                                        </div>
                                        <h1 className="text-2xl font-bold tracking-tight mb-2 text-slate-900">
                                            Student Login
                                        </h1>
                                        <p className="text-slate-600 text-sm">
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
                                                className="text-slate-900 font-medium"
                                            >
                                                Student ID
                                            </Label>
                                            <Input
                                                id="studentId"
                                                name="studentId"
                                                placeholder="STU12345"
                                                className="uppercase bg-white border-slate-200 focus:border-sky-500 focus:ring-sky-500 h-12 rounded-xl"
                                                maxLength={8}
                                                required
                                                disabled={isLoading}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="password"
                                                className="text-slate-900 font-medium"
                                            >
                                                Password
                                            </Label>
                                            <Input
                                                id="password"
                                                name="password"
                                                type="password"
                                                placeholder="••••••"
                                                className="bg-white border-slate-200 focus:border-sky-500 focus:ring-sky-500 h-12 rounded-xl"
                                                maxLength={6}
                                                inputMode="numeric"
                                                pattern="[0-9]{6}"
                                                required
                                                disabled={isLoading}
                                            />
                                            <p className="text-xs text-slate-500">
                                                6-digit password
                                            </p>
                                        </div>
                                        <Button
                                            type="submit"
                                            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium"
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
                                    className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-200/50"
                                >
                                    <button
                                        onClick={resetSelection}
                                        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6 transition-colors"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back
                                    </button>

                                    <div className="text-center mb-8">
                                        <div className="inline-flex p-3 rounded-xl bg-sky-100 mb-4">
                                            <Users className="h-6 w-6 text-sky-600" />
                                        </div>
                                        <h1 className="text-2xl font-bold tracking-tight mb-2 text-slate-900">
                                            {authMode === "signin"
                                                ? "Welcome Back"
                                                : "Create Account"}
                                        </h1>
                                        <p className="text-slate-600 text-sm">
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
                                                    className="text-slate-900 font-medium"
                                                >
                                                    Full Name
                                                </Label>
                                                <Input
                                                    id="fullName"
                                                    name="fullName"
                                                    placeholder="John Doe"
                                                    className="bg-white border-slate-200 focus:border-sky-500 focus:ring-sky-500 h-12 rounded-xl"
                                                    required
                                                    disabled={isLoading}
                                                />
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="email"
                                                className="text-slate-900 font-medium"
                                            >
                                                Email
                                            </Label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                placeholder="you@example.com"
                                                className="bg-white border-slate-200 focus:border-sky-500 focus:ring-sky-500 h-12 rounded-xl"
                                                required
                                                disabled={isLoading}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="password"
                                                className="text-slate-900 font-medium"
                                            >
                                                Password
                                            </Label>
                                            <Input
                                                id="password"
                                                name="password"
                                                type="password"
                                                placeholder="••••••••"
                                                className="bg-white border-slate-200 focus:border-sky-500 focus:ring-sky-500 h-12 rounded-xl"
                                                minLength={6}
                                                required
                                                disabled={isLoading}
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium"
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
                                            <div className="w-full border-t border-slate-200"></div>
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-white/80 px-3 text-slate-500 font-medium">
                                                or
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full h-12 bg-white border-slate-200 hover:bg-slate-50 rounded-xl font-medium"
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

                                    <p className="text-center text-sm text-slate-600 mt-6">
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
                                                    className="text-sky-600 hover:text-sky-700 font-semibold transition-colors"
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
                                                    className="text-sky-600 hover:text-sky-700 font-semibold transition-colors"
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
                                        <div className="mt-4 p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 text-sm">
                                            {message}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AuthPage() {
    return (
        <Suspense
            fallback={
                <div
                    className="min-h-screen flex items-center justify-center"
                    style={{
                        background:
                            "linear-gradient(135deg, #7DD3FC 0%, #BAE6FD 50%, #E0F2FE 100%)",
                    }}
                >
                    <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                </div>
            }
        >
            <AuthPageInner />
        </Suspense>
    );
}
