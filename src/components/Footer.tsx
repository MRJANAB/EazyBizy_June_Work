import { motion } from "framer-motion"; 
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const footerLinks = {
    "Loan Schemes": [
      { name: "MUDRA Loan", href: "/mudra-loan" },
      { name: "PMEGP", href: "/pmegp" },
      { name: "MSME Loan", href: "/msme-loan" },
      { name: "Other Schemes", href: "/other-schemes" },
    ],
    Company: [
      { name: "About Us", href: "/about" },
      { name: "How It Works", href: "/how-it-works" },
      { name: "Loan Schemes", href: "/loan-schemes" },
    ],
    Support: [
      { name: "Contact", href: "/contact" },
      { name: "FAQs", href: "/faq" },
    ],
    Legal: [
      { name: "Terms of Service", href: "/terms" },
      { name: "Privacy Policy", href: "/privacy" },
    ],
  };

  return (
    <footer id="footer" className="relative overflow-hidden border-t border-primary/15 bg-background">
      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_-5%_-15%,rgba(34,211,238,0.13),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_108%_115%,rgba(59,130,246,0.10),transparent)]" />
      </div>

      <div className="relative container mx-auto px-4 pt-14 pb-8 lg:px-8">

        {/* Divider */}
        <div className="mb-12 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

        {/* Main grid */}
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-6">

          {/* Brand column */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-xl gradient-primary shadow-lg">
                <img src="/logo.png" alt="EazyBizy" className="h-full w-full object-cover" />
              </div>
              <span className="text-2xl font-bold text-foreground">
                Eazy<span className="text-gradient-primary">Bizy</span>
              </span>
            </div>

            <p className="mb-6 max-w-xs text-sm leading-7 text-muted-foreground">
              Government and MSME loan assistance platform. Apply for MUDRA,
              PMEGP and MSME loans with bank-ready project support.
            </p>

            <div className="flex gap-3">
              {[
                { Icon: Facebook, href: "https://www.facebook.com" },
                { Icon: Instagram, href: "https://www.instagram.com" },
                { Icon: Linkedin, href: "https://www.linkedin.com" }, // ✅ Added LinkedIn
              ].map(({ Icon, href }) => (
                <motion.a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="glass flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                {title}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact bar */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 rounded-2xl border border-border bg-card/50 px-8 py-5 md:justify-start">
          <a
            href="tel:+91-674-3184837"
            className="flex items-center gap-2.5 text-muted-foreground transition-colors hover:text-primary"
          >
            <Phone className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm">+91-674-3184837</span>
          </a>
          <a
            href="mailto:support@eazybizy.in"
            className="flex items-center gap-2.5 text-muted-foreground transition-colors hover:text-primary"
          >
            <Mail className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm">eazybizysupport24X7@gmail.com</span>
          </a>
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm">Odisha, India</span>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-border pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Copyright 2026 EazyBizy. All rights reserved. | Government Loan
            Assistance Platform | Supporting MSME Growth
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;