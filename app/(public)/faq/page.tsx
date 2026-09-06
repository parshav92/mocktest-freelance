import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/landing/footer";
import { getFaqItems, getFooterSettings } from "@/lib/sanity/queries";

const DEFAULT_FAQ_ITEMS = [
    {
        question: "How can I receive technical support?",
        answer: "You can reach out via Contact Us page. As a Sydney-based platform, we are here to help with any technical or account related queries.",
    },
    {
        question: "How is this website offering different compared to traditional coaching?",
        answer: "Unlike rigid, expensive coaching (often $700+), and limited test offering of traditional coaching, we offer a flexible, AI-powered platform. We provide immediate feedback and unlimited timed mock exams that simulate the real Selective Test Environment, ensuring the student builds the digital literacy required for the current NSW Department of Education format.",
    },
    {
        question: "What is the best way to prepare for the 2026 NSW Selective High School Placement Test?",
        answer: "The most effective preparation involves consistent practice with materials that match the official computer-based format. This website through subscription plan provides over 3000+ NSW selective-style questions, including Reading, Mathematical Reasoning, Thinking Skills, and Writing, designed specifically for NSW and Sydney students aiming for top-tier schools.",
    },
    {
        question: "Are the mock tests similar to the official computer-based Selective Test?",
        answer: "Yes. The NSW Selective Test is now fully computer-based, our platform simulates similar environment. Our 60+ full-length mock exams replicate the timing, navigation, and difficulty level of the official test, helping students master time management and reduce exam-day anxiety.",
    },
    {
        question: "Can my child get feedback on their Writing responses?",
        answer: "Yes. This website offers immediate and comprehensive feedback for writing responses. Our system evaluates structure, vocabulary, and grammar, providing the instant guidance needed to reach Top 10% standards without waiting days for a tutor to mark a paper.",
    },
    {
        question: "How many mock tests can my child attempt?",
        answer: "Once enrolled, student can attempt unlimited mock tests of Reading, Mathematical Reasoning, Thinking Skills, and Writing, designed specifically for NSW and Sydney students aiming for top-tier schools. Our 60+ full-length mock exams replicate the timing, navigation, and difficulty level of the official test, helping students master time management and reduce exam-day anxiety.",
    },
    {
        question: "How can I track my child's performance and progress?",
        answer: 'Our dashboard provides accurate progress tracking and identifies specific "knowledge gaps." You can see your child\'s growth across all four test components, allowing you to focus their study sessions on the areas that will most impact their final score.',
    },
    {
        question: "Can I retake the practice sets and mock exams?",
        answer: "Students have unlimited retakes for all mock tests and practice sets during their subscription period. We encourage retaking tests to master difficult concepts and improve speed, which are critical factors for success in competitive selective schools.",
    },
    {
        question: "Can I use one account for multiple students?",
        answer: "No. Each account is strictly for a single student. Our \"Custom Mock Exams\" and progress tracking are personalised to each student. Sharing an account would merge data of multiple learners, making the feedback and performance insights inaccurate.",
    },
];

export default async function FAQPage() {
    const [sanityFaq, footer] = await Promise.all([
        getFaqItems(),
        getFooterSettings(),
    ]);
    const faqItems =
        sanityFaq && sanityFaq.length > 0 ? sanityFaq : DEFAULT_FAQ_ITEMS;

    return (
        <div className="min-h-screen">
            <Navbar />
            <div className="bg-gradient-to-b from-sky-50 to-white">
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 px-6 md:px-12 lg:px-20">
                    <div className="max-w-4xl mx-auto text-center">
                        <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-sky-700 bg-sky-100 rounded-full">
                            Support
                        </span>
                        <h1
                            className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6"
                            style={{ letterSpacing: "-0.04em" }}
                        >
                            Frequently Asked{" "}
                            <span className="text-sky-600">Questions</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
                            Find answers to common questions about our platform,
                            features, and how to get started with Selectorial.
                        </p>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="py-12 px-6 md:px-12 lg:px-20">
                    <div className="max-w-3xl mx-auto">
                        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8 md:p-12">
                            <Accordion
                                type="single"
                                collapsible
                                className="w-full"
                            >
                                {faqItems.map((item: { _id?: string; question: string; answer: string }, index: number) => (
                                    <AccordionItem
                                        key={index}
                                        value={`item-${index}`}
                                    >
                                        <AccordionTrigger>
                                            {item.question}
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            {item.answer}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 px-6 md:px-12 lg:px-20">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="bg-gradient-to-br from-sky-100 to-blue-50 rounded-3xl p-12 md:p-16 border border-sky-200/50">
                            <h2
                                className="text-2xl md:text-3xl font-bold text-slate-900 mb-4"
                                style={{ letterSpacing: "-0.04em" }}
                            >
                                Still have questions?
                            </h2>
                            <p className="text-slate-600 mb-8 max-w-xl mx-auto">
                                Can&apos;t find the answer you&apos;re looking
                                for? Please reach out to our friendly team.
                            </p>
                            <Link
                                href="/contact"
                                className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-full font-medium hover:bg-slate-800 transition-colors shadow-lg"
                            >
                                Contact Us
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
            <Footer
                email={footer?.email}
                facebookUrl={footer?.facebookUrl}
                instagramUrl={footer?.instagramUrl}
                copyrightText={footer?.copyrightText}
            />
        </div>
    );
}
