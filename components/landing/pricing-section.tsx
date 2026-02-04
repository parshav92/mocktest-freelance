"use client";

import { Check, ArrowRight, Sparkles } from "lucide-react";

const PricingSection = () => {
    const plans = [
        {
            name: "Starter",
            description: "Perfect for exploring your options",
            price: "$99",
            period: "one-time",
            image: "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=600&auto=format&fit=crop",
            features: [
                "Initial consultation",
                "University shortlist (5 schools)",
                "Basic profile review",
                "Email support",
            ],
            buttonText: "Get Started",
            popular: false,
        },
        {
            name: "Professional",
            description: "Comprehensive guidance for serious applicants",
            price: "$499",
            period: "package",
            image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=600&auto=format&fit=crop",
            features: [
                "Everything in Starter",
                "Unlimited consultations",
                "Essay review & editing",
                "Interview preparation",
                "Application tracking",
            ],
            buttonText: "Most Popular",
            popular: true,
        },
        {
            name: "Premium",
            description: "End-to-end support for guaranteed success",
            price: "$999",
            period: "package",
            image: "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=600&auto=format&fit=crop",
            features: [
                "Everything in Professional",
                "Scholarship guidance",
                "Visa assistance",
                "Post-admission support",
                "1-year mentorship",
            ],
            buttonText: "Contact Us",
            popular: false,
        },
    ];

    return (
        <section className="w-full bg-zinc-100 py-20 px-6">
            <div className="max-w-[1600px] mx-auto">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <span className="inline-flex items-center gap-2 bg-emerald-100 rounded-full px-4 py-2 text-emerald-600 text-[10px] font-bold tracking-[0.2em] uppercase mb-6">
                        <Sparkles className="w-3 h-3" />
                        Pricing Plans
                    </span>
                    <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 heading-tight max-w-2xl mx-auto mb-4">
                        Choose Your Path to{" "}
                        <span className="text-emerald-500">Success</span>
                    </h2>
                    <p className="text-zinc-600 max-w-xl mx-auto">
                        Flexible plans designed to meet your unique educational
                        needs and budget. All plans include our satisfaction
                        guarantee.
                    </p>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className={`bg-white rounded-[2rem] border overflow-hidden transition-transform duration-300 hover:scale-[1.02] ${
                                plan.popular
                                    ? "border-emerald-500 ring-2 ring-emerald-500/20"
                                    : "border-zinc-200"
                            }`}
                        >
                            {/* Card Image */}
                            <div className="relative h-40 overflow-hidden">
                                <img
                                    src={plan.image}
                                    alt={plan.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                {plan.popular && (
                                    <div className="absolute top-4 right-4">
                                        <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                            POPULAR
                                        </span>
                                    </div>
                                )}
                                <div className="absolute bottom-4 left-6">
                                    <h3 className="text-2xl font-bold text-white">
                                        {plan.name}
                                    </h3>
                                </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-6">
                                <p className="text-zinc-600 text-sm mb-4">
                                    {plan.description}
                                </p>

                                {/* Price */}
                                <div className="flex items-baseline gap-2 mb-6">
                                    <span className="text-4xl font-bold text-zinc-900">
                                        {plan.price}
                                    </span>
                                    <span className="text-zinc-500 text-sm">
                                        /{plan.period}
                                    </span>
                                </div>

                                {/* Features */}
                                <ul className="space-y-3 mb-6">
                                    {plan.features.map(
                                        (feature, featureIndex) => (
                                            <li
                                                key={featureIndex}
                                                className="flex items-center gap-3 text-sm text-zinc-600"
                                            >
                                                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                </div>
                                                {feature}
                                            </li>
                                        ),
                                    )}
                                </ul>

                                {/* CTA Button */}
                                <button
                                    className={`w-full group flex items-center justify-center gap-2 rounded-full py-3 px-6 font-medium transition-all duration-300 ${
                                        plan.popular
                                            ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                            : "bg-zinc-900 text-white hover:bg-zinc-800"
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
                <p className="text-center text-zinc-500 text-sm mt-8">
                    All plans include a 30-day money-back guarantee. Need a
                    custom solution?{" "}
                    <a
                        href="/contact"
                        className="text-emerald-600 hover:underline"
                    >
                        Contact us
                    </a>
                </p>
            </div>
        </section>
    );
};

export default PricingSection;
