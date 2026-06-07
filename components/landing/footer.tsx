import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";

const footerLinks = {
    socialMedia: {
        title: "Social Media",
        links: [
            { label: "Website: Home", href: "/" },
            { label: "Email:", href: "mailto:support@mocktest.com" },
            { label: "Facebook:", href: "https://facebook.com" },
            { label: "Instagram:", href: "https://instagram.com" },
        ],
    },
    legals: {
        title: "Legals",
        links: [
            { label: "Child Safety and Conduct", href: "/terms" },
            { label: "Terms and Conditions", href: "/terms" },
            { label: "Privacy Policy", href: "/privacy-policy" },
        ],
    },
    officialLinks: {
        title: "Official NSW Links",
        links: [
            {
                label: "NSW Dept of Education – Selective High Schools",
                href: "https://education.nsw.gov.au/schooling/parents-and-carers/going-to-school/enrolment/selective-high-schools",
                external: true,
            },
            {
                label: "Selective Schools Placement Test",
                href: "https://education.nsw.gov.au/schooling/parents-and-carers/going-to-school/enrolment/selective-high-schools/year-7",
                external: true,
            },
            {
                label: "Application Process",
                href: "https://education.nsw.gov.au/schooling/parents-and-carers/going-to-school/enrolment/selective-high-schools/year-7/how-to-apply",
                external: true,
            },
        ],
    },
    // Keep existing links as extra info
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

interface FooterProps {
    email?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    copyrightText?: string;
}

const Footer = ({
    email = "support@mocktest.com",
    facebookUrl = "https://facebook.com",
    instagramUrl = "https://instagram.com",
    copyrightText,
}: FooterProps) => {
    const currentYear = new Date().getFullYear();
    const copyright = copyrightText ?? `© ${currentYear} MockTest. All rights reserved. ABN: XX XXX XXX XXX`;

    return (
        <footer
            className="text-black border-t border-slate-700/30"
        >
            <div className="max-w-6xl mx-auto px-6">
                {/* Main Footer Content */}
                <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Brand Column */}
                    <div>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2.5 mb-6"
                        >
                            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sky-500 text-black font-bold text-sm">
                                MT
                            </div>
                            <span className="font-semibold text-lg tracking-tight">
                                MockTest
                            </span>
                        </Link>
                        <p className="text-black-400 text-sm leading-relaxed mb-6 max-w-sm">
                            Empowering students to achieve their academic goals
                            through expertly crafted practice tests and
                            comprehensive analytics.
                        </p>
                        <div className="space-y-3">
                            <a
                                href={`mailto:${email}`}
                                className="flex items-center gap-3 text-sm text-black-400 hover:text-sky-400 transition-colors"
                            >
                                <Mail className="w-4 h-4" />
                                {email}
                            </a>
                            <a
                                href="tel:+919876543210"
                                className="flex items-center gap-3 text-sm text-black-400 hover:text-sky-400 transition-colors"
                            >
                                <Phone className="w-4 h-4" />
                                +91 98765 43210
                            </a>
                            <div className="flex items-start gap-3 text-sm text-black-400">
                                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                Mumbai, Maharashtra, India
                            </div>
                        </div>
                    </div>

                    {/* Social Media / Links Column */}
                    <div>
                        <h4 className="font-semibold text-sm mb-4 text-black-200">
                            Social Media
                        </h4>
                        <ul className="space-y-3">
                            {[
                                { label: "Website: Home", href: "/" },
                                { label: "Email:", href: `mailto:${email}` },
                                { label: "Facebook:", href: facebookUrl },
                                { label: "Instagram:", href: instagramUrl },
                            ].map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-black-400 hover:text-sky-400 transition-colors hover:scale-[0.97] inline-block"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legals Column */}
                    <div>
                        <h4 className="font-semibold text-sm mb-4 text-black-200">
                            {footerLinks.legals.title}
                        </h4>
                        <ul className="space-y-3">
                            {footerLinks.legals.links.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-black-400 hover:text-sky-400 transition-colors hover:scale-[0.97] inline-block"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Official NSW Links Column */}
                    <div>
                        <h4 className="font-semibold text-sm mb-4 text-black-200">
                            {footerLinks.officialLinks.title}
                        </h4>
                        <ul className="space-y-3">
                            {footerLinks.officialLinks.links.map((link) => (
                                <li key={link.label}>
                                    <a
                                        href={link.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-black-400 hover:text-sky-400 transition-colors hover:scale-[0.97] inline-block"
                                    >
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="py-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-black-500">
                        {copyright}
                    </p>
                    <div className="flex items-center gap-6">
                        <Link
                            href="/#faq"
                            className="text-xs text-black-500 hover:text-black-300 transition-colors"
                        >
                            FAQ
                        </Link>
                        <Link
                            href="/#contact"
                            className="text-xs text-black-500 hover:text-black-300 transition-colors"
                        >
                            Contact Us
                        </Link>
                        <Link
                            href="/privacy-policy"
                            className="text-xs text-black-500 hover:text-black-300 transition-colors"
                        >
                            Privacy
                        </Link>
                        <Link
                            href="/terms"
                            className="text-xs text-black-500 hover:text-black-300 transition-colors"
                        >
                            Terms
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
