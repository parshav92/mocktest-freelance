import Navbar from "@/components/navbar";
import HeroSection from "@/components/landing/hero-section";
import AboutSection from "@/components/landing/about-section";
import WhyUsSection from "@/components/landing/why-us-section";
import PricingSection from "@/components/landing/pricing-section";
import FAQSection from "@/components/landing/faq-section";
import GradientTransition from "@/components/landing/gradient-transition";
import ContactSection from "@/components/landing/contact-section";
import Footer from "@/components/landing/footer";

export default function Home() {
    return (
        <div className="min-h-screen">
            <Navbar />
            <HeroSection />
            <AboutSection />
            <WhyUsSection />
            <PricingSection />
            <FAQSection />
            <GradientTransition />
            <ContactSection />
            <Footer />
        </div>
    );
}
