"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

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
];

const FAQSection = () => {
    return (
        <section
            id="faq"
            className="w-full py-24 px-6"
            style={{
                background:
                    "linear-gradient(180deg, #f8fafc 0%, #f0f9ff 50%, #e0f2fe 100%)",
            }}
        >
            <div className="max-w-4xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-sky-700 bg-sky-100 rounded-full">
                        FAQ
                    </span>
                    <h2
                        className="text-3xl md:text-5xl font-bold text-slate-900 mb-4"
                        style={{ letterSpacing: "-0.04em" }}
                    >
                        Frequently Asked{" "}
                        <span className="text-sky-600">Questions</span>
                    </h2>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        Find answers to common questions about our platform,
                        features, and how to get started.
                    </p>
                </div>

                {/* FAQ Accordion */}
                <div className="bg-slate-50 rounded-3xl border border-slate-100 p-8 md:p-12">
                    <Accordion type="single" collapsible className="w-full">
                        {faqItems.map((item, index) => (
                            <AccordionItem key={index} value={`item-${index}`}>
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
    );
};

export default FAQSection;
