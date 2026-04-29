"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

const HeroSection = () => {
    return (
        <section className="relative min-h-screen overflow-hidden flex flex-col">
            {/* Background Gradient - Light blue from top to lighter at bottom */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "linear-gradient(180deg, #7DD3FC 0%, #BAE6FD 30%, #E0F2FE 60%, #F0F9FF 100%)",
                }}
            />

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex items-center justify-center px-6 md:px-12 lg:px-20">
                <div className="max-w-4xl mx-auto text-center">
                    {/* Main Heading */}
                    <h1
                        className="mt-24 text-4xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-4 animate-fade-in-up-delay-1 heading-tight"
                        style={{ letterSpacing: "-0.04em" }}
                    >
                        Welcome To{" "}
                        <span className="whitespace-nowrap">
                            <span className="text-sky-600">MockTest</span>
                        </span>
                    </h1>

                    {/* Subheading */}
                    <p className="text-lg md:text-xl text-slate-600 font-light max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up-delay-2">
                        Most Trusted Selective Test Preparation Platform.
                        Transform your educational aspirations into reality with
                        personalized guidance, expert mentorship, and proven
                        strategies for success.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-wrap gap-4 animate-fade-in-up-delay-3 justify-center">
                        <Link
                            href="/free-trial"
                            className="group relative overflow-hidden rounded-full bg-slate-900 px-6 py-3.5 pr-14 text-sm font-medium text-white transition-all duration-500 hover:bg-transparent hover:text-[#1a1a1a] border border-transparent "
                        >
                            {/* Background slide effect - expands from arrow circle position */}
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-white rounded-full transition-all duration-500 ease-out group-hover:scale-[10]" />

                            {/* Text */}
                            <span className="relative z-10 transition-colors duration-200 text-white mix-blend-difference">
                                Free Trial
                            </span>
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-900 transition-transform duration-300 group-hover:translate-x-0.5">
                                <ArrowRight className="h-4 w-4" />
                            </span>
                        </Link>

                        <Link
                            href="/pricing"
                            className="rounded-full px-6 py-3.5 text-sm text-slate-900 font-medium bg-white/60 backdrop-blur-sm border border-slate-200 hover:bg-white/80 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[0.97]"
                        >
                            Subscription Plan
                        </Link>
                    </div>
                </div>
            </div>

            {/* Papers Section */}
            <div className="relative z-10 w-full mt-auto">
                <div className="relative max-w-6xl mx-auto px-6 md:px-12 lg:px-20">
                    {/* Paper Clip */}
                    <div className="absolute left-16 md:left-1/3 md:-translate-x-1/2 -top-6 z-20">
                        <div
                            className="relative"
                            style={{ transform: "rotate(-12deg)" }}
                        >
                            {/* Clip outer */}
                            <div
                                className="w-10 h-20 border-3 border-slate-400 rounded-full bg-transparent"
                                style={{
                                    borderBottomLeftRadius: 0,
                                    borderBottomRightRadius: 0,
                                    borderBottom: "none",
                                }}
                            />
                            {/* Clip inner */}
                            <div
                                className="absolute top-3 left-1/2 -translate-x-1/2 w-5 h-14 border-2 border-slate-400 rounded-full bg-transparent"
                                style={{
                                    borderTopLeftRadius: 0,
                                    borderTopRightRadius: 0,
                                    borderTop: "none",
                                }}
                            />
                        </div>
                    </div>

                    {/* Stacked Papers */}
                    <div className="relative flex justify-center items-end pb-0">
                        {/* Background Paper 3 (leftmost) */}
                        <div
                            className="absolute w-72 md:w-80 lg:w-96 h-64 md:h-72 bg-white rounded-t-2xl shadow-lg border border-slate-200/50 -rotate-6 -translate-x-32 md:-translate-x-40"
                            style={{ bottom: "-20px" }}
                        >
                            <div className="p-6 space-y-3">
                                <div className="h-3 bg-slate-100 rounded w-3/4"></div>
                                <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                                <div className="h-3 bg-slate-100 rounded w-5/6"></div>
                                <div className="mt-4 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded border-2 border-slate-300"></div>
                                        <div className="h-2 bg-slate-100 rounded w-32"></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded border-2 border-slate-300"></div>
                                        <div className="h-2 bg-slate-100 rounded w-28"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Background Paper 2 (rightmost) */}
                        <div
                            className="absolute w-72 md:w-80 lg:w-96 h-64 md:h-72 bg-white rounded-t-2xl shadow-lg border border-slate-200/50 rotate-6 translate-x-32 md:translate-x-40"
                            style={{ bottom: "-20px" }}
                        >
                            <div className="p-6 space-y-3">
                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Mathematics
                                </div>
                                <div className="h-3 bg-slate-100 rounded w-4/5"></div>
                                <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    <div className="h-8 bg-slate-50 rounded border border-slate-200"></div>
                                    <div className="h-8 bg-slate-50 rounded border border-slate-200"></div>
                                    <div className="h-8 bg-slate-50 rounded border border-slate-200"></div>
                                    <div className="h-8 bg-slate-50 rounded border border-slate-200"></div>
                                </div>
                            </div>
                        </div>

                        {/* Main/Front Paper */}
                        <div
                            className="relative w-80 md:w-96 lg:w-[420px] h-72 md:h-80 bg-white rounded-t-2xl shadow-2xl border border-slate-200/50 z-10"
                            style={{ bottom: "-30px" }}
                        >
                            {/* Paper Header */}
                            <div className="p-6 border-b border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">
                                            Mock Test
                                        </div>
                                        <div className="text-lg font-bold text-slate-900">
                                            High School Exam
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500">
                                            Duration
                                        </div>
                                        <div className="text-sm font-semibold text-slate-700">
                                            60 mins
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Paper Content */}
                            <div className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-slate-700">
                                        Q1. What is the capital of France?
                                    </div>
                                    <div className="space-y-1.5 pl-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300"></div>
                                            <span className="text-sm text-slate-600">
                                                London
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3.5 h-3.5 rounded-full border-2 border-sky-500 bg-sky-500"></div>
                                            <span className="text-sm text-slate-900 font-medium">
                                                Paris
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300"></div>
                                            <span className="text-sm text-slate-600">
                                                Berlin
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
