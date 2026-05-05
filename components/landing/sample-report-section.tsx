"use client";

import { BarChart3, PieChart, Zap, CheckCircle2 } from "lucide-react";

const SampleReportSection = () => {
    const reportFeatures = [
        {
            title: "Result of Each Question",
            description:
                "Detailed breakdown of your performance on every question with correct answers and explanations.",
            icon: CheckCircle2,
            color: "text-emerald-500",
            bgColor: "bg-emerald-100",
        },
        {
            title: "Marks Distribution",
            description:
                "Visual representation of how marks are distributed across different sections and topics.",
            icon: PieChart,
            color: "text-sky-500",
            bgColor: "bg-sky-100",
        },
        {
            title: "Comparative Analysis",
            description:
                "See how you perform compared to other students and identify your standing.",
            icon: BarChart3,
            color: "text-amber-500",
            bgColor: "bg-amber-100",
        },
        {
            title: "Speed Analysis",
            description:
                "Track your time spent per question and optimize your test-taking speed.",
            icon: Zap,
            color: "text-violet-500",
            bgColor: "bg-violet-100",
        },
    ];

    return (
        <section id="sample-report" className="w-full bg-white py-24 px-6">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <span className="inline-block px-4 py-1.5 mb-6 text-md font-medium text-sky-700 bg-sky-100 rounded-full">
                        Sample Report
                    </span>
                    <h2
                        className="text-3xl md:text-5xl font-bold text-slate-900 mb-4"
                        style={{ letterSpacing: "-0.04em" }}
                    >
                        Detailed{" "}
                        <span className="text-sky-600">Analytics</span> &
                        Reports
                    </h2>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        Get comprehensive insights into your performance with
                        our advanced reporting system. Every test you take
                        generates a detailed analysis.
                    </p>
                </div>

                {/* Report Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {reportFeatures.map((feature, index) => (
                        <div
                            key={index}
                            className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:shadow-lg hover:border-slate-200 transition-all duration-300 hover:-translate-y-1 group"
                        >
                            <div
                                className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                            >
                                <feature.icon
                                    className={`w-6 h-6 ${feature.color}`}
                                />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Sample Report Preview */}
                <div className="mt-12 bg-slate-50 rounded-3xl border border-slate-100 p-8 md:p-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Mock Score Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            <div className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-3">
                                Overall Score
                            </div>
                            <div className="flex items-end gap-2 mb-4">
                                <span
                                    className="text-4xl font-bold text-slate-900"
                                    style={{ letterSpacing: "-0.04em" }}
                                >
                                    85%
                                </span>
                                <span className="text-emerald-500 text-sm font-medium mb-1">
                                    +12%
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="w-[85%] h-full bg-sky-500 rounded-full" />
                            </div>
                        </div>

                        {/* Subject Breakdown */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            <div className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-3">
                                Subject Breakdown
                            </div>
                            <div className="space-y-3">
                                {[
                                    {
                                        subject: "Reading",
                                        score: 90,
                                        color: "bg-emerald-500",
                                    },
                                    {
                                        subject: "Writing",
                                        score: 78,
                                        color: "bg-sky-500",
                                    },
                                    {
                                        subject: "Mathematics",
                                        score: 85,
                                        color: "bg-amber-500",
                                    },
                                    {
                                        subject: "Thinking Skill",
                                        score: 88,
                                        color: "bg-violet-500",
                                    },
                                ].map((item) => (
                                    <div key={item.subject}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-600">
                                                {item.subject}
                                            </span>
                                            <span className="text-slate-900 font-medium">
                                                {item.score}%
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${item.color} rounded-full`}
                                                style={{
                                                    width: `${item.score}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Time Analysis */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            <div className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-3">
                                Speed Analysis
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">
                                        Avg. Time/Question
                                    </span>
                                    <span className="text-sm font-semibold text-slate-900">
                                        1.2 min
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">
                                        Total Time Used
                                    </span>
                                    <span className="text-sm font-semibold text-slate-900">
                                        48 min
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">
                                        Time Remaining
                                    </span>
                                    <span className="text-sm font-semibold text-emerald-600">
                                        12 min
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">
                                        Accuracy Rate
                                    </span>
                                    <span className="text-sm font-semibold text-slate-900">
                                        92%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default SampleReportSection;
