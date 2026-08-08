"use client";

import { Check, ArrowRight } from "lucide-react";
import type { PlanId, StripePlan } from "@/lib/stripe-plans";

export type PlanCardsMode = "landing" | "select";

interface PlanCardsProps {
    plans: StripePlan[];
    mode: PlanCardsMode;
    selectedPlanId?: PlanId | null;
    onSelect?: (id: PlanId) => void;
    onCta?: (id: PlanId) => void;
}

export function PlanCards({
    plans,
    mode,
    selectedPlanId = null,
    onSelect,
    onCta,
}: PlanCardsProps) {
    return (
        <div
            className={
                mode === "landing"
                    ? "grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
                    : "grid md:grid-cols-3 gap-6"
            }
        >
            {plans.map((plan) => {
                const isSelected =
                    mode === "select" && selectedPlanId === plan.id;

                const cardInner = (
                    <>
                        {plan.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">
                                    MOST POPULAR
                                </span>
                            </div>
                        )}

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
                                <span
                                    className={`font-bold text-zinc-900 ${mode === "landing" ? "text-4xl" : "text-3xl"}`}
                                >
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

                        <p className="text-xs text-zinc-400 text-center mb-4 font-medium">
                            {plan.availability}
                        </p>

                        {mode === "landing" ? (
                            <button
                                id={`pricing-cta-${plan.id}`}
                                type="button"
                                onClick={() => onCta?.(plan.id)}
                                className={`w-full group flex items-center justify-center gap-2 rounded-full py-3.5 px-6 font-medium transition-all duration-300 ${
                                    plan.popular
                                        ? "bg-zinc-900 text-white hover:bg-zinc-800"
                                        : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                                }`}
                            >
                                {plan.buttonText}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        ) : (
                            <div
                                className={`w-full flex items-center justify-center gap-2 rounded-full py-3 px-5 text-sm font-medium transition-all duration-200 ${
                                    isSelected
                                        ? "bg-sky-500 text-white"
                                        : plan.popular
                                          ? "bg-zinc-900 text-white"
                                          : "bg-zinc-100 text-zinc-800"
                                }`}
                            >
                                {isSelected ? "Selected" : plan.buttonText}
                                {!isSelected && (
                                    <ArrowRight className="w-4 h-4" />
                                )}
                            </div>
                        )}
                    </>
                );

                return (
                    <div
                        key={plan.id}
                        className={`relative ${plan.popular ? "md:-mt-3 md:mb-3" : ""}`}
                    >
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

                        {mode === "select" ? (
                            <button
                                id={`plan-select-${plan.id}`}
                                type="button"
                                onClick={() => onSelect?.(plan.id)}
                                className={`relative w-full text-left bg-white rounded-3xl p-7 transition-all duration-300 flex flex-col h-full ${
                                    plan.popular
                                        ? ""
                                        : "border border-zinc-200 hover:border-zinc-300"
                                } ${
                                    isSelected
                                        ? "ring-2 ring-sky-500 shadow-lg shadow-sky-100"
                                        : "hover:shadow-md"
                                }`}
                            >
                                {cardInner}
                            </button>
                        ) : (
                            <div
                                className={`relative w-full text-left bg-white rounded-3xl p-8 transition-all duration-300 flex flex-col h-full ${
                                    plan.popular
                                        ? ""
                                        : "border border-zinc-200 hover:border-zinc-300"
                                }`}
                            >
                                {cardInner}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
