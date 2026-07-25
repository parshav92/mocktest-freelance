import { defineField, defineType } from "sanity";

export const pricingPlan = defineType({
    name: "pricingPlan",
    title: "Pricing Plan",
    type: "document",
    fields: [
        defineField({
            name: "name",
            title: "Plan Name",
            type: "string",
            description: "e.g. 'Gold Subscription'",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "description",
            title: "Description",
            type: "string",
            description: "Short tagline under the plan name",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "price",
            title: "Price",
            type: "string",
            description: "e.g. '$55'",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "period",
            title: "Period",
            type: "string",
            description: "e.g. '3 months'",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "features",
            title: "Features",
            type: "array",
            of: [{ type: "string" }],
            description: "List of features included in this plan",
            validation: (Rule) => Rule.required().min(1),
        }),
        defineField({
            name: "availability",
            title: "Availability Text",
            type: "string",
            description: "e.g. 'Available for 3 months'",
        }),
        defineField({
            name: "buttonText",
            title: "Button Label",
            type: "string",
            description: "e.g. 'Get Started', 'Most Popular'",
            initialValue: "Get Started",
        }),
        defineField({
            name: "popular",
            title: "Mark as Popular",
            type: "boolean",
            description: "Highlights this plan with a badge",
            initialValue: false,
        }),
        defineField({
            name: "stripePriceId",
            title: "Stripe Price ID",
            type: "string",
            description:
                "Stripe Price ID for this plan (e.g. 'price_1ABC...'). Found in Stripe Dashboard → Products.",
        }),
        defineField({
            name: "order",
            title: "Display Order",
            type: "number",
            description: "Lower numbers appear first",
            validation: (Rule) => Rule.required().integer().positive(),
        }),
    ],
    orderings: [
        {
            title: "Display Order",
            name: "orderAsc",
            by: [{ field: "order", direction: "asc" }],
        },
    ],
    preview: {
        select: { title: "name", subtitle: "price" },
    },
});
