"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldAlert, Home, LogIn, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-white relative overflow-hidden flex items-center justify-center px-6">
            {/* Background Image */}
            <div className="absolute inset-0 z-0" />

            {/* Glassmorphism Container */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 max-w-2xl w-full glass-strong rounded-3xl p-8 md:p-12 shadow-2xl"
            >
                {/* Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="flex justify-center mb-6"
                >
                    <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-6">
                        <ShieldAlert className="h-16 w-16 text-red-600 dark:text-red-400" />
                    </div>
                </motion.div>

                {/* Error Code */}
                <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-8xl md:text-9xl font-bold text-center bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-4"
                >
                    403
                </motion.h1>

                {/* Title */}
                <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-2xl md:text-3xl font-bold text-center text-zinc-900 mb-3"
                >
                    Access Denied
                </motion.h2>

                {/* Description */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center text-zinc-600 mb-8 max-w-md mx-auto"
                >
                    You don't have permission to access this resource. If you
                    believe this is an error, please contact support or sign in
                    with an authorized account.
                </motion.p>

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-3 justify-center"
                >
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-zinc-300 text-zinc-900 px-6 py-3 text-sm font-medium hover:bg-zinc-100 transition-all hover:scale-105"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Go Back
                    </button>

                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 text-white px-6 py-3 text-sm font-medium hover:bg-zinc-800 transition-all hover:scale-105 shadow-lg"
                    >
                        <Home className="h-4 w-4" />
                        Dashboard
                    </Link>

                    <Link
                        href="/auth"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 text-white px-6 py-3 text-sm font-medium hover:bg-emerald-700 transition-all hover:scale-105 shadow-lg"
                    >
                        <LogIn className="h-4 w-4" />
                        Sign In
                    </Link>
                </motion.div>

                {/* Additional Help Text */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-center text-sm text-zinc-500 mt-8"
                >
                    Need help?{" "}
                    <Link
                        href="/contact"
                        className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
                    >
                        Contact Support
                    </Link>
                </motion.p>
            </motion.div>
        </div>
    );
}
