/**
 * Unified plan catalog (landing + subscribe + checkout + labels).
 * plan_key / id are stable slugs; display names can change freely.
 */

export type PlanId = "silver" | "gold" | "platinum";

/** Days after expires_at before access is fully revoked (matches product grace). */
export const GRACE_PERIOD_DAYS = 30;

/** Parent UI: warn when plan ends within this many days. */
export const EXPIRING_SOON_DAYS = 14;

export interface StripePlan {
    id: PlanId;
    name: string;
    description: string;
    price: string;
    priceInCents: number;
    period: string;
    features: string[];
    availability: string;
    buttonText: string;
    popular: boolean;
    stripePriceId: string;
    durationMonths: number;
    /** Stored on subscriptions.plan and students.plan_key */
    planKey: string;
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
        availability: "1 month of access (one-time payment)",
        buttonText: "Get Started",
        popular: false,
        stripePriceId: process.env.STRIPE_PRICE_SILVER ?? "",
        durationMonths: 1,
        planKey: "silver",
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
        availability: "3 months of access (one-time payment)",
        buttonText: "Most Popular",
        popular: true,
        stripePriceId: process.env.STRIPE_PRICE_GOLD ?? "",
        durationMonths: 3,
        planKey: "gold",
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
        availability: "12 months of access (one-time payment)",
        buttonText: "Best Value",
        popular: false,
        stripePriceId: process.env.STRIPE_PRICE_PLATINUM ?? "",
        durationMonths: 12,
        planKey: "platinum",
    },
];

const LEGACY_PLAN_LABELS: Record<string, string> = {
    half_yearly: "Half-Yearly",
    yearly: "Yearly",
};

export function getPlanById(id: string): StripePlan | undefined {
    return STRIPE_PLANS.find((p) => p.id === id);
}

export function getPlanByKey(planKey: string): StripePlan | undefined {
    return STRIPE_PLANS.find((p) => p.planKey === planKey || p.id === planKey);
}

/** Human-readable plan label for dashboards (handles legacy keys). */
export function formatPlanLabel(planKey: string | null | undefined): string {
    if (!planKey) return "Unknown";
    const known = getPlanByKey(planKey);
    if (known) return known.name;
    if (LEGACY_PLAN_LABELS[planKey]) return LEGACY_PLAN_LABELS[planKey];
    return planKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export type EffectivePlanStatus =
    | "active"
    | "expiring_soon"
    | "grace_period"
    | "expired";

export function getEffectivePlanStatus(input: {
    expiresAt: string | Date | null | undefined;
    gracePeriodEndsAt?: string | Date | null;
    status?: string | null;
    now?: Date;
}): EffectivePlanStatus {
    const now = input.now ?? new Date();
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    const graceEnds = input.gracePeriodEndsAt
        ? new Date(input.gracePeriodEndsAt)
        : expiresAt
          ? new Date(
                expiresAt.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
            )
          : null;

    if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
        return input.status === "expired" ? "expired" : "expired";
    }

    if (expiresAt > now) {
        const msLeft = expiresAt.getTime() - now.getTime();
        const daysLeft = msLeft / (24 * 60 * 60 * 1000);
        return daysLeft <= EXPIRING_SOON_DAYS ? "expiring_soon" : "active";
    }

    if (graceEnds && graceEnds > now) {
        return "grace_period";
    }

    return "expired";
}

export function addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

export function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
