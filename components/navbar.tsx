"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/courses", label: "Courses" },
    { href: "/pricing", label: "Pricing" },
    { href: "/contact", label: "Contact" },
];

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
                scrolled
                    ? "py-3"
                    : "py-5"
            )}
        >
            <div className="max-w-6xl mx-auto px-6">
                <nav
                    className={cn(
                        "relative flex items-center justify-between px-6 py-3 rounded-2xl transition-all duration-500",
                        scrolled
                            ? "bg-white/80 backdrop-blur-xl shadow-lg shadow-black/[0.03] border border-zinc-200/50"
                            : "bg-transparent"
                    )}
                >
                    {/* Logo */}
                    <Link 
                        href="/" 
                        className="relative flex items-center gap-2.5 group"
                    >
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900 text-white font-bold text-sm group-hover:scale-105 transition-transform duration-300">
                            MT
                        </div>
                        <span className="font-semibold text-zinc-900 text-lg tracking-tight">
                            MockTest
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300",
                                    pathname === link.href
                                        ? "text-zinc-900"
                                        : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/80"
                                )}
                            >
                                {link.label}
                                {pathname === link.href && (
                                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
                                )}
                            </Link>
                        ))}
                    </div>

                    {/* Auth Buttons */}
                    <div className="hidden md:flex items-center gap-3">
                        {/* <Link href="/auth">
                            <Button 
                                variant="ghost" 
                                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 rounded-lg px-4"
                            >
                                Sign in
                            </Button>
                        </Link> */}
                        <Link href="/auth">
                            <Button 
                                className="group text-sm font-medium bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg px-5 shadow-sm hover:shadow-md transition-all duration-300"
                            >
                                Get Started
                                <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </Button>
                        </Link>
                    </div>
                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-zinc-100 transition-colors"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label="Toggle menu"
                    >
                        {isOpen ? (
                            <X className="w-5 h-5 text-zinc-700" />
                        ) : (
                            <Menu className="w-5 h-5 text-zinc-700" />
                        )}
                    </button>
                </nav>

                {/* Mobile Menu */}
                <div
                    className={cn(
                        "md:hidden absolute left-6 right-6 top-full mt-2 overflow-hidden transition-all duration-300 ease-out",
                        isOpen
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 -translate-y-4 pointer-events-none"
                    )}
                >
                    <div className="bg-white rounded-2xl shadow-xl shadow-black/[0.08] border border-zinc-200/50 p-4">
                        <div className="space-y-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                                        pathname === link.href
                                            ? "bg-zinc-100 text-zinc-900"
                                            : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                                    )}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                        <div className="h-px bg-zinc-100 my-4" />
                        <div className="space-y-2">
                            <Link href="/login" onClick={() => setIsOpen(false)}>
                                <Button 
                                    variant="outline" 
                                    className="w-full justify-center rounded-xl border-zinc-200"
                                >
                                    Sign in
                                </Button>
                            </Link>
                            <Link href="/register" onClick={() => setIsOpen(false)}>
                                <Button className="w-full justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800">
                                    Get Started
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;