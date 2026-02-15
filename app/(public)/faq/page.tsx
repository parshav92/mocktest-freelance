"use client";

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

const faqItems = [
    {
        question: "What is MockTest and how does it work?",
        answer: "MockTest is an online platform designed to help students prepare for high school exams through practice tests. Students can access a variety of mock tests across different subjects, track their progress, and identify areas that need improvement.",
    },
    {
        question: "How do I create an account?",
        answer: "Creating an account is simple. Click on the 'Start Learning' button on the homepage, select whether you're a student or parent, and follow the registration process. Students will receive login credentials from their parents, while parents can sign up using email or Google authentication.",
    },
    {
        question: "What subjects are covered in the mock tests?",
        answer: "Our platform covers all major high school subjects including Mathematics, Science, English, Social Studies, and more. We regularly update our question bank to align with the latest curriculum and examination patterns.",
    },
    {
        question: "Can parents track their child's progress?",
        answer: "Yes! Parents have access to a dedicated dashboard where they can monitor their child's test scores, track improvement over time, view detailed analytics, and identify subjects that need more attention.",
    },
    {
        question: "How are the mock tests structured?",
        answer: "Our mock tests are designed to replicate real exam conditions. They include multiple-choice questions, fill-in-the-blanks, passage-based questions, and essay-type questions. Each test has a time limit and provides instant results with detailed explanations.",
    },
    {
        question: "Is there a free trial available?",
        answer: "Yes, we offer a free trial period where you can explore our platform and attempt sample tests. This allows you to experience the quality of our content before committing to a subscription plan.",
    },
    {
        question: "What subscription plans are available?",
        answer: "We offer flexible subscription plans including monthly, quarterly, and annual options. Each plan provides full access to all subjects and features. Visit our pricing page for detailed information about each plan.",
    },
    {
        question: "How can I contact support if I have issues?",
        answer: "Our support team is available via email and through the contact form on our website. We typically respond within 24 hours. For urgent issues, premium subscribers have access to priority support.",
    },
];

export default function FAQPage() {
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
                            features, and how to get started with MockTest.
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
                                {faqItems.map((item, index) => (
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
            <Footer />
        </div>
    );
}
