import TemplateNavbar from "../components/TemplateNavbar";
import HeroSection from "../components/HeroSection";
import FeaturesSection from "../components/FeaturesSection";
import PricingSection from "../components/PricingSection";
import TestimonialsSection from "../components/TestimonialsSection";
import FaqSection from "../components/FaqSection";
import CtaSection from "../components/CtaSection";
import Footer from "../components/Footer";

export default function TemplatePage() {
  return (
    <div className="min-h-screen bg-saas-black text-white">
      <TemplateNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        <TestimonialsSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
