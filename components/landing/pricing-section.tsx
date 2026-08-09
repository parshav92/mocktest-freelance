"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { STRIPE_PLANS, type StripePlan } from "@/lib/stripe-plans";
import { PlanCards } from "@/components/pricing/plan-cards";

interface SanityPricingPlan {
    _id?: string;
    name: string;
    description: string;
    price: string;
    period: string;
    features: string[];
    availability?: string;
    buttonText?: string;
    popular: boolean;
    stripePriceId?: string;
}

interface PricingSectionProps {
    plans?: SanityPricingPlan[];
}

function buildDisplayPlans(sanityPlans?: SanityPricingPlan[]): StripePlan[] {
    if (!sanityPlans || sanityPlans.length === 0) return STRIPE_PLANS;

    return STRIPE_PLANS.map((basePlan) => {
        const cms = sanityPlans.find(
            (p) => p.name.toLowerCase() === basePlan.name.toLowerCase(),
        );
        if (!cms) return basePlan;
        return {
            ...basePlan,
            description: cms.description ?? basePlan.description,
            price: cms.price ?? basePlan.price,
            period: cms.period ?? basePlan.period,
            features: cms.features?.length ? cms.features : basePlan.features,
            availability: cms.availability ?? basePlan.availability,
            buttonText: cms.buttonText ?? basePlan.buttonText,
            popular: cms.popular ?? basePlan.popular,
        };
    });
}

const PricingSection = ({ plans }: PricingSectionProps) => {
    const router = useRouter();
    const displayPlans = buildDisplayPlans(plans);

    const handleGetStarted = (planId: string) => {
        router.push(
            `/auth?redirect=${encodeURIComponent(`/dashboard/subscribe?plan=${planId}`)}`,
        );
    };

    return (
        <section id="pricing" className="w-full bg-slate-50 py-24 px-6">
            <div className="max-w-6xl mx-auto">
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

                <PlanCards
                    plans={displayPlans}
                    mode="landing"
                    onCta={handleGetStarted}
                />
            </div>
        </section>
    );
};

export default PricingSection;
