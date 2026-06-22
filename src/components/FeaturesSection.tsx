import { motion } from "framer-motion";
import { FileText, Shield, Clock, Users, Smartphone } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Auto-Generated Reports",
    description: "Get bank-ready project reports generated automatically from your application data.",
  },
  {
    icon: Shield,
    title: "RBI Compliant",
    description: "All reports follow RBI guidelines and bank submission requirements.",
  },
  {
    icon: Clock,
    title: "9-Step Process",
    description: "Complete your entire loan application in just 7 simple digital steps.",
  },
  {
    icon: Users,
    title: "Expert Support",
    description: "Dedicated loan advisors to help you choose the right scheme.",
  },
  {
    icon: Smartphone,
    title: "100% Digital",
    description: "No paperwork, no branch visits. Complete everything online.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-card relative">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Why Choose <span className="text-gradient-primary">EazyBizy</span>?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We've simplified government loan applications. Faster approvals with auto-generated bank-ready reports.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="flex flex-wrap justify-center gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="group glass w-full rounded-2xl p-6 transition-all duration-300 hover:border-primary/30 md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"
            >
              <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow duration-300">
                <feature.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
