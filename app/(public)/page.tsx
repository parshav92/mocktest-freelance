import Navbar from "@/components/navbar";
import HeroSection from "@/components/landing/hero-section";
import SampleReportSection from "@/components/landing/sample-report-section";
import AboutSection from "@/components/landing/about-section";
import WhyUsSection from "@/components/landing/why-us-section";
import TestimonialsSection from "@/components/landing/testimonials-section";
import PricingSection from "@/components/landing/pricing-section";
import FaqContactSection from "@/components/landing/faq-contact-section";
import Footer from "@/components/landing/footer";

export default function Home() {
    return (
        <div className="min-h-screen">
            <Navbar />
            <HeroSection />
            <SampleReportSection />
            {/* <AboutSection /> */}
            {/* <WhyUsSection /> */}
            <TestimonialsSection />
            <PricingSection />
            <FaqContactSection />
            <Footer />
        </div>
    );
}
