import { defineField, defineType } from "sanity";

export const faqItem = defineType({
    name: "faqItem",
    title: "FAQ Item",
    type: "document",
    fields: [
        defineField({
            name: "question",
            title: "Question",
            type: "string",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "answer",
            title: "Answer",
            type: "text",
            validation: (Rule) => Rule.required(),
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
        select: { title: "question" },
    },
});
