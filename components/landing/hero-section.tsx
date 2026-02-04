"use client";

import { ArrowRight, Users, Award, TrendingUp } from "lucide-react";

const HeroSection = () => {
    return (
        <section className="relative min-h-screen overflow-hidden flex items-center justify-center">
            {/* Background Image with Gradient Overlay */}
            <div className="absolute inset-0 ">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: "url('/landing/ribbon-bg.avif')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                />
                {/* <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/60 to-zinc-950/90" /> */}
            </div>

            {/* Main Content */}
            <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between w-full">
                {/* Left Content */}
                <div className="flex-1 max-w-2xl">
                    {/* Label */}
                    <div className="animate-fade-in-up">
                        <span className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-emerald-600 text-[10px] font-bold tracking-[0.2em] uppercase mb-6">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            Unlock Your Potential
                        </span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-zinc-900 heading-tight mb-6 animate-fade-in-up-delay-1 ">
                        Your Journey to{" "}
                        <span className="text-emerald-600">Academic</span>{" "}
                        Excellence
                    </h1>

                    {/* Subheading */}
                    <p className="text-lg md:text-xl text-zinc-700 font-light max-w-xl mb-8 leading-relaxed animate-fade-in-up-delay-2">
                        Transform your educational aspirations into reality with
                        personalized guidance, expert mentorship, and proven
                        strategies for success.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-wrap gap-3 animate-fade-in-up-delay-3">
                        <button className="group relative overflow-hidden rounded-full bg-gradient-to-b from-neutral-700 via-neutral-800 to-neutral-900 px-5 py-3 pr-12 text-sm font-medium text-white transition-all duration-500 hover:bg-transparent hover:text-[#1a1a1a] border border-transparent hover:border-[#1a1a1a]">
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 bg-white rounded-full transition-all duration-500 ease-out group-hover:scale-[10] group-hover:right-1/2 group-hover:translate-x-1/2" />

                            {/* Text */}
                            <span className="relative z-10 transition-colors duration-500">
                                Create Free Account
                            </span>

                            {/* Arrow circle */}
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1a1a1a]">
                                <ArrowRight className="h-4 w-4" />
                            </span>
                        </button>
                        <button className="rounded-full px-5 py-2.5 text-sm text-zinc-900 font-medium hover:bg-white/80 transition-colors duration-300 shadow-md">
                            Learn More
                        </button>
                    </div>
                </div>
            </div>

            {/* <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-950 to-transparent" /> */}
        </section>
    );
};

export default HeroSection;
