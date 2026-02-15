import Navbar from "@/components/navbar";
import ContactSection from "@/components/landing/contact-section";
import Footer from "@/components/landing/footer";

export default function ContactPage() {
    return (
        <div className="min-h-screen">
            <Navbar />
            <ContactSection isPage={true} />
            <Footer />
        </div>
    );
}
