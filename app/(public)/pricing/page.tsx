"use client";

import Navbar from "@/components/navbar";
import PricingSection from "@/components/landing/pricing-section";
import Footer from "@/components/landing/footer";

const PricingPage = () => {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Hero */}
            <section
                className="relative pt-32 pb-12 px-6"
                style={{
                    background:
                        "linear-gradient(180deg, #7DD3FC 0%, #BAE6FD 40%, #E0F2FE 70%, #ffffff 100%)",
                }}
            >
                <div className="max-w-4xl mx-auto text-center">
                    <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-sky-700 bg-white/80 backdrop-blur-sm rounded-full border border-sky-200/50">
                        Pricing
                    </span>
                    <h1
                        className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6"
                        style={{ letterSpacing: "-0.04em" }}
                    >
                        Choose the Right{" "}
                        <span className="text-sky-600">Plan</span>
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Flexible packages designed to match your learning
                        journey and support level.
                    </p>
                </div>
            </section>

            <PricingSection />
            <Footer />
        </div>
    );
};

export default PricingPage;
