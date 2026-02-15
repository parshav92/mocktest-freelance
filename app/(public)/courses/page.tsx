"use client";

import Navbar from "@/components/navbar";
import Footer from "@/components/landing/footer";
import Link from "next/link";
import { ArrowRight, BookOpenText, CheckCircle2 } from "lucide-react";

const CoursesPage = () => {
    const subjects = [
        {
            name: "Reading",
            description: "Comprehension, vocabulary, and critical analysis",
        },
        {
            name: "Mathematical Reasoning",
            description: "Problem-solving and logical thinking",
        },
        {
            name: "Thinking Skills",
            description: "Verbal and non-verbal reasoning",
        },
        {
            name: "Writing",
            description: "Essays, letters, and creative writing",
        },
    ];

    const highlights = [
        {
            title: "Comprehensive Coverage",
            description:
                "Each mock test bundles all four core subjects to mirror the real exam structure.",
        },
        {
            title: "Instant Solutions",
            description:
                "Correct answers with detailed explanations are provided after test completion.",
        },
        {
            title: "AI-Powered Writing Feedback",
            description:
                "Essays are evaluated using LLM for detailed feedback and improvement tips.",
        },
    ];

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Hero */}
            <section
                className="relative pt-32 pb-20 px-6"
                style={{
                    background:
                        "linear-gradient(180deg, #7DD3FC 0%, #BAE6FD 40%, #E0F2FE 70%, #ffffff 100%)",
                }}
            >
                <div className="max-w-4xl mx-auto text-center">
                    <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-sky-700 bg-white/80 backdrop-blur-sm rounded-full border border-sky-200/50">
                        Courses
                    </span>
                    <h1
                        className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6"
                        style={{ letterSpacing: "-0.04em" }}
                    >
                        Practice Tests for{" "}
                        <span className="text-sky-600">Every Subject</span>
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10">
                        Build confidence with structured mock tests, verified
                        solutions, and AI-assisted feedback for writing tasks.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Link
                            href="/auth"
                            className="group relative overflow-hidden rounded-full bg-slate-900 px-6 py-3.5 pr-14 text-sm font-medium text-white transition-all duration-500 hover:bg-transparent hover:text-slate-900 border border-transparent hover:border-slate-900"
                        >
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-white rounded-full transition-all duration-500 ease-out group-hover:scale-[10]" />
                            <span className="relative z-10 transition-colors duration-200 text-white mix-blend-difference">
                                Start a Mock Test
                            </span>
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-900">
                                <ArrowRight className="h-4 w-4" />
                            </span>
                        </Link>
                        <Link
                            href="#subjects"
                            className="rounded-full px-6 py-3.5 text-sm text-slate-900 font-medium bg-white/60 backdrop-blur-sm border border-slate-200 hover:bg-white/80 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[0.97]"
                        >
                            View Subjects
                        </Link>
                    </div>
                </div>
            </section>

            {/* Subjects */}
            <section id="subjects" className="py-20 px-6 bg-slate-50">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-sky-700 bg-sky-100 rounded-full">
                            Test Subjects
                        </span>
                        <h2
                            className="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
                            style={{ letterSpacing: "-0.04em" }}
                        >
                            Four Subjects in{" "}
                            <span className="text-sky-600">Every Test</span>
                        </h2>
                        <p className="text-slate-600 max-w-2xl mx-auto">
                            Each mock test includes a balanced mix of skills so
                            you can track performance across all exam areas.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {subjects.map((subject) => (
                            <div
                                key={subject.name}
                                className="bg-white rounded-2xl border border-slate-200/80 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center mb-4">
                                    <BookOpenText className="w-5 h-5 text-sky-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                    {subject.name}
                                </h3>
                                <p className="text-sm text-slate-600">
                                    {subject.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="py-20 px-6 bg-white">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-sky-700 bg-sky-100 rounded-full">
                                How It Works
                            </span>
                            <h2
                                className="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
                                style={{ letterSpacing: "-0.04em" }}
                            >
                                Solutions &{" "}
                                <span className="text-sky-600">
                                    AI Evaluation
                                </span>
                            </h2>
                            <p className="text-slate-600 mb-8">
                                We combine expert-backed answer keys with AI
                                feedback to help you understand mistakes and
                                improve your performance.
                            </p>
                            <div className="space-y-4">
                                {highlights.map((item) => (
                                    <div
                                        key={item.title}
                                        className="flex items-start gap-4 bg-slate-50 rounded-2xl p-5 border border-slate-100"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="w-4 h-4 text-sky-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold text-slate-900">
                                                {item.title}
                                            </h3>
                                            <p className="text-sm text-slate-600">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="rounded-3xl border border-slate-200 shadow-xl overflow-hidden bg-white">
                                <div className="bg-slate-900 text-white p-5">
                                    <h3 className="text-lg font-semibold">
                                        Writing Evaluation
                                    </h3>
                                    <p className="text-white/70 text-sm mt-1">
                                        AI-powered feedback
                                    </p>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div>
                                        <div className="flex items-center justify-between text-sm mb-2">
                                            <span className="text-slate-600">
                                                Clarity & Structure
                                            </span>
                                            <span className="text-sky-600 font-semibold">
                                                8.5/10
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-sky-500 to-sky-400 w-[85%]" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between text-sm mb-2">
                                            <span className="text-slate-600">
                                                Grammar & Style
                                            </span>
                                            <span className="text-sky-600 font-semibold">
                                                8.0/10
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-sky-500 to-sky-400 w-[80%]" />
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-700">
                                        💡 Improve paragraph transitions for
                                        stronger flow.
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-3xl bg-sky-500/20 blur-2xl" />
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default CoursesPage;
