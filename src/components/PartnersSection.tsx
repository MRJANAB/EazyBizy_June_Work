import { motion } from "framer-motion";

const partners = [
  "HDFC Bank",
  "ICICI Bank",
  "SBI",
  "Axis Bank",
  "Kotak",
  "Yes Bank",
  "Bajaj Finance",
  "Tata Capital",
];

const PartnersSection = () => {
  return (
    <section className="py-16 gradient-hero border-y border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-muted-foreground mb-8"
        >
          Trusted by leading financial institutions
        </motion.p>

        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          {partners.map((partner, index) => (
            <motion.div
              key={partner}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="glass rounded-xl px-6 py-3"
            >
              <span className="text-muted-foreground font-semibold text-sm md:text-base">
                {partner}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
