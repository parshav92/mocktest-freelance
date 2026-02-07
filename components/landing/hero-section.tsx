"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

const HeroSection = () => {
    return (
        <section className="relative min-h-screen overflow-hidden flex items-center justify-center">
            {/* Background Image with Gradient Overlay */}
            <div className="absolute inset-0 ">
                <div
                    className="absolute inset-0 animate-slide-x"
                    style={{
                        backgroundImage: "url('/landing/ribbon-bg.png')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                />
                {/* <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/60 to-zinc-950/90" /> */}
            </div>
            {/* <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" /> */}
            
            <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" />
            <div className="absolute top-0 -right-4 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '2s' }} />
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-sky-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '4s' }} />

            {/* Main Content */}
            <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between w-full">
                {/* Left Content */}
                <div className="flex-1 max-w-2xl">
                    {/* Label */}
                    <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-zinc-200/80 shadow-sm mb-8 hover:shadow-md transition-shadow duration-300">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-sm font-medium text-zinc-600">
                            Trusted by <span className="text-zinc-900 font-semibold">2,000+</span> students
                        </span>
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-zinc-900  mb-6 animate-fade-in-up-delay-1 heading-tight">
                        Your Journey to{" "}
                        <span className="whitespace-nowrap">
                            <span className="text-emerald-600">Academic</span>{" "}
                            Excellence
                        </span>
                    </h1>

                    {/* Subheading */}
                    <p className="text-lg md:text-xl text-zinc-700 font-light max-w-xl mb-8 leading-relaxed animate-fade-in-up-delay-2">
                        Transform your educational aspirations into reality with
                        personalized guidance, expert mentorship, and proven
                        strategies for success.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-wrap gap-3 animate-fade-in-up-delay-3">
                        <Link
                            href="/auth"
                            className="group relative overflow-hidden rounded-full bg-linear-to-b from-neutral-700 via-neutral-800 to-neutral-900 px-5 py-3 pr-12 text-sm font-medium text-white transition-all duration-500 hover:bg-transparent hover:text-[#1a1a1a] border border-transparent hover:border-[#1a1a1a]"
                        >
                            {/* Background slide effect - expands from arrow circle position */}
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-white rounded-full transition-all duration-800 ease-out group-hover:scale-[8] group-hover:right-1/2 group-hover:translate-x-1/2" />

                            {/* Text */}
                            <span className="relative z-10 transition-colors duration-150 text-white group-hover:text-[#1a1a1a]">
                                Start Learning
                            </span>

                            {/* Arrow circle */}
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1a1a1a]">
                                <ArrowRight className="h-5 w-5" />
                            </span>
                        </Link>

                        <Link
                            href="/about"
                            className="rounded-full px-5 py-2.5 text-sm text-zinc-900 font-medium hover:bg-white/80 transition-colors duration-300 shadow-md"
                        >
                            Learn More
                        </Link>
                    </div>
                </div>
            </div>

            {/* <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-950 to-transparent" /> */}
        </section>
    );
};

export default HeroSection;
