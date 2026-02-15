import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";

const footerLinks = {
    product: [
        { label: "Features", href: "/#about" },
        { label: "Pricing", href: "/#pricing" },
        { label: "FAQ", href: "/#faq" },
    ],
    company: [
        { label: "About Us", href: "/#about" },
        { label: "Contact", href: "/#contact" },
        { label: "Careers", href: "/careers" },
    ],
    legal: [
        { label: "Privacy Policy", href: "/privacy-policy" },
        { label: "Terms of Service", href: "/terms" },
        { label: "Refund Policy", href: "/refund" },
    ],
};

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer
            className="text-white border-t border-slate-700/30"
            style={{ background: "#030914" }}
        >
            <div className="max-w-6xl mx-auto px-6">
                {/* Main Footer Content */}
                <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
                    {/* Brand Column */}
                    <div className="lg:col-span-2">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2.5 mb-6"
                        >
                            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sky-500 text-white font-bold text-sm">
                                MT
                            </div>
                            <span className="font-semibold text-lg tracking-tight">
                                MockTest
                            </span>
                        </Link>
                        <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-sm">
                            Empowering students to achieve their academic goals
                            through expertly crafted practice tests and
                            comprehensive analytics.
                        </p>
                        <div className="space-y-3">
                            <a
                                href="mailto:support@mocktest.com"
                                className="flex items-center gap-3 text-sm text-slate-400 hover:text-sky-400 transition-colors"
                            >
                                <Mail className="w-4 h-4" />
                                support@mocktest.com
                            </a>
                            <a
                                href="tel:+919876543210"
                                className="flex items-center gap-3 text-sm text-slate-400 hover:text-sky-400 transition-colors"
                            >
                                <Phone className="w-4 h-4" />
                                +91 98765 43210
                            </a>
                            <div className="flex items-start gap-3 text-sm text-slate-400">
                                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                Mumbai, Maharashtra, India
                            </div>
                        </div>
                    </div>

                    {/* Links Columns */}
                    <div>
                        <h4 className="font-semibold text-sm mb-4 text-slate-200">
                            Product
                        </h4>
                        <ul className="space-y-3">
                            {footerLinks.product.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-slate-400 hover:text-sky-400 transition-colors hover:scale-[0.97] inline-block"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm mb-4 text-slate-200">
                            Company
                        </h4>
                        <ul className="space-y-3">
                            {footerLinks.company.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-slate-400 hover:text-sky-400 transition-colors hover:scale-[0.97] inline-block"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm mb-4 text-slate-200">
                            Legal
                        </h4>
                        <ul className="space-y-3">
                            {footerLinks.legal.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-slate-400 hover:text-sky-400 transition-colors hover:scale-[0.97] inline-block"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="py-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-slate-500">
                        © {currentYear} MockTest. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link
                            href="/privacy-policy"
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            Privacy
                        </Link>
                        <Link
                            href="/terms"
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            Terms
                        </Link>
                        <Link
                            href="/cookies"
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            Cookies
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
