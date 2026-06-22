import { useState } from "react";
import {
  ArrowLeft,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Send,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Contact = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const showDashboardBackButton =
    (location.state as { from?: string } | null)?.from === "loan-management-dashboard";

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSendEmail = () => {
    const subject = encodeURIComponent(form.subject || "New Message");
    const body = encodeURIComponent(
      `Name: ${form.fullName || "-"}\nEmail: ${form.email || "-"}\n\nMessage:\n${form.message || "-"}`
    );

    window.location.href = `mailto:eazybizysupport24X7@gmail.com?subject=${subject}&body=${body}`;
  };

  const contactCards = [
    {
      icon: Phone,
      title: "Phone",
      lines: ["+91 6743184837"],
    },
    {
      icon: Mail,
      title: "Email",
      lines: ["eazybizysupport24X7@gmail.com"],
    },
    {
      icon: MapPin,
      title: "Address",
      lines: [
        "Plot no-1480, Bhaktamadhu Nagar Rd, Bhaktamadhu Nagar, Pokhariput, Bhubaneswar, Odisha 751030",
      ],
    },
    {
      icon: Clock3,
      title: "Business Hours",
      lines: ["Mon - Fri: 9:00 AM - 6:00 PM", "Sat: 10:00 AM - 4:00 PM"],
    },
  ];

  const offices = [
    {
      title: "Corporate Office",
      description:
        "Plot no-1480, Bhaktamadhu Nagar Rd, Bhaktamadhu Nagar, Pokhariput, Bhubaneswar, Odisha 751030",
      mapSrc:
        "https://www.google.com/maps?q=1480,Bhaktamadhu+Nagar+Rd,Bhaktamadhu+Nagar,Pokhariput,Bhubaneswar,Odisha+751030&output=embed",
    },
    {
      title: "Register Office",
      description: "Plot no-188, KH-629, Friend Colony, Cuttack, Odisha 753001",
      mapSrc:
        "https://www.google.com/maps?q=Plot+No+188,KH-629,Friends+Colony&output=embed",
    },
  ];

  return (
    <>
      <Navbar />

      <main className="bg-background pt-28">
        <section className="px-4 pb-14 lg:px-8">
          <div className="mx-auto max-w-6xl">
            {showDashboardBackButton && (
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/40 bg-[#082442]/80 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#0b2f55] active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </button>
            )}

            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
                Get In Touch
              </h1>
              <p className="mt-4 text-base leading-8 text-muted-foreground md:text-lg">
                Ready to start your project? We&apos;d love to hear from you.
                Contact us today and let&apos;s discuss how we can help bring
                your vision to life.
              </p>
            </div>

            <div className="mt-14 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[1.75rem] border border-primary/12 bg-card p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Send className="h-4 w-4" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Send us a Message
                  </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          fullName: e.target.value,
                        }))
                      }
                      placeholder="Your full name"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      placeholder="your@email.com"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    placeholder="What is this about?"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Message
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        message: e.target.value,
                      }))
                    }
                    placeholder="Tell us about your project..."
                    rows={7}
                    className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    Send Message
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Contact Information
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  We are here to help. Reach out to us through any of the
                  following methods.
                </p>

                <div className="mt-6 space-y-4">
                  {contactCards.map(({ icon: Icon, title, lines }) => (
                    <div
                      key={title}
                      className="rounded-2xl border border-primary/12 bg-card p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>

                        <div>
                          <h3 className="text-base font-semibold text-foreground">
                            {title}
                          </h3>

                          <div className="mt-1 space-y-1 text-sm leading-7 text-muted-foreground">
                            {lines.map((line) =>
                              title === "Email" ? (
                                <a
                                  key={line}
                                  href={`mailto:${line}`}
                                  className="block transition-colors hover:text-primary"
                                >
                                  {line}
                                </a>
                              ) : (
                                <p key={line}>{line}</p>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-2xl border border-primary/12 bg-primary/5 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                    <h3 className="text-lg font-bold text-foreground">
                      Need Quick Help?
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      For immediate assistance, contact us through email or phone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-card/40 px-4 py-16 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-extrabold text-foreground">
                Visit Our Offices
              </h2>
            </div>

            <div className="mt-10 grid items-stretch gap-8 md:grid-cols-2">
              {offices.map((office) => (
                <div key={office.title} className="flex h-full flex-col overflow-hidden rounded-xl">
                  <iframe
                    src={office.mapSrc}
                    title={office.title}
                    className="h-[280px] w-full shrink-0"
                    loading="lazy"
                  />
                  <div className="flex min-h-[8.25rem] flex-1 flex-col border border-t-0 border-primary/12 bg-card p-4">
                    <h3 className="text-lg font-semibold text-foreground">
                      {office.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {office.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default Contact;
