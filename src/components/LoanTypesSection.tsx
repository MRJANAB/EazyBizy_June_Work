import { motion } from "framer-motion";
import { ArrowRight, Landmark, Factory, Coins, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const loanTypes = [
  {
    icon: Coins,
    title: "MUDRA Loan",
    description: "Micro Units Development & Refinance Agency - for small business funding",
    rate: "8.5%",
    amount: "Up to ₹10 Lakhs",
    color: "from-cyan-500 to-teal-500",
    categories: ["Shishu (Up to ₹50K)", "Kishore (₹50K-5L)", "Tarun (5L-10L)"],
  },
  {
    icon: Landmark,
    title: "PMEGP",
    description: "Prime Minister's Employment Generation Programme for new enterprises",
    rate: "11%",
    amount: "Up to ₹25 Lakhs",
    color: "from-amber-500 to-orange-500",
    categories: ["Manufacturing", "Service Sector", "Rural Areas Priority"],
  },
  {
    icon: Factory,
    title: "MSME Loan",
    description: "Normal MSME loans for Micro, Small & Medium Enterprises",
    rate: "12%",
    amount: "Up to ₹2 Crore",
    color: "from-emerald-500 to-green-500",
    categories: ["Term Loan", "Working Capital", "Machinery Finance"],
  },
  {
    icon: FileText,
    title: "CGTMSE",
    description: "Credit Guarantee Fund Trust for collateral-free loans",
    rate: "Variable",
    amount: "Up to ₹5 Crore",
    color: "from-violet-500 to-purple-500",
    categories: ["No Collateral Required", "Quick Approval", "All MSME Sectors"],
  },
  {
    icon: Coins,
    title: "Other Schemes",
    description: "State-specific and custom government loan schemes",
    rate: "Varies",
    amount: "As per scheme",
    color: "from-rose-500 to-pink-500",
    categories: ["State Subsidies", "Sector Specific", "Women & Youth"],
  },
];

const LoanTypesSection = () => {
  return (
    <section className="py-24 bg-card">
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
            Government <span className="text-gradient-primary">Loan Schemes</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Access India's premier MSME and Government loan schemes with auto-generated bank-ready project reports.
          </p>
        </motion.div>

        {/* Loan Cards Grid */}
        <div className="flex flex-wrap justify-center gap-6">
          {loanTypes.map((loan, index) => (
            <motion.div
              key={loan.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="group glass w-full rounded-2xl border border-border p-6 transition-all duration-300 hover:border-primary/30 md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${loan.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <loan.icon className="w-7 h-7 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-foreground mb-2">{loan.title}</h3>
              <p className="text-muted-foreground text-sm mb-4">{loan.description}</p>

              {/* Categories */}
              <div className="flex flex-wrap gap-1 mb-4">
                {loan.categories.slice(0, 2).map((cat) => (
                  <span key={cat} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    {cat}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between mb-4 py-3 border-t border-border">
                <div>
                  <p className="text-muted-foreground text-xs">Interest Rate</p>
                  <p className="text-primary font-bold text-lg">{loan.rate}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-xs">Amount</p>
                  <p className="text-foreground font-semibold">{loan.amount}</p>
                </div>
              </div>

              {/* CTA */}
              <Link to="/signup" className="flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all duration-300">
                <span>Apply Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LoanTypesSection;
