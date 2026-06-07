import { defineField, defineType } from "sanity";

export const aboutSection = defineType({
    name: "aboutSection",
    title: "About Section",
    type: "document",
    fields: [
        defineField({
            name: "heading",
            title: "Heading",
            type: "string",
            description: "Main heading of the about section",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "description",
            title: "Description",
            type: "text",
            description: "Paragraph text in the about section",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "stats",
            title: "Stats",
            type: "array",
            of: [
                {
                    type: "object",
                    fields: [
                        defineField({
                            name: "value",
                            title: "Value",
                            type: "string",
                            description: "e.g. '2,000+' or '95%'",
                            validation: (Rule) => Rule.required(),
                        }),
                        defineField({
                            name: "label",
                            title: "Label",
                            type: "string",
                            description: "e.g. 'Students Enrolled'",
                            validation: (Rule) => Rule.required(),
                        }),
                    ],
                    preview: {
                        select: { title: "value", subtitle: "label" },
                    },
                },
            ],
            validation: (Rule) => Rule.required().min(1),
        }),
    ],
    preview: {
        select: { title: "heading" },
    },
});
