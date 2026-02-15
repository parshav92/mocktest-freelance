"use client";

import Navbar from "@/components/navbar";
import Footer from "@/components/landing/footer";
import Link from "next/link";

const PrivacyPolicyPage = () => {
    const sections = [
        {
            title: "1. Information We Collect",
            content:
                "We collect information you provide directly to us, including: name, email address, phone number (optional), and payment information when you create an account or make a purchase. For student accounts, we collect student ID, name, and grade level as provided by the parent/guardian. We also automatically collect certain information when you use our platform, including device information, log data, and usage patterns.",
        },
        {
            title: "2. How We Use Your Information",
            content:
                "We use the information we collect to: provide, maintain, and improve our services; process transactions and send related information; send you technical notices, updates, security alerts, and support messages; respond to your comments, questions, and requests; monitor and analyze trends, usage, and activities; personalize and improve the learning experience; detect, investigate, and prevent fraudulent transactions and other illegal activities.",
        },
        {
            title: "3. Information Sharing",
            content:
                "We do not sell, trade, or rent your personal information to third parties. We may share information with: service providers who perform services on our behalf; analytics partners to help us understand how our services are used; legal authorities when required by law or to protect our rights. Parents have full visibility into their children's test performance data and progress.",
        },
        {
            title: "4. Data Security",
            content:
                "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption of data in transit and at rest, secure authentication mechanisms, and regular security assessments. However, no method of transmission over the Internet is 100% secure.",
        },
        {
            title: "5. Children's Privacy",
            content:
                "MockTest is designed for use by students under parental supervision. We do not knowingly collect personal information from children under 13 without parental consent. Student accounts are created and managed by parents/guardians who provide consent for data collection. Parents can review, update, or delete their child's information at any time through their dashboard.",
        },
        {
            title: "6. Cookies and Tracking",
            content:
                "We use cookies and similar tracking technologies to collect and track information about your use of our platform. You can control cookies through your browser settings. Essential cookies are required for the platform to function properly. Analytics cookies help us understand how users interact with our platform.",
        },
        {
            title: "7. Data Retention",
            content:
                "We retain your personal information for as long as your account is active or as needed to provide you services. Test results and progress data are retained to provide continuous learning analytics. You can request deletion of your account and associated data at any time. Some information may be retained as required by law or for legitimate business purposes.",
        },
        {
            title: "8. Your Rights",
            content:
                "You have the right to: access the personal information we hold about you; correct inaccurate or incomplete information; request deletion of your personal information; object to processing of your information; export your data in a portable format; withdraw consent at any time where we rely on consent for processing.",
        },
        {
            title: "9. Third-Party Services",
            content:
                "Our platform may contain links to third-party websites or services. We use third-party services for authentication (Google OAuth), payment processing, and analytics. These third parties have their own privacy policies governing the use of your information. We are not responsible for the privacy practices of these third parties.",
        },
        {
            title: "10. International Data Transfers",
            content:
                "Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place for international transfers. By using our services, you consent to the transfer of your information to countries outside your country of residence.",
        },
        {
            title: "11. Changes to This Policy",
            content:
                "We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the 'Last updated' date. We encourage you to review this Privacy Policy periodically for any changes.",
        },
        {
            title: "12. Contact Us",
            content:
                "If you have any questions about this Privacy Policy or our data practices, please contact us at privacy@mocktest.com or through our contact page. We will respond to your inquiry within 30 days.",
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
                        Privacy <span className="text-sky-600">Policy</span>
                    </h1>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        Your privacy is important to us. This policy explains
                        how we collect, use, and protect your information.
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
                                If you have any questions about this Privacy
                                Policy, please{" "}
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

export default PrivacyPolicyPage;
