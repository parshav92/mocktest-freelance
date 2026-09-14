"use client";

import Navbar from "@/components/navbar";
import Footer from "@/components/landing/footer";
import Link from "next/link";

const PrivacyPolicyPage = () => {
    const sections = [
        {
            title: "1. Information We Collect",
            content:
                "By navigating this website or utilizing the services offered through this website, you acknowledge and accept the terms of both this Privacy Policy and the User Agreement as they may be revised periodically. This Privacy Policy applies to all our online paid and free customers; if you disagree with the Terms and Conditions request, you should not operate this Web site.",
        },
        {
            title: "PERSONAL INFORMATION WE COLLECT",
            content:
                "When you visit this website, we automatically collect certain information about your device, including information about your web browser, IP address, time zone, and some of the cookies that are installed on your device. Additionally, as you browse this website, we collect information about the individual web pages or products that you view, what websites or search terms referred you to this website, and information about how you interact with this website. We refer to this automatically collected information as “Device Information.” By using our website, you understand and give your consent that your IP address and browser information might be processed by the security plugins installed on this site. We do this only to keep our community safe.We collect Device Information using the following technologies:",
        },
        {
            title: "Handling and Use of Personal Information",
            content:
                `When we talk about “Personal Information” in this Privacy Policy, we are talking both about Device Information and Order Information. 
We use the Order Information that we collect generally to fulfil any orders placed through this website (including processing your payment information, arranging for shipping, and providing you with invoices and/or order confirmations). Additionally, we use this Order Information to: Communicate with you; Screen our orders for potential risk or fraud; and When in line with the preferences you have shared with us, provide you with information or advertising relating to our products or services. 
We use the Device Information that we collect to help us screen for potential risk and fraud (in particular, your IP address), and more generally to improve and optimize our website (for example, by generating analytics about how our customers browse and interact with this website, and to assess the success of our marketing and advertising campaigns).
At the time of Free trial or Subscribe a particular course, we will ask you to disclose some personal details to create an account (your name, student name, email address and a password for your account). We need this information to provide the service. While buying the active subscription, you require to pay the fees using your Debit or Credit Card, and you need to make payment of the Subscription Fee.
When making any payment in relation to your use of the services, you affirm that you have read all of their privacy policy and terms and available conditions on their website.
`,
        },
        {
            title: "Sharing of Personal Information",
            content:
                `Your personal information will not be sold to other third-party companies.
However, we may share your Personal Information to comply with applicable laws and regulations, to respond to a subpoena, search warrant or other lawful requests for information we receive, or to otherwise protect our rights. 
For our automated writing marking system and personalised analytics, we send your response to a third-party cloud for processing. This third-party does not store your data or use it for their own purposes.
No sensitive personal data is ever sent in this process. There is no connection to the student whatsoever.
Do Not Track
Please note that we do not alter our website’s data collection and use practices when we see a Do Not Track signal from your browser.
`,
        },
        {
            title: "Data Retention",
            content:
                "When you place an order through this website, we will maintain your Order Information for our records unless and until you ask us to delete this information.",
        },



        {
            title: "Changes",
            content:
                "We may update this privacy policy from time to time to reflect, for example, changes to our practices or for other operational, legal or regulatory reasons",
        },
        {
            title: "COPYRIGHT",
            content:
                `Our website, our services and all of the associated products, and subscriptions are subject to copyright. The specific information and materials of our data are protected by copyright under the laws of Australia. All Questions have our own copyright; these questions are only used for solving the test; you are unauthorised to use and sell the same questions outside for business or any personal purpose. This Question Bank is used exclusively for solving tests by the students.  All Right (including copyright) in the services and compilation of the services are owned for these purposes and are reserved.
`,
        },
        {
            title: "Policy Change",
            content:
                `We reserve the right to modify, update or remove this Privacy Policy or any other of our policies or practices. We will notify you by modifying the revised version on the Selectorial website homepage and ask for your agreement to it at that time. If you do not agree to the amended Privacy Policy, you may not continue navigating or operating this website. Policy changes are effective from the time of such publication. In addition, we are fully authorised to change the subscription price any time without any notice; your price may get upgraded with a new price after the completion of your (any) current package, if applicable.
`,
        },
        {
            title: "SECURITY POLICY",
            content:
                "Security policy is a definition of what it means to be secure for an organization or other entity. We consider protecting all personal information we receive from our website subscribers as critical to our company policy. This website will use your username and password to identify when you return to our website for using your paid subscription. If you forget your password, you may select the option for resetting your password. If you don’t access the account for more than a month, your account will be suspended. In that case, you have to contact us to release your account. To try to minimise this risk, we encrypt all passwords.",
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

            <section className="px-6 mt-6">
                <div className="max-w-4xl mx-auto text-center">
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        This Privacy Policy applies to Selectorial, a service
                        operated by DEDHIA FAMILY PTY LTD. By using the
                        Selectorial website and services you acknowledge and
                        accept the terms of this Privacy Policy.
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
