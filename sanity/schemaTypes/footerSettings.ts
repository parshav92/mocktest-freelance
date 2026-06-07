import { defineField, defineType } from "sanity";

export const footerSettings = defineType({
    name: "footerSettings",
    title: "Footer Settings",
    type: "document",
    fields: [
        defineField({
            name: "email",
            title: "Support Email",
            type: "string",
            description: "e.g. support@mocktest.com.au",
            validation: (Rule) => Rule.email(),
        }),
        defineField({
            name: "facebookUrl",
            title: "Facebook URL",
            type: "url",
        }),
        defineField({
            name: "instagramUrl",
            title: "Instagram URL",
            type: "url",
        }),
        defineField({
            name: "copyrightText",
            title: "Copyright Text",
            type: "string",
            description: "e.g. '© 2026 MockTest. All rights reserved.'",
        }),
    ],
    preview: {
        prepare() {
            return { title: "Footer Settings" };
        },
    },
});
