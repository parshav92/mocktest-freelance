import Navbar from "@/components/navbar";
import HeroSection from "@/components/landing/hero-section";
import SampleReportSection from "@/components/landing/sample-report-section";
import AboutSection from "@/components/landing/about-section";
import WhyUsSection from "@/components/landing/why-us-section";
import TestimonialsSection from "@/components/landing/testimonials-section";
import PricingSection from "@/components/landing/pricing-section";
import FaqContactSection from "@/components/landing/faq-contact-section";
import Footer from "@/components/landing/footer";
import {
    getHeroSection,
    getPricingPlans,
    getTestimonials,
    getFaqItems,
    getAboutSection,
    getWhyUsItems,
    getFooterSettings,
} from "@/lib/sanity/queries";

export default async function Home() {
    const [hero, plans, testimonials, faqItems, about, whyUsItems, footer] =
        await Promise.all([
            getHeroSection(),
            getPricingPlans(),
            getTestimonials(),
            getFaqItems(),
            getAboutSection(),
            getWhyUsItems(),
            getFooterSettings(),
        ]);

    return (
        <div className="min-h-screen">
            <Navbar />
            <HeroSection
                heading={hero?.heading}
                subheading={hero?.subheading}
                primaryButtonText={hero?.primaryButtonText}
                secondaryButtonText={hero?.secondaryButtonText}
            />
            <SampleReportSection />
            {/* <AboutSection heading={about?.heading} description={about?.description} stats={about?.stats} /> */}
            {/* <WhyUsSection items={whyUsItems} /> */}
            <TestimonialsSection testimonials={testimonials} />
            <PricingSection plans={plans} />
            <FaqContactSection faqItems={faqItems} />
            <Footer
                email={footer?.email}
                facebookUrl={footer?.facebookUrl}
                instagramUrl={footer?.instagramUrl}
                copyrightText={footer?.copyrightText}
            />
        </div>
    );
}
