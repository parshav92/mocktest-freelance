"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SearchX, Home, ArrowLeft, Compass } from "lucide-react";

export default function NotFoundPage() {
    const router = useRouter();

    return (
        <div
            className="min-h-screen relative overflow-hidden flex items-center justify-center px-6"
            style={{
                background:
                    "linear-gradient(180deg, #7DD3FC 0%, #BAE6FD 40%, #E0F2FE 70%, #f0f9ff 100%)",
            }}
        >
            {/* Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-20 left-10 w-72 h-72 bg-white/30 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/20 rounded-full blur-3xl" />
            </div>

            {/* Container */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 max-w-lg w-full bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-xl border border-slate-200/50"
            >
                {/* Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="flex justify-center mb-6"
                >
                    <div className="rounded-full bg-sky-100 p-5">
                        <SearchX className="h-12 w-12 text-sky-600" />
                    </div>
                </motion.div>

                {/* Error Code */}
                <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-7xl md:text-8xl font-bold text-center bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent mb-4"
                    style={{ letterSpacing: "-0.04em" }}
                >
                    404
                </motion.h1>

                {/* Title */}
                <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-2xl md:text-3xl font-bold text-center text-slate-900 mb-3"
                    style={{ letterSpacing: "-0.04em" }}
                >
                    Page Not Found
                </motion.h2>

                {/* Description */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center text-slate-600 mb-8"
                >
                    The page you&apos;re looking for doesn&apos;t exist or has
                    been moved. Let&apos;s get you back on track.
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
                        className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-slate-300 text-slate-900 px-6 py-3 text-sm font-medium hover:bg-slate-100 transition-all hover:scale-[0.97]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Go Back
                    </button>

                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 text-white px-6 py-3 text-sm font-medium hover:bg-slate-800 transition-all shadow-lg"
                    >
                        <Home className="h-4 w-4" />
                        Home
                    </Link>

                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 text-white px-6 py-3 text-sm font-medium hover:bg-sky-700 transition-all shadow-lg"
                    >
                        <Compass className="h-4 w-4" />
                        Dashboard
                    </Link>
                </motion.div>

                {/* Additional Help Text */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-center text-sm text-slate-500 mt-8"
                >
                    Need help?{" "}
                    <Link
                        href="/contact"
                        className="text-sky-600 hover:text-sky-700 font-medium"
                    >
                        Contact Support
                    </Link>
                </motion.p>
            </motion.div>
        </div>
    );
}
