import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Terms = () => (
  <>
    <Navbar />
    <main className="container mx-auto px-4 lg:px-8 py-24">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-foreground">Terms of Service</h1>
        <p className="text-muted-foreground text-lg leading-8">
          Welcome to EazyBizy. These terms govern your use of our platform and services.
        </p>
        <div className="space-y-4 text-sm text-muted-foreground leading-7">
          <p>
            By accessing or using EazyBizy, you agree to follow these terms. We reserve the right to update the terms
            and any changes will be posted on this page.
          </p>
          <p>
            Our platform is provided to help you prepare loan application documents, access loan guidance, and manage
            communications with our support team.
          </p>
          <p>
            Use of the site is subject to applicable laws. You must provide accurate information and may not misuse the
            platform for any fraudulent or unlawful purpose.
          </p>
        </div>
      </div>
    </main>
    <Footer />
  </>
);

export default Terms;