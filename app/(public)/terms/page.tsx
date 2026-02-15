"use client";

import Navbar from "@/components/navbar";
import Footer from "@/components/landing/footer";
import Link from "next/link";

const TermsPage = () => {
    const sections = [
        {
            title: "1. Acceptance of Terms",
            content:
                "By accessing or using MockTest, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.",
        },
        {
            title: "2. Use License",
            content:
                "Permission is granted to temporarily access the materials on MockTest for personal, non-commercial educational use only. This is the grant of a license, not a transfer of title, and under this license you may not: modify or copy the materials; use the materials for any commercial purpose; attempt to decompile or reverse engineer any software contained on MockTest; remove any copyright or other proprietary notations from the materials.",
        },
        {
            title: "3. Account Registration",
            content:
                "To access certain features of MockTest, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and for all activities that occur under your account.",
        },
        {
            title: "4. Student Accounts",
            content:
                "Parents/guardians are responsible for creating and managing student accounts. Student accounts are linked to parent accounts and have limited access based on subscription level. Students must use their assigned credentials and may not share login information with others.",
        },
        {
            title: "5. Subscription and Payments",
            content:
                "Some features of MockTest require a paid subscription. By subscribing, you agree to pay the applicable fees. Subscriptions automatically renew unless cancelled before the renewal date. Refunds are provided according to our Refund Policy. We reserve the right to change subscription pricing with 30 days notice.",
        },
        {
            title: "6. Content and Intellectual Property",
            content:
                "All content on MockTest, including tests, questions, answers, explanations, and study materials, is the property of MockTest and is protected by copyright and intellectual property laws. You may not reproduce, distribute, or create derivative works from this content without explicit written permission.",
        },
        {
            title: "7. Acceptable Use",
            content:
                "You agree not to: share test content or answers with others; use automated tools to access the platform; attempt to gain unauthorized access to any portion of the platform; use the platform for any unlawful purpose; interfere with the proper working of the platform.",
        },
        {
            title: "8. Privacy",
            content:
                "Your use of MockTest is also governed by our Privacy Policy, which describes how we collect, use, and protect your personal information. By using MockTest, you consent to the collection and use of your information as described in the Privacy Policy.",
        },
        {
            title: "9. Limitation of Liability",
            content:
                "MockTest and its suppliers shall not be liable for any damages arising out of the use or inability to use the materials on MockTest, even if MockTest has been notified of the possibility of such damage. Some jurisdictions do not allow limitations on implied warranties or liability, so these limitations may not apply to you.",
        },
        {
            title: "10. Modifications to Terms",
            content:
                "MockTest may revise these Terms of Service at any time without notice. By using this platform, you agree to be bound by the current version of these Terms of Service. We will notify users of significant changes via email or platform notification.",
        },
        {
            title: "11. Termination",
            content:
                "We reserve the right to terminate or suspend your account and access to MockTest at our sole discretion, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties, or for any other reason.",
        },
        {
            title: "12. Governing Law",
            content:
                "These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra.",
        },
    ];

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Hero */}
            <section
                className="relative pt-32 pb-16 px-6"
                style={{
                    background:
                        "linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%)",
                }}
            >
                <div className="max-w-4xl mx-auto text-center">
                    <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-sky-700 bg-sky-100 rounded-full">
                        Legal
                    </span>
                    <h1
                        className="text-4xl md:text-5xl font-bold text-slate-900 mb-4"
                        style={{ letterSpacing: "-0.04em" }}
                    >
                        Terms of <span className="text-sky-600">Service</span>
                    </h1>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        Please read these terms carefully before using our
                        platform.
                    </p>
                    <p className="text-sm text-slate-500 mt-4">
                        Last updated: February 15, 2026
                    </p>
                </div>
            </section>

            {/* Content */}
            <section className="py-16 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-slate-50 rounded-3xl border border-slate-100 p-8 md:p-12">
                        <div className="space-y-8">
                            {sections.map((section, index) => (
                                <div key={index}>
                                    <h2 className="text-xl font-semibold text-slate-900 mb-3">
                                        {section.title}
                                    </h2>
                                    <p className="text-slate-600 leading-relaxed">
                                        {section.content}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 pt-8 border-t border-slate-200">
                            <p className="text-slate-600">
                                If you have any questions about these Terms of
                                Service, please{" "}
                                <Link
                                    href="/contact"
                                    className="text-sky-600 hover:text-sky-700 font-medium"
                                >
                                    contact us
                                </Link>
                                .
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default TermsPage;
