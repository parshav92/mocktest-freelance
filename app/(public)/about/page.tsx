import Navbar from "@/components/navbar";
import AboutSection from "@/components/landing/about-section";
import WhyUsSection from "@/components/landing/why-us-section";
import ProductivitySection from "@/components/landing/productivity-section";
import Footer from "@/components/landing/footer";

const AboutPage = () => {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />
            <div className="pt-24">
                <div className="max-w-[1600px] mx-auto px-6 mb-10">
                    <span className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-emerald-600 text-[10px] font-bold tracking-[0.2em] uppercase">
                        About Us
                    </span>
                    <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 heading-tight mt-4">
                        Empowering Students with
                        <span className="text-emerald-600"> Expert Guidance</span>
                    </h1>
                    <p className="text-lg md:text-xl text-zinc-700 font-light max-w-2xl mt-4">
                        Learn about our mission, our team, and the proven
                        process that helps students achieve their academic goals.
                    </p>
                </div>
            </div>
            <AboutSection />
            <WhyUsSection />
            <ProductivitySection />
            <Footer />
        </div>
    );
};

export default AboutPage;
