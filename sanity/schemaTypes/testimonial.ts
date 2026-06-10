import { defineField, defineType } from "sanity";

export const testimonial = defineType({
    name: "testimonial",
    title: "Testimonial",
    type: "document",
    fields: [
        defineField({
            name: "name",
            title: "Name",
            type: "string",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "role",
            title: "Role",
            type: "string",
            description: "e.g. 'Parent' or 'Student, Year 6'",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "content",
            title: "Review Content",
            type: "text",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "rating",
            title: "Rating (1–5)",
            type: "number",
            validation: (Rule) => Rule.required().min(1).max(5).integer(),
            initialValue: 5,
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
        select: { title: "name", subtitle: "role" },
    },
});
