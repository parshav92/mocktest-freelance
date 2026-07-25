/**
 * Unified plan definitions used across the entire app
 * (landing page pricing section + dashboard subscribe page)
 */

export type PlanId = "silver" | "gold" | "platinum";

export interface StripePlan {
    id: PlanId;
    name: string;
    description: string;
    price: string; // display price, e.g. "$30"
    priceInCents: number; // for reference only (Stripe Price ID drives actual amount)
    period: string;
    features: string[];
    availability: string;
    buttonText: string;
    popular: boolean;
    stripePriceId: string; // from env
    /** Duration in months — used to calculate subscription expiry */
    durationMonths: number;
    /** DB plan slug (maps to subscription_plan enum: 'silver' | 'gold' | 'platinum') */
    dbPlan: string;
}

export const STRIPE_PLANS: StripePlan[] = [
    {
        id: "silver",
        name: "Silver",
        description: "Perfect for getting started",
        price: "$30",
        priceInCents: 3000,
        period: "1 month",
        features: [
            "5 full sized mock exams",
            "2027 Selective Simulation Platform",
            "Detailed solution for review",
        ],
        availability: "1 month plan with renewal option",
        buttonText: "Get Started",
        popular: false,
        stripePriceId: process.env.STRIPE_PRICE_SILVER ?? "",
        durationMonths: 1,
        dbPlan: "silver",
    },
    {
        id: "gold",
        name: "Gold",
        description: "Best value for serious learners",
        price: "$55",
        priceInCents: 5500,
        period: "3 months",
        features: [
            "2027 Selective Simulation Platform",
            "Unlimited full sized mock exams",
            "Timed score testing for each exam",
            "Test Performance analysis",
        ],
        availability: "3 months plan with renewal option",
        buttonText: "Most Popular",
        popular: true,
        stripePriceId: process.env.STRIPE_PRICE_GOLD ?? "",
        durationMonths: 3,
        dbPlan: "gold",
    },
    {
        id: "platinum",
        name: "Platinum",
        description: "Ideal to Ace May 2027 Selective Exam",
        price: "$105",
        priceInCents: 10500,
        period: "12 months",
        features: [
            "2027 Selective Simulation Platform",
            "Unlimited full sized mock exams",
            "Timed score testing for each exam",
            "Detailed Performance analysis",
            "Topic-wise marks distribution",
            "Peer group comparative analysis",
            "Periodic Tips and Tricks",
        ],
        availability: "Valid till Selective Exam 2027",
        buttonText: "Best Value",
        popular: false,
        stripePriceId: process.env.STRIPE_PRICE_PLATINUM ?? "",
        durationMonths: 12,
        dbPlan: "platinum",
    },
];

export function getPlanById(id: string): StripePlan | undefined {
    return STRIPE_PLANS.find((p) => p.id === id);
}
