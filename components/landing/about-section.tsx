"use client";

import { ArrowRight, Play } from "lucide-react";

interface Stat {
    value: string;
    label: string;
    color?: string;
}

interface AboutSectionProps {
    heading?: string;
    description?: string;
    stats?: Stat[];
}

const DEFAULT_STATS: Stat[] = [
    { value: "2,000+", label: "Students Enrolled", color: "text-sky-500" },
    { value: "50+", label: "Mock Tests Available", color: "text-emerald-500" },
    { value: "95%", label: "Success Rate", color: "text-amber-500" },
];

const STAT_COLORS = ["text-sky-500", "text-emerald-500", "text-amber-500"];

const AboutSection = ({
    heading = "Welcome to MockTest!",
    description = "We provide comprehensive academic preparation to help students excel in their examinations. Our platform offers expertly crafted mock tests, detailed analytics, and personalized insights for academic success.",
    stats,
}: AboutSectionProps) => {
    const activeStats =
        stats && stats.length > 0
            ? stats.map((s, i) => ({ ...s, color: s.color ?? STAT_COLORS[i % STAT_COLORS.length] }))
            : DEFAULT_STATS;

    return (
        <section id="about" className="w-full bg-slate-50 py-48 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* Left Column - Bento Grid */}
                    <div className="relative h-[500px] lg:h-[550px] order-1 lg:order-1">
                        {/* Bento Grid Layout */}
                        <div className="grid grid-cols-2 gap-4 h-full">
                            {/* Top Left - Video */}
                            <div className="relative rounded-2xl overflow-hidden shadow-xl group cursor-pointer">
                                <video
                                    className="w-full h-full object-cover"
                                    poster="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop"
                                    muted
                                    loop
                                    playsInline
                                >
                                    <source
                                        src="/videos/demo1.mp4"
                                        type="video/mp4"
                                    />
                                </video>
                                <div className="absolute inset-0 bg-slate-900/30 group-hover:bg-slate-900/40 transition-colors flex items-center justify-center">
                                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Play className="w-6 h-6 text-slate-900 ml-1" />
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4">
                                    <span className="text-xs font-medium text-white/80 bg-slate-900/50 px-3 py-1 rounded-full backdrop-blur-sm">
                                        Platform Demo
                                    </span>
                                </div>
                            </div>

                            {/* Top Right - Image */}
                            <div className="relative rounded-2xl overflow-hidden shadow-xl">
                                <img
                                    src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=600&auto=format&fit=crop"
                                    alt="Students studying"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                                <div className="absolute bottom-4 left-4">
                                    <span className="text-xs font-medium text-white bg-sky-600/80 px-3 py-1 rounded-full">
                                        Expert Guidance
                                    </span>
                                </div>
                            </div>

                            {/* Bottom Left - Image */}
                            <div className="relative rounded-2xl overflow-hidden shadow-xl">
                                <img
                                    src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=600&auto=format&fit=crop"
                                    alt="Test preparation"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                                <div className="absolute bottom-4 left-4">
                                    <span className="text-xs font-medium text-white bg-emerald-600/80 px-3 py-1 rounded-full">
                                        Practice Tests
                                    </span>
                                </div>
                            </div>

                            {/* Bottom Right - Video */}
                            <div className="relative rounded-2xl overflow-hidden shadow-xl group cursor-pointer">
                                <video
                                    className="w-full h-full object-cover"
                                    poster="https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=600&auto=format&fit=crop"
                                    muted
                                    loop
                                    playsInline
                                >
                                    <source
                                        src="/videos/demo2.mp4"
                                        type="video/mp4"
                                    />
                                </video>
                                <div className="absolute inset-0 bg-slate-900/30 group-hover:bg-slate-900/40 transition-colors flex items-center justify-center">
                                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Play className="w-6 h-6 text-slate-900 ml-1" />
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4">
                                    <span className="text-xs font-medium text-white/80 bg-slate-900/50 px-3 py-1 rounded-full backdrop-blur-sm">
                                        Success Stories
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Content */}
                    <div className="order-2 lg:order-2 max-w-xl">
                        {/* Badge */}
                        <span className="inline-block px-4 py-1.5 mb-6 text-md font-medium text-sky-700 bg-sky-100 rounded-full">
                            About Us
                        </span>

                        {/* Headline */}
                        <h2
                            className="text-4xl md:text-5xl font-bold text-slate-900 mb-6"
                            style={{ letterSpacing: "-0.04em" }}
                        >
                            {heading}
                        </h2>

                        {/* Description */}
                        <p className="text-slate-600 text-lg leading-relaxed mb-6">
                            {description}
                        </p>

                        <p className="text-slate-600 leading-relaxed mb-8">
                            Whether you&apos;re preparing for high school exams
                            or competitive tests, our team ensures a stress-free
                            journey with proven strategies and round-the-clock
                            support.
                        </p>

                        {/* CTA Button */}
                        <button className="group flex items-center gap-3 bg-slate-900 hover:bg-slate-800 rounded-full pl-6 pr-2 py-2 mb-12 transition-all duration-300 hover:scale-[0.98]">
                            <span className="text-white font-medium">
                                Discover More
                            </span>
                            <div className="w-10 h-10 bg-sky-500 group-hover:bg-sky-400 rounded-full flex items-center justify-center transition-colors duration-300">
                                <ArrowRight className="w-4 h-4 text-white" />
                            </div>
                        </button>

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-6">
                            {activeStats.map((stat, index) => (
                                <div
                                    key={index}
                                    className="text-center lg:text-left"
                                >
                                    <div
                                        className={`text-3xl md:text-4xl font-bold ${stat.color} mb-1`}
                                        style={{ letterSpacing: "-0.04em" }}
                                    >
                                        {stat.value}
                                    </div>
                                    <div className="text-md text-slate-500">
                                        {stat.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AboutSection;
