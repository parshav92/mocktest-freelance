"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
    EmbeddedCheckoutProvider,
    EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { STRIPE_PLANS, type PlanId } from "@/lib/stripe-plans";
import { PlanCards } from "@/components/pricing/plan-cards";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = loadStripe(publishableKey);
const isTestMode = publishableKey.startsWith("pk_test_");

function CheckoutModal({
    planId,
    onClose,
}: {
    planId: PlanId;
    onClose: () => void;
}) {
    const plan = STRIPE_PLANS.find((p) => p.id === planId)!;

    const fetchClientSecret = useCallback(async () => {
        const res = await fetch("/api/stripe/create-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to start checkout");
        return data.clientSecret as string;
    }, [planId]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                    <div>
                        <p className="text-xs text-zinc-400 uppercase font-semibold tracking-wider">
                            Secure Checkout
                        </p>
                        <h2 className="text-lg font-bold text-zinc-900">
                            {plan.name} Plan —{" "}
                            <span className="text-sky-600">{plan.price}</span>
                            <span className="text-zinc-400 text-sm font-normal ml-1">
                                /{plan.period}
                            </span>
                        </h2>
                    </div>
                    <button
                        id="close-checkout-modal"
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-zinc-100 transition-colors text-zinc-400 hover:text-zinc-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-4">
                    <EmbeddedCheckoutProvider
                        stripe={stripePromise}
                        options={{ fetchClientSecret }}
                    >
                        <EmbeddedCheckout />
                    </EmbeddedCheckoutProvider>
                </div>

                {isTestMode && (
                    <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 text-center">
                        <p className="text-xs text-amber-700">
                            Test mode — use card{" "}
                            <code className="font-mono font-semibold">
                                4242 4242 4242 4242
                            </code>
                            , any future date, any CVC
                        </p>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

function SubscribePageInner() {
    const searchParams = useSearchParams();
    const initialPlan = searchParams.get("plan") as PlanId | null;

    const [selectedPlanId, setSelectedPlanId] = useState<PlanId | null>(
        STRIPE_PLANS.find((p) => p.id === initialPlan) ? initialPlan : null,
    );
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleProceedToCheckout = () => {
        if (!selectedPlanId) return;
        setError(null);
        setCheckoutOpen(true);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <header className="border-b bg-white/80 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 border border-sky-100 px-4 py-1.5 text-sm font-medium text-sky-700 mb-4">
                            <Sparkles className="h-3.5 w-3.5" />
                            Add a Student
                        </span>
                        <h1
                            className="text-4xl font-bold text-slate-900 mb-3"
                            style={{ letterSpacing: "-0.03em" }}
                        >
                            Choose Your{" "}
                            <span className="text-sky-600">Plan</span>
                        </h1>
                        <p className="text-slate-500 max-w-lg mx-auto">
                            Each one-time purchase gives one student platform
                            access for the plan duration. Add more students by
                            purchasing additional plans.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <PlanCards
                        plans={STRIPE_PLANS}
                        mode="select"
                        selectedPlanId={selectedPlanId}
                        onSelect={setSelectedPlanId}
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-10 flex flex-col items-center gap-4"
                    >
                        <button
                            id="proceed-to-checkout"
                            onClick={handleProceedToCheckout}
                            disabled={!selectedPlanId}
                            className="inline-flex items-center gap-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-10 py-4 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none"
                        >
                            Proceed to Checkout
                            <ArrowRight className="w-5 h-5" />
                        </button>
                        {!selectedPlanId && (
                            <p className="text-xs text-slate-400">
                                Select a plan above to continue
                            </p>
                        )}
                    </motion.div>
                </div>
            </main>

            <AnimatePresence>
                {checkoutOpen && selectedPlanId && (
                    <CheckoutModal
                        planId={selectedPlanId}
                        onClose={() => setCheckoutOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default function SubscribePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
                </div>
            }
        >
            <SubscribePageInner />
        </Suspense>
    );
}
