"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Send, ArrowRight } from "lucide-react";

interface ContactSectionProps {
    isPage?: boolean;
}

const ContactSection = ({ isPage = false }: ContactSectionProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate form submission
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsSubmitting(false);
    };

    return (
        <section
            id="contact"
            className={`w-full ${isPage ? "min-h-screen pt-24" : ""} py-20 px-6`}

        >
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-white bg-sky-900 rounded-full border border-sky-700/50">
                        Get in Touch
                    </span>
                    <h2
                        className="text-3xl md:text-5xl font-bold text-black mb-4"
                        style={{ letterSpacing: "-0.04em" }}
                    >
                        Let&apos;s Start a{" "}
                        <span className="text-sky-900">Conversation</span>
                    </h2>
                    <p className="text-black-800 max-w-2xl mx-auto">
                        Have questions about our platform? We&apos;re here to
                        help. Reach out and we&apos;ll get back to you shortly.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
                    {/* Contact Form */}
                    <div className="bg-[#7DD3FC] backdrop-blur-sm rounded-3xl border border-slate-700/50 p-8 md:p-10">
                        <h3 className="text-xl font-semibold text-white mb-6">
                            Send us a message
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="firstName"
                                        className="text-black-300 text-sm"
                                    >
                                        First Name
                                    </Label>
                                    <Input
                                        id="firstName"
                                        name="firstName"
                                        placeholder="John"
                                        className="bg-white focus:border-sky-500 text-black placeholder:text-black-500 h-12 rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="lastName"
                                        className="text-black-300 text-sm"
                                    >
                                        Last Name
                                    </Label>
                                    <Input
                                        id="lastName"
                                        name="lastName"
                                        placeholder="Doe"
                                        className="bg-white focus:border-sky-500 text-black placeholder:text-black-500 h-12 rounded-xl"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label
                                    htmlFor="email"
                                    className="text-black-300 text-sm"
                                >
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    className="bg-white focus:border-sky-500 text-black placeholder:text-black-500 h-12 rounded-xl"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label
                                    htmlFor="phone"
                                    className="text-black-300 text-sm"
                                >
                                    Phone (optional)
                                </Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    placeholder="+91 98765 43210"
                                    className="bg-white  focus:border-sky-500 text-black placeholder:text-black-500 h-12 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label
                                    htmlFor="message"
                                    className="text-black-300 text-sm"
                                >
                                    Message
                                </Label>
                                <textarea
                                    id="message"
                                    name="message"
                                    placeholder="Tell us about your query..."
                                    rows={4}
                                    className="w-full bg-white  focus:border-sky-500 text-black placeholder:text-black-500 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full h-12 bg-white text-black rounded-xl font-medium shadow-lg transition-all duration-300 hover:bg-white/80"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    "Sending..."
                                ) : (
                                    <>
                                        Send Message
                                        <Send className="ml-2 w-4 h-4" />
                                    </>
                                )}
                            </Button>
                        </form>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-semibold text-black mb-6">
                                Contact Information
                            </h3>
                            <p className="text-black-400 leading-relaxed">
                                Feel free to reach out through any of the
                                channels below. Our team typically responds
                                within 24 hours.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <a
                                href="mailto:support@mocktest.com"
                                className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-700/50 hover:bg-slate-800/50 hover:border-white/50 transition-all duration-300 hover:scale-[0.98]"
                            >
                                <div className="w-12 h-12 rounded-xl bg-sky-900/50 flex items-center justify-center group-hover:bg-sky-800/50 transition-colors">
                                    <Mail className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm text-black-500 mb-0.5">
                                        Email
                                    </p>
                                    <p className="text-black font-medium">
                                        support@mocktest.com
                                    </p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-black-500 ml-auto group-hover:text-white group-hover:translate-x-1 transition-all" />
                            </a>

                            <a
                                href="tel:+919876543210"
                                className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-700/50 hover:bg-slate-800/50 hover:border-white/50 transition-all duration-300 hover:scale-[0.98]"
                            >
                                <div className="w-12 h-12 rounded-xl bg-sky-900/50 flex items-center justify-center group-hover:bg-sky-800/50 transition-colors">
                                    <Phone className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm text-black-500 mb-0.5">
                                        Phone
                                    </p>
                                    <p className="text-black font-medium">
                                        +91 98765 43210
                                    </p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-black-500 ml-auto group-hover:text-white group-hover:translate-x-1 transition-all" />
                            </a>

                            <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-700/50 hover:bg-slate-800/50 hover:border-white/50 transition-all duration-300 hover:scale-[0.98]">
                                <div className="w-12 h-12 rounded-xl bg-sky-900/50 flex items-center justify-center">
                                    <MapPin className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm text-black-500 mb-0.5">
                                        Address
                                    </p>
                                    <p className="text-black font-medium">
                                        Mumbai, Maharashtra, India
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Working Hours */}
                        <div className="p-6 rounded-2xl border border-slate-700/50 hover:bg-slate-800/50 hover:border-white/50 transition-all duration-300 hover:scale-[0.98]">
                            <h4 className="text-black font-semibold mb-3">
                                Working Hours
                            </h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-black-400">
                                        Monday - Friday
                                    </span>
                                    <span className="text-black">
                                        9:00 AM - 6:00 PM
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-black-400">
                                        Saturday
                                    </span>
                                    <span className="text-black">
                                        10:00 AM - 4:00 PM
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-black-400">
                                        Sunday
                                    </span>
                                    <span className="text-black-500">
                                        Closed
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

export default ContactSection;
