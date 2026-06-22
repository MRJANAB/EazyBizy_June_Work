import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import LoanTypesSection from "@/components/LoanTypesSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <section id="features">
        <FeaturesSection />
      </section>
      <section id="how-it-works">
        <HowItWorksSection />
      </section>
      <section id="loans">
        <LoanTypesSection />
      </section>
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
