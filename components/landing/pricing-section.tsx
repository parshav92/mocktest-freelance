"use client";

import { Check, ArrowRight, Sparkles } from "lucide-react";

interface PricingPlan {
    _id?: string;
    name: string;
    description: string;
    price: string;
    period: string;
    features: string[];
    availability?: string;
    buttonText?: string;
    popular: boolean;
}

interface PricingSectionProps {
    plans?: PricingPlan[];
}

const DEFAULT_PLANS: PricingPlan[] = [
    {
        name: "Silver Subscription",
        description: "Perfect for getting started",
        price: "$30",
        period: "1 month",
        features: [
            "5 full sized mock exams",
            "Reading practice tests",
            "Writing practice tests",
            "Mathematics practice tests",
            "Thinking Skill practice tests",
        ],
        availability: "Available for 1 month",
        buttonText: "Get Started",
        popular: false,
    },
    {
        name: "Gold Subscription",
        description: "Best value for serious learners",
        price: "$55",
        period: "3 months",
        features: [
            "Unlimited full sized mock exams",
            "Reading practice tests",
            "Writing practice tests",
            "Mathematics practice tests",
            "Thinking Skill practice tests",
        ],
        availability: "Available for 3 months",
        buttonText: "Most Popular",
        popular: true,
    },
    {
        name: "Platinum Subscription",
        description: "Complete preparation package",
        price: "$105",
        period: "6 months",
        features: [
            "Unlimited full sized mock exams",
            "Reading practice tests",
            "Writing practice tests",
            "Mathematics practice tests",
            "Thinking Skill practice tests",
            "Weekly Tips and Tricks",
        ],
        availability: "Available for 6 months",
        buttonText: "Best Value",
        popular: false,
    },
];

const PricingSection = ({ plans }: PricingSectionProps) => {
    const activePlans = plans && plans.length > 0 ? plans : DEFAULT_PLANS;

    return (
        <section id="pricing" className="w-full bg-slate-50 py-24 px-6">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <span className="inline-flex items-center gap-2 bg-sky-50 border border-sky-100 rounded-full px-4 py-2 text-sky-600 text-[10px] font-bold tracking-[0.2em] uppercase mb-6">
                        <Sparkles className="w-3 h-3" />
                        Pricing
                    </span>
                    <h2
                        className="text-3xl md:text-5xl font-bold text-slate-900 mb-4"
                        style={{ letterSpacing: "-0.04em" }}
                    >
                        Choose Your <span className="text-sky-600">Plan</span>
                    </h2>
                    <p className="text-slate-500 max-w-lg mx-auto">
                        Start your journey to academic excellence with our
                        straightforward pricing. No hidden fees.
                    </p>
                </div>

                {/* Pricing Grid - 3 columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                    {activePlans.map((plan, index) => (
                        <div
                            key={index}
                            className={`relative ${plan.popular ? "md:-mt-4 md:mb-4" : ""}`}
                        >
                            {/* Animated Glow Border for Popular Plan */}
                            {plan.popular && (
                                <div className="absolute -inset-0.75 rounded-[1.6rem] overflow-hidden">
                                    <div className="absolute inset-0 animate-glow-drift">
                                        <div
                                            className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_30deg,rgba(254,202,202,0.7)_60deg,rgba(254,240,138,0.7)_100deg,rgba(167,243,208,0.65)_140deg,rgba(191,219,254,0.65)_180deg,rgba(221,214,254,0.7)_220deg,rgba(251,207,232,0.7)_260deg,transparent_300deg,transparent_360deg)]"
                                            style={{
                                                filter: "blur(12px)",
                                            }}
                                        />
                                    </div>
                                    <div className="absolute inset-0.75 bg-white rounded-[calc(1.6rem-3px)]" />
                                </div>
                            )}

                            {/* Card */}
                            <div
                                className={`relative bg-white rounded-3xl p-8 transition-all duration-300 h-full flex flex-col ${
                                    plan.popular
                                        ? ""
                                        : "border border-zinc-200 hover:border-zinc-300"
                                }`}
                            >
                                {/* Popular Badge */}
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="bg-linear-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">
                                            MOST POPULAR
                                        </span>
                                    </div>
                                )}

                                {/* Plan Name */}
                                <div className="mb-6">
                                    <h3 className="text-xl font-bold text-zinc-900 mb-1">
                                        {plan.name}
                                    </h3>
                                    <p className="text-zinc-500 text-sm">
                                        {plan.description}
                                    </p>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-zinc-100 mb-6" />

                                {/* Price */}
                                <div className="mb-6">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-bold text-zinc-900">
                                            {plan.price}
                                        </span>
                                        <span className="text-zinc-400 text-sm">
                                            /{plan.period}
                                        </span>
                                    </div>
                                </div>

                                {/* Features */}
                                <ul className="space-y-3 mb-6 flex-1">
                                    {plan.features.map(
                                        (feature, featureIndex) => (
                                            <li
                                                key={featureIndex}
                                                className="flex items-start gap-3 text-sm text-zinc-600"
                                            >
                                                <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                </div>
                                                {feature}
                                            </li>
                                        ),
                                    )}
                                </ul>

                                {/* Availability */}
                                <p className="text-xs text-zinc-500 text-center mb-4 font-medium">
                                    {plan.availability}
                                </p>

                                {/* CTA Button */}
                                <button
                                    className={`w-full group flex items-center justify-center gap-2 rounded-full py-3.5 px-6 font-medium transition-all duration-300 ${
                                        plan.popular
                                            ? "bg-zinc-900 text-white hover:bg-zinc-800"
                                            : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                                    }`}
                                >
                                    {plan.buttonText}
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom Note */}
            </div>
        </section>
    );
};

export default PricingSection;
