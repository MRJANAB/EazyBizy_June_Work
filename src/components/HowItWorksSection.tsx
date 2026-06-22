import { motion } from "framer-motion";
import { UserCheck, FileSearch, FileText, BadgeCheck } from "lucide-react";

const steps = [
  {
    icon: UserCheck,
    step: "01",
    title: "Register & Login",
    description: "Create your account in 30 seconds with email and password.",
  },
  {
    icon: FileSearch,
    step: "02",
    title: "Fill 9-Step Form",
    description: "Complete the digital application with personal, business & project details.",
  },
  {
    icon: FileText,
    step: "03",
    title: "Get Bank Report",
    description: "Auto-generated RBI-compliant project report ready for bank submission.",
  },
  {
    icon: BadgeCheck,
    step: "04",
    title: "Get Approved",
    description: "Submit to bank and receive your loan with up to 35% subsidy.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-24 gradient-hero relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 gradient-glow blur-3xl opacity-30" />
      <div className="absolute bottom-0 left-0 w-80 h-80 gradient-glow blur-3xl opacity-30" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            How It <span className="text-gradient-gold">Works</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Get your MSME loan approved in 4 simple steps. Auto-generated bank-ready reports.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
              )}

              <div className="flex flex-col items-center text-center">
                {/* Step Number */}
                <div className="relative mb-6">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="w-20 h-20 rounded-2xl gradient-card border border-border flex items-center justify-center shadow-card"
                  >
                    <step.icon className="w-8 h-8 text-primary" />
                  </motion.div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
                    <span className="text-primary-foreground text-sm font-bold">{step.step}</span>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
