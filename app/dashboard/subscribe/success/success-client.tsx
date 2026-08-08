"use client";

import { motion } from "framer-motion";
import { CheckCircle, ArrowRight, UserPlus } from "lucide-react";
import Link from "next/link";

interface Props {
    planName: string;
    planPrice: string;
    planPeriod: string;
    subscriptionId: string;
    customerEmail: string;
}

export default function SuccessClient({
    planName,
    planPrice,
    planPeriod,
    subscriptionId,
    customerEmail,
}: Props) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                        delay: 0.2,
                        type: "spring",
                        stiffness: 200,
                        damping: 15,
                    }}
                    className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                </motion.div>

                <h1
                    className="text-3xl font-bold text-slate-900 mb-2"
                    style={{ letterSpacing: "-0.03em" }}
                >
                    Payment Successful!
                </h1>
                <p className="text-slate-500 mb-8">
                    Your{" "}
                    <span className="font-semibold text-slate-700">
                        {planName}
                    </span>{" "}
                    plan is now active.
                </p>

                <div className="bg-slate-50 rounded-2xl p-5 mb-8 text-left space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Plan</span>
                        <span className="font-semibold text-slate-800">
                            {planName}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Amount paid</span>
                        <span className="font-semibold text-slate-800">
                            {planPrice} / {planPeriod}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Confirmation sent to</span>
                        <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                            {customerEmail}
                        </span>
                    </div>
                </div>

                <div className="space-y-3">
                    <Link
                        id="create-student-cta"
                        href={`/dashboard/students/new?subscription=${subscriptionId}`}
                        className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-4 rounded-full transition-colors"
                    >
                        <UserPlus className="w-5 h-5" />
                        Create Student Profile
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                        href="/dashboard"
                        className="flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3.5 rounded-full transition-colors text-sm"
                    >
                        Go to Dashboard
                    </Link>
                </div>

                <p className="text-xs text-slate-400 mt-6">
                    Reference:{" "}
                    <code className="font-mono">
                        {subscriptionId.slice(0, 8)}…
                    </code>
                </p>
            </motion.div>
        </div>
    );
}
