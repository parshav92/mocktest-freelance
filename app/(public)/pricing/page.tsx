import Navbar from "@/components/navbar";
import PricingSection from "@/components/landing/pricing-section";
import Footer from "@/components/landing/footer";

const PricingPage = () => {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />
            <div className="pt-24">
                <div className="max-w-[1600px] mx-auto px-6 mb-10">
                    <span className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-emerald-600 text-[10px] font-bold tracking-[0.2em] uppercase">
                        Pricing
                    </span>
                    <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 heading-tight mt-4">
                        Choose the Right Plan for
                        <span className="text-emerald-600"> Your Goals</span>
                    </h1>
                    <p className="text-lg md:text-xl text-zinc-700 font-light max-w-2xl mt-4">
                        Explore flexible packages designed to match your
                        admissions journey and support level.
                    </p>
                </div>
            </div>
            <PricingSection />
            <Footer />
        </div>
    );
};

export default PricingPage;
