import { defineField, defineType } from "sanity";

export const heroSection = defineType({
    name: "heroSection",
    title: "Hero Section",
    type: "document",
    fields: [
        defineField({
            name: "heading",
            title: "Main Heading",
            type: "string",
            description: "The large heading text (e.g. 'Welcome To MockTest')",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "subheading",
            title: "Subheading",
            type: "text",
            description: "The paragraph below the main heading",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "primaryButtonText",
            title: "Primary Button Text",
            type: "string",
            description: "Text for the main CTA button (e.g. 'Free Trial')",
            initialValue: "Free Trial",
        }),
        defineField({
            name: "secondaryButtonText",
            title: "Secondary Button Text",
            type: "string",
            description: "Text for the secondary button (e.g. 'View Pricing')",
            initialValue: "View Pricing",
        }),
    ],
    preview: {
        select: { title: "heading" },
    },
});
