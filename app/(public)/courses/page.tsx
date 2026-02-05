import Navbar from "@/components/navbar";
import Footer from "@/components/landing/footer";
import { ArrowRight, BookOpenText, CheckCircle2 } from "lucide-react";

const CoursesPage = () => {
    const subjects = [
        "Reading",
        "Mathematical Reasoning",
        "Thinking Skills",
        "Writing",
    ];

    const highlights = [
        {
            title: "Test Subject",
            description:
                "Each practice mock test bundles four core subjects to mirror the real exam structure.",
        },
        {
            title: "Solutions for Attempted Tests",
            description:
                "Correct answers are provided only after you attempt a test. Solutions are uploaded from the admin section for accuracy and transparency.",
        },
        {
            title: "LLM-Evaluated Writing",
            description:
                "Essays or letters submitted in the Writing section are evaluated using an LLM for detailed feedback and improvement tips.",
        },
    ];

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Hero */}
            <section className="relative overflow-hidden pt-28 pb-16">
                <div className="max-w-[1600px] mx-auto px-6">
                    <span className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-emerald-600 text-[10px] font-bold tracking-[0.2em] uppercase">
                        Courses
                    </span>
                    <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 heading-tight mt-4">
                        Practice Mock Tests for
                        <span className="text-emerald-600">
                            {" "}Every Core Subject
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-zinc-700 font-light max-w-2xl mt-4">
                        Build confidence with structured mock tests, verified
                        solutions, and AI-assisted feedback for writing tasks.
                    </p>
                    <div className="flex flex-wrap gap-3 mt-8">
                        <button className="group relative overflow-hidden rounded-full bg-gradient-to-b from-neutral-700 via-neutral-800 to-neutral-900 px-5 py-3 pr-12 text-sm font-medium text-white transition-all duration-500 hover:bg-transparent hover:text-[#1a1a1a] border border-transparent hover:border-[#1a1a1a]">
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-white rounded-full transition-all duration-800 ease-out group-hover:scale-[8] group-hover:right-1/2 group-hover:translate-x-1/2" />
                            <span className="relative z-10 transition-colors duration-150 text-white group-hover:text-[#1a1a1a]">
                                Start a Mock Test
                            </span>
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1a1a1a]">
                                <ArrowRight className="h-5 w-5" />
                            </span>
                        </button>
                        <button className="rounded-full px-5 py-2.5 text-sm text-zinc-900 font-medium hover:bg-white/80 transition-colors duration-300 shadow-md">
                            View Subjects
                        </button>
                    </div>
                </div>
            </section>

            {/* Subjects */}
            <section className="w-full bg-zinc-50 py-16 px-6">
                <div className="max-w-[1600px] mx-auto">
                    <div className="text-center mb-12">
                        <span className="inline-flex items-center gap-2 bg-emerald-100 rounded-full px-4 py-2 text-emerald-600 text-[10px] font-bold tracking-[0.2em] uppercase mb-6">
                            Test Subject
                        </span>
                        <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 heading-tight mb-4">
                            Four Subjects in Every Practice Test
                        </h2>
                        <p className="text-zinc-600 max-w-2xl mx-auto">
                            Each mock test includes a balanced mix of skills so
                            you can track performance across all exam areas.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {subjects.map((subject) => (
                            <div
                                key={subject}
                                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:-translate-y-1 transition-transform duration-300"
                            >
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                                    <BookOpenText className="w-4 h-4 text-emerald-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                                    {subject}
                                </h3>
                                <p className="text-sm text-zinc-600">
                                    Targeted practice with realistic questions
                                    and timed sections.
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="w-full bg-white py-20 px-6">
                <div className="max-w-[1600px] mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
                        <div>
                            <span className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-emerald-600 text-[10px] font-bold tracking-[0.2em] uppercase mb-6">
                                Mock Test Workflow
                            </span>
                            <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 heading-tight mb-4">
                                Verified Solutions and
                                <span className="text-emerald-600">
                                    {" "}LLM Evaluation
                                </span>
                            </h2>
                            <p className="text-zinc-600 max-w-xl">
                                We combine expert-backed answer keys with AI
                                feedback to help you understand mistakes and
                                improve your writing performance.
                            </p>
                            <div className="mt-8 space-y-4">
                                {highlights.map((item) => (
                                    <div
                                        key={item.title}
                                        className="flex items-start gap-4 bg-zinc-50 border border-slate-200/70 rounded-2xl p-5"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-zinc-900">
                                                {item.title}
                                            </h3>
                                            <p className="text-sm text-zinc-600 leading-relaxed">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="rounded-3xl border border-slate-200 shadow-2xl overflow-hidden bg-white">
                                <div className="bg-zinc-900 text-white p-5">
                                    <h3 className="text-lg font-semibold">
                                        Writing Evaluation Snapshot
                                    </h3>
                                    <p className="text-white/70 text-sm mt-1">
                                        Feedback powered by LLM scoring rubric
                                    </p>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-600">
                                            Clarity & Structure
                                        </span>
                                        <span className="text-emerald-600 font-semibold">
                                            8.5/10
                                        </span>
                                    </div>
                                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 w-[85%]" />
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-600">
                                            Grammar & Style
                                        </span>
                                        <span className="text-emerald-600 font-semibold">
                                            8.0/10
                                        </span>
                                    </div>
                                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 w-[80%]" />
                                    </div>

                                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                                        Highlighted insight: Improve paragraph
                                        transitions for stronger flow.
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-3xl bg-emerald-500/20 blur-2xl" />
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default CoursesPage;
