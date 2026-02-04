"use client";

import Link from "next/link";
import { BookOpenText, Twitter, Linkedin, Instagram, Mail } from "lucide-react";

const Footer = () => {
    const footerLinks = {
        product: [
            { label: "Features", href: "/features" },
            { label: "Pricing", href: "/pricing" },
            { label: "Courses", href: "/courses" },
            { label: "Resources", href: "/resources" },
        ],
        company: [
            { label: "About", href: "/about" },
            { label: "Careers", href: "/careers" },
            { label: "Blog", href: "/blog" },
            { label: "Contact", href: "/contact" },
        ],
        legal: [
            { label: "Privacy Policy", href: "/privacy-policy" },
            { label: "Terms of Service", href: "/terms" },
            { label: "Cookie Policy", href: "/cookies" },
        ],
    };

    const socialLinks = [
        { icon: Twitter, href: "https://twitter.com" },
        { icon: Linkedin, href: "https://linkedin.com" },
        { icon: Instagram, href: "https://instagram.com" },
        { icon: Mail, href: "mailto:contact@company_name.com" },
    ];

    return (
        <footer className="w-full bg-zinc-950 text-white py-16 px-6 relative overflow-hidden">
            {/* Grain Overlay */}
            <div className="grain-overlay absolute inset-0" />

            <div className="relative z-10 max-w-[1600px] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
                    {/* Brand Column */}
                    <div className="lg:col-span-2">
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-white font-semibold text-lg mb-4"
                        >
                            <div className="w-10 h-10 bg-emerald-400 rounded-full flex items-center justify-center">
                                <BookOpenText className="w-5 h-5 text-zinc-900" />
                            </div>
                            <span className="font-funnel tracking-tight text-xl">
                                EduFor
                            </span>
                        </Link>
                        <p className="text-white/60 max-w-sm mb-6 leading-relaxed">
                            Empowering students worldwide to achieve their
                            academic dreams with personalized guidance and
                            expert mentorship.
                        </p>
                        {/* Social Links */}
                        <div className="flex gap-3">
                            {socialLinks.map((social, index) => (
                                <a
                                    key={index}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 glass rounded-full flex items-center justify-center hover:bg-white/10 transition-colors duration-300"
                                >
                                    <social.icon className="w-4 h-4 text-white/80" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Product Links */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">
                            Product
                        </h4>
                        <ul className="space-y-3">
                            {footerLinks.product.map((link, index) => (
                                <li key={index}>
                                    <Link
                                        href={link.href}
                                        className="text-white/60 hover:text-white transition-colors duration-300 text-sm"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">
                            Company
                        </h4>
                        <ul className="space-y-3">
                            {footerLinks.company.map((link, index) => (
                                <li key={index}>
                                    <Link
                                        href={link.href}
                                        className="text-white/60 hover:text-white transition-colors duration-300 text-sm"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Legal</h4>
                        <ul className="space-y-3">
                            {footerLinks.legal.map((link, index) => (
                                <li key={index}>
                                    <Link
                                        href={link.href}
                                        className="text-white/60 hover:text-white transition-colors duration-300 text-sm"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-white/40 text-sm">
                        © 2026 Company_Name. All rights reserved.
                    </p>
                    <p className="text-white/40 text-sm">
                        Made with ❤️ for students worldwide
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
