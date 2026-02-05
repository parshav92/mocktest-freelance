"use client";

import Link from "next/link";
import { BookOpenText, ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navLinks = [
        { href: "/", label: "Home" },
        { href: "/about", label: "About" },
        { href: "/courses", label: "Courses" },
        { href: "/pricing", label: "Pricing" },
        { href: "/contact", label: "Contact" },
    ];

    return (
        <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl">
            <div className="glass-strong rounded-full px-4 py-2">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-zinc-900 font-semibold text-lg"
                    >
                        <div className="w-9 h-9 bg-emerald-500 rounded-full flex items-center justify-center">
                            <BookOpenText className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-funnel tracking-tight">
                            Company_Name
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="px-4 py-2 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-900/10 rounded-full transition-all duration-300 text-sm font-medium"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* CTA Button */}
                    <div className="hidden md:block">
                        <Link
                            href="/auth"
                            className="group flex items-center gap-2 bg-zinc-900 rounded-full pl-5 pr-2 py-1.5 hover:scale-105 hover:bg-zinc-800 transition-all duration-300 shadow-lg"
                        >
                            <span className="text-white font-medium text-sm">
                                Get Started
                            </span>
                            <div className="w-8 h-8 bg-emerald-500 group-hover:bg-emerald-400 rounded-full flex items-center justify-center transition-colors duration-300">
                                <ArrowRight className="w-4 h-4 text-white" />
                            </div>
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden text-zinc-900 p-2"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? (
                            <X className="w-6 h-6" />
                        ) : (
                            <Menu className="w-6 h-6" />
                        )}
                    </button>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div className="md:hidden mt-4 pb-4 border-t border-zinc-900/10 pt-4">
                        <div className="flex flex-col gap-2">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="px-4 py-2 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-900/10 rounded-full transition-all duration-300 text-sm font-medium"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <Link
                                href="/auth"
                                className="mt-2 w-full group flex items-center justify-center gap-2 bg-zinc-900 rounded-full pl-5 pr-2 py-2 shadow-lg"
                            >
                                <span className="text-white font-medium text-sm">
                                    Get Started
                                </span>
                                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                                    <ArrowRight className="w-4 h-4 text-white" />
                                </div>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
