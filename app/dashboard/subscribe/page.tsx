"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
    EmbeddedCheckoutProvider,
    EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, ArrowLeft, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { STRIPE_PLANS, type PlanId } from "@/lib/stripe-plans";

const stripePromise = loadStripe(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

// ─── Plan Selection UI ────────────────────────────────────────────────────────

function PlanCards({
    selectedPlanId,
    onSelect,
}: {
    selectedPlanId: PlanId | null;
    onSelect: (id: PlanId) => void;
}) {
    return (
        <div className="grid md:grid-cols-3 gap-6">
            {STRIPE_PLANS.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                return (
                    <motion.div
                        key={plan.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`relative ${plan.popular ? "md:-mt-3 md:mb-3" : ""}`}
                    >
                        {/* Popular glow border */}
                        {plan.popular && (
                            <div className="absolute -inset-0.5 rounded-[1.5rem] overflow-hidden pointer-events-none">
                                <div className="absolute inset-0 animate-glow-drift">
                                    <div
                                        className="absolute -inset-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_30deg,rgba(254,202,202,0.6)_60deg,rgba(254,240,138,0.6)_100deg,rgba(167,243,208,0.55)_140deg,rgba(191,219,254,0.55)_180deg,rgba(221,214,254,0.6)_220deg,rgba(251,207,232,0.6)_260deg,transparent_300deg,transparent_360deg)]"
                                        style={{ filter: "blur(10px)" }}
                                    />
                                </div>
                                <div className="absolute inset-0.5 bg-white rounded-[calc(1.5rem-2px)]" />
                            </div>
                        )}

                        <button
                            id={`plan-select-${plan.id}`}
                            onClick={() => onSelect(plan.id)}
                            className={`relative w-full text-left bg-white rounded-3xl p-7 transition-all duration-300 flex flex-col h-full
                                ${plan.popular ? "" : "border border-zinc-200"}
                                ${isSelected ? "ring-2 ring-sky-500 shadow-lg shadow-sky-100" : "hover:border-zinc-300 hover:shadow-md"}
                            `}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">
                                        MOST POPULAR
                                    </span>
                                </div>
                            )}

                            {/* Selected indicator */}
                            {isSelected && (
                                <div className="absolute top-4 right-4 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 text-white" />
                                </div>
                            )}

                            <div className="mb-4 text-center">
                                <h3 className="text-xl font-bold text-zinc-900 mb-1">
                                    {plan.name}
                                </h3>
                                <p className="text-zinc-500 text-sm">
                                    {plan.description}
                                </p>
                            </div>

                            <div className="h-px bg-zinc-100 mb-4" />

                            <div className="mb-5">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-bold text-zinc-900">
                                        {plan.price}
                                    </span>
                                    <span className="text-zinc-400 text-sm">
                                        /{plan.period}
                                    </span>
                                </div>
                            </div>

                            <ul className="space-y-2.5 flex-1 mb-5">
                                {plan.features.map((f, i) => (
                                    <li
                                        key={i}
                                        className="flex items-start gap-2.5 text-sm text-zinc-600"
                                    >
                                        <div className="w-4.5 h-4.5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                                        </div>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            <p className="text-xs text-zinc-400 text-center mb-4">
                                {plan.availability}
                            </p>

                            <div
                                className={`w-full flex items-center justify-center gap-2 rounded-full py-3 px-5 text-sm font-medium transition-all duration-200
                                    ${isSelected ? "bg-sky-500 text-white" : plan.popular ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"}
                                `}
                            >
                                {isSelected ? "Selected" : plan.buttonText}
                                {!isSelected && (
                                    <ArrowRight className="w-4 h-4" />
                                )}
                            </div>
                        </button>
                    </motion.div>
                );
            })}
        </div>
    );
}

// ─── Checkout Modal ───────────────────────────────────────────────────────────

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
                {/* Modal header */}
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

                {/* Stripe Embedded Checkout */}
                <div className="overflow-y-auto flex-1 p-4">
                    <EmbeddedCheckoutProvider
                        stripe={stripePromise}
                        options={{ fetchClientSecret }}
                    >
                        <EmbeddedCheckout />
                    </EmbeddedCheckoutProvider>
                </div>

                {/* Test mode note */}
                <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 text-center">
                    <p className="text-xs text-amber-700">
                        Test mode — use card{" "}
                        <code className="font-mono font-semibold">
                            4242 4242 4242 4242
                        </code>
                        , any future date, any CVC
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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
            {/* Header */}
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
                    {/* Heading */}
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
                            Each subscription gives one student full platform
                            access. Add more students by purchasing additional
                            subscriptions.
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-8 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Plans */}
                    <PlanCards
                        selectedPlanId={selectedPlanId}
                        onSelect={setSelectedPlanId}
                    />

                    {/* Proceed CTA */}
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

            {/* Checkout Modal */}
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
