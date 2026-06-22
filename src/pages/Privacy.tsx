import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const policySections = [
  {
    title: "1. Purpose and Scope",
    content: [
      'This Privacy Policy ("Policy") governs the collection, processing, storage, and disclosure of personal and financial information by SixthGen Solutions Private Limited, a fintech entity incorporated under the laws of India. The Policy is issued in compliance with the Information Technology Act, 2000, the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, and the Digital Personal Data Protection Act, 2023 ("DPDP Act"), along with applicable guidelines issued by the Reserve Bank of India (RBI) and other regulatory authorities.',
    ],
  },
  {
    title: "2. Definitions",
    content: [
      '"Personal Data" means any data relating to an identified or identifiable natural person, including but not limited to name, contact details, identification numbers, and financial information.',
      '"Sensitive Personal Data" includes passwords, financial information, biometric data, and official identifiers such as Aadhaar or PAN.',
      '"Processing" means any operation performed on personal data, including collection, storage, use, disclosure, and deletion.',
    ],
  },
  {
    title: "3. Collection of Data",
    intro:
      "We may collect personal and financial information directly from you, through our digital platforms, or via authorized third parties, for purposes including but not limited to:",
    bullets: [
      "Know Your Customer (KYC) compliance.",
      "Provision of financial services and products.",
      "Fraud detection and prevention.",
      "Regulatory reporting obligations.",
    ],
  },
  {
    title: "4. Legal Basis for Processing",
    intro: "Processing of personal data shall be undertaken only:",
    bullets: [
      "With your consent, as required under the DPDP Act.",
      "For performance of contractual obligations.",
      "To comply with statutory and regulatory requirements.",
      "For legitimate business interests, provided such interests do not override your fundamental rights.",
    ],
  },
  {
    title: "5. Use of Data",
    intro: "Collected data shall be used strictly for:",
    bullets: [
      "Delivering financial services and maintaining customer accounts.",
      "Risk assessment, credit scoring, and transaction monitoring.",
      "Customer communication, grievance redressal, and service improvement.",
      "Compliance with obligations under RBI, SEBI, and other regulatory frameworks.",
    ],
  },
  {
    title: "6. Data Sharing and Disclosure",
    intro:
      "Personal data may be disclosed only under the following circumstances:",
    bullets: [
      "To regulatory and governmental authorities, as mandated by law.",
      "To third-party service providers engaged under lawful contracts, subject to confidentiality obligations.",
      "Pursuant to lawful requests, court orders, or legal proceedings.",
    ],
    outro:
      "We shall not sell or trade your personal data under any circumstances.",
  },
  {
    title: "7. Data Security",
    intro:
      "We adopt reasonable security practices and procedures as defined under Indian law, including:",
    bullets: [
      "Encryption of sensitive data in transit and at rest.",
      "Access controls and authentication mechanisms.",
      "Periodic audits and vulnerability assessments.",
      "Incident response protocols in case of data breaches.",
    ],
  },
  {
    title: "8. Data Retention",
    content: [
      "Personal data shall be retained only for as long as necessary to fulfill the purposes outlined herein or as mandated by applicable law. Upon expiry of the retention period, data shall be securely deleted or anonymized.",
    ],
  },
  {
    title: "9. Rights of Data Principals",
    intro:
      "In accordance with the DPDP Act, you have the right to:",
    bullets: [
      "Access and obtain a copy of your personal data.",
      "Request correction or updating of inaccurate data.",
      "Withdraw consent for processing, subject to contractual and legal limitations.",
      "Request erasure of personal data, where permissible under law.",
      "Lodge complaints with the Data Protection Board of India.",
    ],
  },
  {
    title: "10. Cross-Border Data Transfer",
    content: [
      "Where personal data is transferred outside India, such transfer shall be undertaken in compliance with applicable laws and subject to adequate safeguards ensuring protection of your rights.",
    ],
  },
  {
    title: "11. Amendments",
    content: [
      "This Policy may be amended periodically to reflect changes in law, regulatory requirements, or business practices. Updated versions shall be published on our official website, and continued use of our services shall constitute acceptance of such amendments.",
    ],
  },
];

const shortNotice = [
  {
    title: "What We Collect",
    bullets: [
      "Basic details like your name, contact information, and ID documents (for KYC).",
      "Financial information such as bank details, transactions, and payment history.",
      "Technical information like device type, IP address, and usage patterns.",
    ],
  },
  {
    title: "How We Use Your Data",
    bullets: [
      "To provide you with secure financial services.",
      "To meet legal and regulatory requirements.",
      "To prevent fraud and keep your account safe.",
      "To improve our services and offer products tailored to you.",
    ],
  },
  {
    title: "Sharing Your Data",
    content:
      "We never sell your data. We may share it only with:",
    bullets: [
      "Regulators and government authorities when required by law.",
      "Trusted partners who help us deliver services (like payment gateways).",
    ],
  },
  {
    title: "Keeping Your Data Safe",
    content:
      "We use strong security measures such as encryption, firewalls, and regular audits to protect your information.",
  },
  {
    title: "Your Rights",
    bullets: [
      "Access and review your data.",
      "Ask us to correct or update it.",
      "Withdraw consent for non-essential uses.",
      "Request deletion, where legally allowed.",
    ],
  },
  {
    title: "Cookies",
    content:
      "We use cookies to improve your experience. You can disable them in your browser, but some features may not work properly.",
  },
  {
    title: "Updates",
    content:
      "We may update this notice from time to time. The latest version will always be available on our website/app.",
  },
];

const Privacy = () => (
  <>
    <Navbar />
    <main className="bg-background">
      <div className="mx-auto max-w-5xl px-4 py-16 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-primary/12 bg-card p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)] md:p-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Legal
            </p>
            <h1 className="mt-4 text-4xl font-bold text-foreground md:text-5xl">
              Privacy Policy Statement
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
              This page contains the full Privacy Policy and the short Privacy
              Notice for EazyBizy, presented in a clear professional format for
              website visitors.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Effective Date
                </p>
                <p className="mt-2 text-base font-semibold text-foreground">
                  01-October-2026
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Last Updated
                </p>
                <p className="mt-2 text-base font-semibold text-foreground">
                  01-September-2026
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Company Name
                </p>
                <p className="mt-2 text-base font-semibold text-foreground">
                  SixthGen Solutions Private Limited
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-background p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Jurisdiction
              </p>
              <p className="mt-2 text-base font-semibold text-foreground">
                Republic of India
              </p>
            </div>
          </div>

          <div className="mt-16 grid gap-8">
            {policySections.map((section) => (
              <article
                key={section.title}
                className="rounded-[1.75rem] border border-primary/12 bg-card p-7 shadow-[0_14px_36px_rgba(15,23,42,0.05)]"
              >
                <h2 className="text-2xl font-bold text-foreground">
                  {section.title}
                </h2>

                {section.content?.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-4 text-sm leading-8 text-muted-foreground md:text-[15px]"
                  >
                    {paragraph}
                  </p>
                ))}

                {section.intro ? (
                  <p className="mt-4 text-sm leading-8 text-muted-foreground md:text-[15px]">
                    {section.intro}
                  </p>
                ) : null}

                {section.bullets ? (
                  <ul className="mt-4 space-y-3 text-sm leading-8 text-muted-foreground md:text-[15px]">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span className="mt-2 h-2 w-2 rounded-full bg-primary" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {section.outro ? (
                  <p className="mt-4 text-sm leading-8 text-muted-foreground md:text-[15px]">
                    {section.outro}
                  </p>
                ) : null}
              </article>
            ))}

            <article className="rounded-[1.75rem] border border-primary/12 bg-card p-7 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
              <h2 className="text-2xl font-bold text-foreground">
                12. Contact Information
              </h2>
              <p className="mt-4 text-sm leading-8 text-muted-foreground md:text-[15px]">
                For queries, concerns, or exercise of rights under this Policy,
                please contact:
              </p>

              <div className="mt-5 rounded-2xl border border-border bg-background p-6">
                <p className="text-base font-semibold text-foreground">
                  Data Protection Officer (DPO)
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  SixthGen Solutions Private Limited
                </p>
                <p className="text-sm leading-7 text-muted-foreground">
                  Plot No: 188, KH No - 629
                </p>
                <p className="text-sm leading-7 text-muted-foreground">
                  Friends Colony, Thoria Sai
                </p>
                <p className="text-sm leading-7 text-muted-foreground">
                  Mangalabag, Cuttack - 753001
                </p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Email: eazybizysupport24X7@gmail.com
                </p>
                <p className="text-sm leading-7 text-muted-foreground">
                  Phone: +91-674-3184837
                </p>
              </div>
            </article>
          </div>

          <div className="mt-16 rounded-[2rem] border border-primary/12 bg-card p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Short Version
            </p>
            <h2 className="mt-4 text-3xl font-bold text-foreground">
              Privacy Notice
            </h2>
            <p className="mt-4 text-base leading-8 text-muted-foreground">
              Your privacy matters to us. At EazyBizy, we are committed to
              protecting your personal and financial information. This notice
              explains, in simple terms, how we handle your data.
            </p>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {shortNotice.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-border bg-background p-6"
                >
                  <h3 className="text-xl font-semibold text-foreground">
                    {item.title}
                  </h3>

                  {item.content ? (
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {item.content}
                    </p>
                  ) : null}

                  {item.bullets ? (
                    <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                      {item.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3">
                          <span className="mt-2 h-2 w-2 rounded-full bg-primary" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-background p-6">
              <h3 className="text-xl font-semibold text-foreground">
                Contact Us
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                If you have questions, please reach out to our Privacy Officer:
              </p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Email: eazybizysupport24X7@gmail.com
              </p>
              <p className="text-sm leading-7 text-muted-foreground">
                Phone: +91-674-3184837
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
    <Footer />
  </>
);

export default Privacy;