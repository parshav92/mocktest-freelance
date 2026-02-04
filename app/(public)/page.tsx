import Navbar from "@/components/navbar";
import HeroSection from "@/components/landing/hero-section";
import AboutSection from "@/components/landing/about-section";
// import ProductivitySection from "@/components/landing/productivity-section";
import PricingSection from "@/components/landing/pricing-section";
import Footer from "@/components/landing/footer";

export default function Home() {
    return (
        <div className="min-h-screen">
            <Navbar />
            <HeroSection />
            <AboutSection />
            {/* <ProductivitySection /> */}
            <PricingSection />
            <Footer />
        </div>
    );
}
