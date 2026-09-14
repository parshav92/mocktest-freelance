"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Clock, Users, Award, LucideIcon } from "lucide-react";

const ICON_CYCLE: LucideIcon[] = [Sparkles, Clock, Users, Award];

interface WhyUsItem {
    _id?: string;
    title: string;
    description: string;
}

interface WhyUsSectionProps {
    items?: WhyUsItem[];
}

const DEFAULT_ITEMS: WhyUsItem[] = [
    {
        title: "Expert Guidance",
        description: "Clear roadmap and hands-on support from expert advisors.",
    },
    {
        title: "24/7 Practice Access",
        description:
            "Take mock tests anytime, anywhere. Available round the clock.",
    },
    {
        title: "Parent Dashboard",
        description:
            "Track progress and stay updated with detailed analytics.",
    },
    {
        title: "Proven Results",
        description: "Join thousands who've achieved their academic goals.",
    },
];

const WhyUsSection = ({ items }: WhyUsSectionProps) => {
    const [scrollProgress, setScrollProgress] = useState(0);
    const sectionRef = useRef<HTMLElement>(null);

    const activeItems =
        items && items.length > 0 ? items : DEFAULT_ITEMS;

    useEffect(() => {
        const handleScroll = () => {
            if (!sectionRef.current) return;

            const rect = sectionRef.current.getBoundingClientRect();
            const sectionHeight = sectionRef.current.offsetHeight;
            const windowHeight = window.innerHeight;

            // Calculate progress based on how much of the section has been scrolled through
            const scrolled = windowHeight - rect.top;
            const totalScrollable = sectionHeight + windowHeight;
            const progress = Math.max(
                0,
                Math.min(1, scrolled / totalScrollable),
            );

            setScrollProgress(progress);
        };

        window.addEventListener("scroll", handleScroll);
        handleScroll(); // Initial call
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <section
            ref={sectionRef}
            id="why-us"
            className="w-full bg-slate-50 py-16 px-6"
        >
            <div className="max-w-4xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-12">
                    <span className="inline-flex items-center gap-2 bg-sky-100 rounded-full px-4 py-2 text-sky-700 text-[10px] font-bold tracking-[0.2em] uppercase mb-6">
                        Why Us
                    </span>
                    <h2
                        className="text-3xl md:text-5xl font-bold text-slate-900 mb-4"
                        style={{ letterSpacing: "-0.04em" }}
                    >
                        Why Choose{" "}
                        <span className="text-sky-600">Selectorial</span>?
                    </h2>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        Expert guidance for a seamless study journey, backed by
                        proven outcomes and dedicated mentorship.
                    </p>
                </div>

                {/* Cards with Scroll Effect */}
                <div className="relative">
                    {/* Cards */}
                    <div className="space-y-4">
                        {activeItems.map((item, index) => {
                            const cardProgress = (index + 1) / activeItems.length;
                            const isVisible =
                                scrollProgress >= cardProgress * 0.5;
                            const Icon = ICON_CYCLE[index % ICON_CYCLE.length];

                            return (
                                <div
                                    key={item.title}
                                    className={`relative transition-all duration-700 ${
                                        isVisible
                                            ? "opacity-100 translate-y-0"
                                            : "opacity-0 translate-y-8"
                                    }`}
                                >
                                    {/* Content Card */}
                                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
                                                <Icon className="w-5 h-5 text-sky-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-900">
                                                    {item.title}
                                                </h3>
                                                <p className="text-slate-600 text-md">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WhyUsSection;
