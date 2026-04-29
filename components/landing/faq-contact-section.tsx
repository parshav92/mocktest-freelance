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

const faqItems = [
    {
        question: "What is MockTest and how does it work?",
        answer: "MockTest is an online platform designed to help students prepare for selective high school exams through practice tests. Students can access a variety of mock tests across Reading, Writing, Mathematics, and Thinking Skills, track their progress, and identify areas that need improvement.",
    },
    {
        question: "How do I create an account?",
        answer: "Creating an account is simple. Click on the 'Free Trial' button on the homepage, select whether you're a student or parent, and follow the registration process. Students will receive login credentials from their parents, while parents can sign up using email or Google authentication.",
    },
    {
        question: "What subjects are covered in the mock tests?",
        answer: "Our platform covers all key selective test subjects including Reading, Writing, Mathematics, and Thinking Skills. We regularly update our question bank to align with the latest curriculum and examination patterns.",
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
];

interface FaqContactSectionProps {
    isPage?: boolean;
}

const FaqContactSection = ({ isPage = false }: FaqContactSectionProps) => {
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

                        <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6 md:p-8 max-h-[600px] overflow-y-auto custom-scrollbar">
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
                                Contact{" "}
                                <span className="text-sky-600">Us</span>
                            </h2>
                            <p className="text-slate-600">
                                Have questions about our platform? We&apos;re
                                here to help.
                            </p>
                        </div>

                        <div className="bg-[#7DD3FC] backdrop-blur-sm rounded-3xl border border-slate-700/50 p-6 md:p-8">
                            <form
                                onSubmit={handleSubmit}
                                className="space-y-4"
                            >
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
                                        placeholder="John Doe"
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
                                        placeholder="+91 98765 43210"
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
                                        placeholder="you@example.com"
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
                                        placeholder="How can we help?"
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
                                        placeholder="Tell us about your query..."
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
