import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./sanity/schemaTypes";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

export default defineConfig({
    name: "mocktest-studio",
    title: "MockTest CMS",
    projectId,
    dataset,
    plugins: [
        structureTool({
            structure: (S) =>
                S.list()
                    .title("Content")
                    .items([
                        S.listItem()
                            .title("Hero Section")
                            .child(
                                S.document()
                                    .schemaType("heroSection")
                                    .documentId("heroSection")
                            ),
                        S.listItem()
                            .title("About Section")
                            .child(
                                S.document()
                                    .schemaType("aboutSection")
                                    .documentId("aboutSection")
                            ),
                        S.listItem()
                            .title("Footer Settings")
                            .child(
                                S.document()
                                    .schemaType("footerSettings")
                                    .documentId("footerSettings")
                            ),
                        S.divider(),
                        S.documentTypeListItem("pricingPlan").title("Pricing Plans"),
                        S.documentTypeListItem("testimonial").title("Testimonials"),
                        S.documentTypeListItem("faqItem").title("FAQ Items"),
                        S.documentTypeListItem("whyUsItem").title("Why Us Items"),
                    ]),
        }),
        visionTool(),
    ],
    schema: {
        types: schemaTypes,
    },
});
