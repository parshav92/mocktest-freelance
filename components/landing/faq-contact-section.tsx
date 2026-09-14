"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const defaultFaqItems = [
    {
        question: "How can I receive technical support?",
        answer: "You can reach out via Contact Us page. As a Sydney-based platform, we are here to help with any technical or account related queries.",
    },
    {
        question:
            "How is this website offering different compared to traditional coaching?",
        answer: "Unlike rigid, expensive coaching (often $700+), and limited test offering of traditional coaching, we offer a flexible, AI-powered platform. We provide immediate feedback and unlimited timed mock exams that simulate the real Selective Test Environment, ensuring the student builds the digital literacy required for the current NSW Department of Education format.",
    },
    {
        question:
            "What is the best way to prepare for the 2026 NSW Selective High School Placement Test?",
        answer: "The most effective preparation involves consistent practice with materials that match the official computer-based format. This website through subscription plan provides over 3000+ NSW selective-style questions, including Reading, Mathematical Reasoning, Thinking Skills, and Writing, designed specifically for NSW and Sydney students aiming for top-tier schools.",
    },
    {
        question:
            "Are the mock tests similar to the official computer-based Selective Test?",
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
        answer: "Our dashboard provides accurate progress tracking and identifies specific \"knowledge gaps.\" You can see your child's growth across all four test components, allowing you to focus their study sessions on the areas that will most impact their final score. Parents also receive a weekly summary of their child's study activity highlighting strong areas and areas that need more work, giving parents a clear insight to improvement opportunities.",
    },
    {
        question: "Can I retake the practice sets and mock exams?",
        answer: "Students have unlimited retakes for all mock tests and practice sets during their subscription period. We encourage retaking tests to master difficult concepts and improve speed, which are critical factors for success in competitive selective schools.",
    },
    {
        question: "Can I use one account for multiple students?",
        answer: 'No. Each account is strictly for a single student. Our "Custom Mock Exams" and progress tracking are personalised to each student. Sharing an account would merge data of multiple learners, making the feedback and performance insights inaccurate.',
    },
];

interface FaqContactSectionProps {
    isPage?: boolean;
    faqItems?: Array<{ _id?: string; question: string; answer: string }>;
}

const FaqContactSection = ({
    isPage = false,
    faqItems,
}: FaqContactSectionProps) => {
    const activeFaqItems =
        faqItems && faqItems.length > 0 ? faqItems : defaultFaqItems;
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate form submission
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsSubmitting(false);
    };

    return (
        <section
            id="faq"
            className={`w-full ${isPage ? "min-h-screen pt-24" : ""} py-20 px-6`}
        >
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
                    {/* Left Column - FAQ */}
                    <div>
                        <div className="mb-8">
                            <span className="inline-block px-4 py-1.5 mb-6 text-md font-medium text-sky-700 bg-sky-100 rounded-full">
                                FAQ
                            </span>
                            <h2
                                className="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
                                style={{ letterSpacing: "-0.04em" }}
                            >
                                Frequently Asked{" "}
                                <span className="text-sky-600">Questions</span>
                            </h2>
                            <p className="text-slate-600">
                                Find answers to common questions about our
                                platform, features, and how to get started.
                            </p>
                        </div>

                        <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6 py-4 md:p-8 md:py-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                            <Accordion
                                type="single"
                                collapsible
                                className="w-full"
                            >
                                {activeFaqItems.map((item, index) => (
                                    <AccordionItem
                                        key={index}
                                        value={`item-${index}`}
                                    >
                                        <AccordionTrigger className="text-left">
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

                    {/* Right Column - Contact Us */}
                    <div id="contact">
                        <div className="mb-8">
                            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-white bg-sky-900 rounded-full border border-sky-700/50">
                                Get in Touch
                            </span>
                            <h2
                                className="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
                                style={{ letterSpacing: "-0.04em" }}
                            >
                                Contact <span className="text-sky-600">Us</span>
                            </h2>
                            <p className="text-slate-600">
                                Have questions about our platform? We&apos;re
                                here to help.
                            </p>
                        </div>

                        <div className="bg-[#7DD3FC] backdrop-blur-sm rounded-3xl border border-slate-700/50 p-6 md:p-8">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="fullName"
                                        className="text-black text-sm font-medium"
                                    >
                                        Full Name
                                    </Label>
                                    <Input
                                        id="fullName"
                                        name="fullName"
                                        placeholder="Enter your full name"
                                        className="bg-white focus:border-sky-500 text-black placeholder:text-slate-400 h-12 rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="contactPhone"
                                        className="text-black text-sm font-medium"
                                    >
                                        Phone
                                    </Label>
                                    <Input
                                        id="contactPhone"
                                        name="phone"
                                        type="tel"
                                        placeholder="Enter your phone number"
                                        className="bg-white focus:border-sky-500 text-black placeholder:text-slate-400 h-12 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="contactEmail"
                                        className="text-black text-sm font-medium"
                                    >
                                        Email
                                    </Label>
                                    <Input
                                        id="contactEmail"
                                        name="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        className="bg-white focus:border-sky-500 text-black placeholder:text-slate-400 h-12 rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="contactSubject"
                                        className="text-black text-sm font-medium"
                                    >
                                        Subject
                                    </Label>
                                    <Input
                                        id="contactSubject"
                                        name="subject"
                                        placeholder="What can we help with?"
                                        className="bg-white focus:border-sky-500 text-black placeholder:text-slate-400 h-12 rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="contactMessage"
                                        className="text-black text-sm font-medium"
                                    >
                                        Message
                                    </Label>
                                    <textarea
                                        id="contactMessage"
                                        name="message"
                                        placeholder="Share a few details so we can help."
                                        rows={3}
                                        className="w-full bg-white focus:border-sky-500 text-black placeholder:text-slate-400 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                        required
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full h-12 bg-white text-black rounded-xl font-medium shadow-lg transition-all duration-300 hover:bg-white/80"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        "Sending..."
                                    ) : (
                                        <>
                                            Submit
                                            <Send className="ml-2 w-4 h-4" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FaqContactSection;
