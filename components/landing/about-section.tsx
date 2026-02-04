"use client";

import { ArrowRight } from "lucide-react";

const AboutSection = () => {
    const stats = [
        {
            value: "200+",
            label: "Students Accepted",
            color: "text-emerald-500",
        },
        { value: "50+", label: "Partner Universities", color: "text-blue-500" },
        {
            value: "$2M+",
            label: "Scholarships Secured",
            color: "text-orange-500",
        },
    ];

    return (
        <section className="w-full bg-white py-20 px-6">
            <div className="max-w-[1600px] mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    {/* Left Column - Image Stack */}
                    <div className="relative h-[500px] lg:h-[600px] order-1 lg:order-1">
                        {/* Decorative Elements */}
                        <div className="absolute top-8 left-8 w-16 h-8 bg-orange-400 rounded-full opacity-80 -z-0" />
                        <div className="absolute bottom-24 left-1/2 text-blue-500 text-4xl font-bold opacity-60 -z-0">
                            ✕
                        </div>

                        {/* Image Grid - Masonry Style */}
                        <div className="relative h-full">
                            {/* Top Left Image */}
                            <div className="absolute top-0 left-0 w-[45%] h-[45%] rounded-2xl overflow-hidden shadow-xl animate-fade-in-up">
                                <img
                                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop"
                                    alt="Students collaborating"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                />
                            </div>

                            {/* Top Right Image */}
                            <div className="absolute top-8 right-0 w-[48%] h-[40%] rounded-2xl overflow-hidden shadow-xl animate-fade-in-up-delay-1">
                                <img
                                    src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=600&auto=format&fit=crop"
                                    alt="Study session"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                />
                            </div>

                            {/* Center Tall Image */}
                            <div className="absolute top-[48%] left-[15%] w-[50%] h-[50%] rounded-2xl overflow-hidden shadow-xl animate-fade-in-up-delay-2">
                                <img
                                    src="https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=600&auto=format&fit=crop"
                                    alt="Mentoring session"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Content */}
                    <div className="order-2 lg:order-2 max-w-xl">
                        {/* Headline */}
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 heading-tight mb-6 animate-fade-in-up">
                            Welcome to Company_Name!
                        </h2>

                        {/* Description */}
                        <p className="text-slate-600 text-lg leading-relaxed mb-8 animate-fade-in-up-delay-1">
                            We provide comprehensive academic guidance to help
                            you navigate university selection, craft compelling
                            applications, and secure your place at top
                            institutions worldwide. Our expert counselors ensure
                            a stress-free journey to your dream university.
                        </p>

                        {/* CTA Button */}
                        <button className="group flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 rounded-full pl-6 pr-2 py-2 hover:scale-105 transition-transform duration-300 mb-12 animate-fade-in-up-delay-2">
                            <span className="text-white font-medium">
                                Discover More
                            </span>
                            <div className="w-10 h-10 bg-emerald-500 group-hover:bg-emerald-400 rounded-full flex items-center justify-center transition-colors duration-300">
                                <ArrowRight className="w-4 h-4 text-white" />
                            </div>
                        </button>

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-6 animate-fade-in-up-delay-3">
                            {stats.map((stat, index) => (
                                <div
                                    key={index}
                                    className="text-center lg:text-left"
                                >
                                    <div
                                        className={`text-3xl md:text-4xl font-bold ${stat.color} mb-1`}
                                    >
                                        {stat.value}
                                    </div>
                                    <div className="text-sm text-gray-500">
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
