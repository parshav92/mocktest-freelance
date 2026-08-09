/**
 * Static tips content for Platinum (tips entitlement).
 * Replace/extend later with CMS if needed.
 */
export interface PlanTip {
    id: string;
    title: string;
    body: string;
}

export const PLAN_TIPS: PlanTip[] = [
    {
        id: "timing",
        title: "Practise under timed conditions",
        body: "Use the full exam timer on every mock. Selective success depends as much on pace as accuracy.",
    },
    {
        id: "review-wrong",
        title: "Review every wrong answer the same day",
        body: "Write one sentence on why the correct option wins. Patterns stick faster than re-reading solutions.",
    },
    {
        id: "weak-topics",
        title: "Prioritise weak topics weekly",
        body: "Pick two weak topics from your SWOT and drill them before your next full mock.",
    },
    {
        id: "writing",
        title: "Writing: plan before you type",
        body: "Spend the first 2–3 minutes outlining structure. Clear planning lifts marks more than longer essays.",
    },
    {
        id: "consistency",
        title: "Short daily practice beats cramming",
        body: "Aim for a steady weekly mock cadence rather than long gaps followed by binge sessions.",
    },
];
