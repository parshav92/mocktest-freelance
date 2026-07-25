"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

const plans = [
    {
        id: "half_yearly",
        name: "Half Yearly",
        price: 2999,
        duration: "6 months",
        features: [
            "Full access to all mock tests",
            "Detailed performance analytics",
            "Progress tracking",
            "Score history",
        ],
        popular: false,
    },
    {
        id: "yearly",
        name: "Yearly",
        price: 4999,
        duration: "12 months",
        features: [
            "Full access to all mock tests",
            "Detailed performance analytics",
            "Progress tracking",
            "Score history",
            "Priority support",
            "Save ₹999 compared to half-yearly",
        ],
        popular: true,
    },
];

export default function SubscribePage() {
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSubscribe = async (planId: string) => {
        setSelectedPlan(planId);
        setIsLoading(true);
        setError(null);

        try {
            // Simulate Stripe checkout delay
            await new Promise((resolve) => setTimeout(resolve, 1500));

            const res = await fetch("/api/subscriptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: planId }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create subscription");
            }

            // Redirect to create student page with subscription ID
            router.push(
                `/dashboard/students/new?subscription=${data.subscription.id}`,
            );
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Something went wrong",
            );
            setIsLoading(false);
            setSelectedPlan(null);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-neutral-900/80">
                <div className="container mx-auto px-4 py-4">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto">
                    {/* Heading */}
                    <div className="text-center mb-12">
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-4 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-4">
                            <Sparkles className="h-4 w-4" />
                            Add a Student
                        </span>
                        <h1 className="text-4xl font-bold tracking-tight mb-4">
                            Choose Your Plan
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Each subscription provides full access to all mock
                            tests for one student. You can add more students by
                            purchasing additional subscriptions.
                        </p>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mb-8 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-center">
                            {error}
                        </div>
                    )}

                    {/* Plans */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {plans.map((plan) => (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card
                                    className={`relative h-full transition-all duration-300 ${
                                        plan.popular
                                            ? "border-emerald-500 shadow-lg shadow-emerald-500/10"
                                            : "hover:border-emerald-500/50"
                                    }`}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                            <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                                BEST VALUE
                                            </span>
                                        </div>
                                    )}
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-xl">
                                            {plan.name}
                                        </CardTitle>
                                        <div className="mt-2">
                                            <span className="text-4xl font-bold">
                                                ₹{plan.price.toLocaleString()}
                                            </span>
                                            <span className="text-muted-foreground ml-2">
                                                / {plan.duration}
                                            </span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <ul className="space-y-3">
                                            {plan.features.map(
                                                (feature, index) => (
                                                    <li
                                                        key={index}
                                                        className="flex items-start gap-3"
                                                    >
                                                        <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                                                        <span className="text-sm">
                                                            {feature}
                                                        </span>
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                        <Button
                                            className={`w-full h-12 font-medium ${
                                                plan.popular
                                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    : ""
                                            }`}
                                            variant={
                                                plan.popular
                                                    ? "default"
                                                    : "outline"
                                            }
                                            onClick={() =>
                                                handleSubscribe(plan.id)
                                            }
                                            disabled={isLoading}
                                        >
                                            {isLoading &&
                                            selectedPlan === plan.id ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                "Subscribe Now"
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {/* Info */}
                    <p className="text-center text-sm text-muted-foreground mt-8">
                        Secure payment powered by Stripe. Cancel anytime.
                    </p>
                </div>
            </main>
        </div>
    );
}
