"use client";

import { ArrowRight, Sparkles, ShieldCheck, Target } from "lucide-react";

const WhyUsSection = () => {
    const items = [
        {
            title: "Expert Guidance for Every Step",
            description:
                "From shortlisting to final submissions, our advisors provide a clear roadmap and hands-on support.",
            icon: Sparkles,
            accent: "bg-orange-500",
        },
        {
            title: "Tailored Solutions for Your Goals",
            description:
                "We align university choices, essays, and interviews with your unique profile and ambitions.",
            icon: Target,
            accent: "bg-emerald-500",
        },
        {
            title: "Hassle-Free Application & Visa Support",
            description:
                "Guided checklists, templates, and mock interviews reduce stress while keeping you on track.",
            icon: ShieldCheck,
            accent: "bg-blue-500",
        },
    ];

    return (
        <section className="w-full bg-zinc-50 py-20 px-6">
            <div className="max-w-[1600px] mx-auto">
                <div className="text-center mb-12">
                    <span className="inline-flex items-center gap-2 bg-emerald-100 rounded-full px-4 py-2 text-emerald-600 text-[10px] font-bold tracking-[0.2em] uppercase mb-6">
                        Why Us
                    </span>
                    <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 heading-tight mb-4">
                        Why Company Name?
                    </h2>
                    <p className="text-zinc-600 max-w-2xl mx-auto">
                        Expert guidance for a seamless study journey, backed by
                        proven outcomes and dedicated mentorship.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
                    {/* Image Panel */}
                    <div className="relative h-[360px] sm:h-[420px] lg:h-[460px]">
                        <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl">
                            <img
                                src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1200&auto=format&fit=crop"
                                alt="Guidance session"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-3xl bg-orange-500/20 blur-2xl" />
                        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-3xl bg-emerald-500/20 blur-2xl" />
                    </div>

                    {/* Cards Panel */}
                    <div className="space-y-4">
                        {items.map((item) => (
                            <div
                                key={item.title}
                                className="group rounded-2xl bg-white border border-slate-200/80 shadow-sm p-6 hover:-translate-y-1 transition-transform duration-300"
                            >
                                <div className="flex items-start gap-4">
                                    <div
                                        className={`mt-1 h-10 w-1 rounded-full ${item.accent}`}
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center">
                                                <item.icon className="w-4 h-4 text-zinc-900" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-slate-900">
                                                {item.title}
                                            </h3>
                                        </div>
                                        <p className="text-slate-600 text-sm leading-relaxed">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button className="group inline-flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 rounded-full pl-6 pr-2 py-2 transition-transform duration-300 hover:scale-105">
                            <span className="text-white font-medium">
                                Explore Services
                            </span>
                            <div className="w-10 h-10 bg-emerald-500 group-hover:bg-emerald-400 rounded-full flex items-center justify-center transition-colors duration-300">
                                <ArrowRight className="w-4 h-4 text-white" />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WhyUsSection;
