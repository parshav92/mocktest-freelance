"use client";

import { Star, Quote } from "lucide-react";

interface Testimonial {
    _id?: string;
    name: string;
    role: string;
    content: string;
    rating: number;
}

interface TestimonialsSectionProps {
    testimonials?: Testimonial[];
}

const DEFAULT_TESTIMONIALS: Testimonial[] = [
    {
        name: "Priya Sharma",
        role: "Parent",
        content:
            "Selectorial has been a game-changer for my daughter's preparation. The detailed analytics helped us identify weak areas and focus on improvement. She scored in the top 5% in her selective test!",
        rating: 5,
    },
    {
        name: "Rahul Mehta",
        role: "Student, Year 6",
        content:
            "I love how the mock tests feel just like the real exam. The timed practice really helped me manage my time better. The reading and thinking skill sections are especially well-designed.",
        rating: 5,
    },
    {
        name: "Anita Patel",
        role: "Parent",
        content:
            "The parent dashboard is fantastic. I can track my son's progress without hovering over him. The weekly reports give us clear insights into what subjects need more attention.",
        rating: 5,
    },
    {
        name: "David Chen",
        role: "Student, Year 5",
        content:
            "The practice tests are really challenging and prepare you well. I especially like the comparative analysis that shows how I'm doing compared to others. It motivates me to do better!",
        rating: 4,
    },
];

const TestimonialsSection = ({ testimonials }: TestimonialsSectionProps) => {
    const activeTestimonials =
        testimonials && testimonials.length > 0
            ? testimonials
            : DEFAULT_TESTIMONIALS;
    return (
        <section id="testimonials" className="w-full bg-white py-24 px-6">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <span className="inline-block px-4 py-1.5 mb-6 text-md font-medium text-sky-700 bg-sky-100 rounded-full">
                        Testimonials
                    </span>
                    <h2
                        className="text-3xl md:text-5xl font-bold text-slate-900 mb-4"
                        style={{ letterSpacing: "-0.04em" }}
                    >
                        What Our{" "}
                        <span className="text-sky-600">Students</span> Say
                    </h2>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        Hear from parents and students who have achieved success
                        with our platform.
                    </p>
                </div>

                {/* Testimonials Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {activeTestimonials.map((testimonial, index) => (
                        <div
                            key={testimonial._id ?? index}
                            className="relative bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-lg hover:border-slate-200 transition-all duration-300 group"
                        >
                            {/* Quote Icon */}
                            <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Quote className="w-10 h-10 text-sky-500" />
                            </div>

                            {/* Stars */}
                            <div className="flex gap-1 mb-4">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                        key={i}
                                        className={`w-4 h-4 ${
                                            i < testimonial.rating
                                                ? "text-amber-400 fill-amber-400"
                                                : "text-slate-300"
                                        }`}
                                    />
                                ))}
                            </div>

                            {/* Content */}
                            <p className="text-slate-600 leading-relaxed mb-6 text-sm">
                                &ldquo;{testimonial.content}&rdquo;
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
                                    <span className="text-sm font-semibold text-sky-700">
                                        {testimonial.name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .slice(0, 2)
                                            .toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">
                                        {testimonial.name}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {testimonial.role}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TestimonialsSection;
