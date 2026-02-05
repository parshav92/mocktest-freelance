"use client";

import { Check, Zap } from "lucide-react";

const ProductivitySection = () => {
    const steps = [
        {
            number: "01",
            title: "Personalized Assessment",
            description:
                "We analyze your academic profile, interests, and goals to create a tailored roadmap for your educational journey.",
        },
        {
            number: "02",
            title: "Expert Guidance",
            description:
                "Our experienced counselors provide one-on-one mentoring, helping you navigate every step from application to acceptance.",
        },
    ];

    const codeSnippets = [
        { label: "Daily MockTest", status: "completed" },
        { label: "Weekly Reviews", status: "completed" },
        { label: "Parental Control", status: "completed" },
    ];

    return (
        <section className="w-full bg-[#18181B] py-20 px-6  relative overflow-hidden">
            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 grid-pattern opacity-50" />

            {/* Grain Overlay */}
            <div className="grain-overlay absolute inset-0" />

            <div className="relative z-10 max-w-[1600px] mx-auto">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <span className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-emerald-400 text-[10px] font-bold tracking-[0.2em] uppercase mb-6">
                        <Zap className="w-3 h-3" />
                        How It Works
                    </span>
                    <h2 className="text-3xl md:text-5xl font-bold text-white heading-tight max-w-2xl mx-auto">
                        Streamlined Process for{" "}
                        <span className="text-emerald-400">Maximum Results</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* Left Column - Steps */}
                    <div className="space-y-6">
                        {steps.map((step, index) => (
                            <div
                                key={index}
                                className="glass rounded-2xl p-6 hover:bg-white/[0.08] transition-colors duration-300"
                            >
                                <div className="flex items-start gap-4">
                                    <span className="text-4xl font-bold text-emerald-400/30">
                                        {step.number}
                                    </span>
                                    <div>
                                        <h3 className="text-xl font-semibold text-white mb-2">
                                            {step.title}
                                        </h3>
                                        <p className="text-white/60 leading-relaxed">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Additional Step Cards */}
                        <div className="glass rounded-2xl p-6 hover:bg-white/[0.08] transition-colors duration-300">
                            <div className="flex items-start gap-4">
                                <span className="text-4xl font-bold text-emerald-400/30">
                                    03
                                </span>
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">
                                        Success Achieved
                                    </h3>
                                    <p className="text-white/60 leading-relaxed">
                                        Celebrate your acceptance to your dream
                                        university with our continued support for
                                        visa and enrollment.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - 3D Mock Window */}
                    <div className="relative">
                        <div
                            className="glass rounded-2xl p-1 transform rotate-2 hover:rotate-0 transition-transform duration-500"
                            style={{
                                perspective: "1000px",
                                transformStyle: "preserve-3d",
                            }}
                        >
                            {/* Window Header */}
                            <div className="bg-zinc-800/50 rounded-t-xl px-4 py-3 flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <span className="ml-4 text-white/40 text-sm">
                                    student-dashboard.tsx
                                </span>
                            </div>

                            {/* Window Content */}
                            <div className="bg-zinc-900/80 rounded-b-xl p-6 space-y-4">
                                {/* Code Snippets */}
                                {codeSnippets.map((snippet, index) => (
                                    <div
                                        key={index}
                                        className="glass rounded-xl p-4 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                    snippet.status === "completed"
                                                        ? "bg-emerald-500/20"
                                                        : "bg-yellow-500/20"
                                                }`}
                                            >
                                                <Check
                                                    className={`w-4 h-4 ${
                                                        snippet.status === "completed"
                                                            ? "text-emerald-400"
                                                            : "text-yellow-400"
                                                    }`}
                                                />
                                            </div>
                                            <span className="text-white/80 font-mono text-sm">
                                                {snippet.label}
                                            </span>
                                        </div>
                                        <span
                                            className={`text-xs px-2 py-1 rounded-full ${
                                                snippet.status === "completed"
                                                    ? "bg-emerald-500/20 text-emerald-400"
                                                    : "bg-yellow-500/20 text-yellow-400"
                                            }`}
                                        >
                                            {snippet.status}
                                        </span>
                                    </div>
                                ))}

                                {/* Progress Bar */}
                               
                            </div>

                            {/* Animated Status Tag */}
                            
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProductivitySection;
