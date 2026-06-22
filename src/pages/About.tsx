import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const About = () => (
  <>
    <Navbar />
    <main className="container mx-auto px-4 lg:px-8 py-24">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-foreground">About Us</h1>
        <p className="text-muted-foreground text-lg leading-8">
          EazyBizy is a government and MSME loan assistance platform designed to help small businesses access
          MUDRA, PMEGP, and MSME loan schemes with fast, bank-ready project reports.
        </p>
        <div className="space-y-4 text-sm text-muted-foreground leading-7">
          <p>
            Our mission is to simplify loan application preparation by providing guided digital forms, auto-generated
            financial reports, and expert support so entrepreneurs can focus on growing their business.
          </p>
          <p>
            EazyBizy combines compliance-first report generation with user-friendly loan guidance to reduce paperwork,
            speed approvals, and improve the quality of submissions for banks and government programs.
          </p>
          <p>
            We are committed to transparency, privacy, and delivering a seamless experience for applicants, consultants,
            and analysts alike.
          </p>
        </div>
      </div>
    </main>
    <Footer />
  </>
);

export default About;