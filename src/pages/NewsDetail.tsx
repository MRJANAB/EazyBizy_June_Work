import { motion } from "framer-motion";
import { ArrowLeft, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const newsData: Record<string, any> = {
  "50000-crore-budget": {
    title: "₹50,000 Crore Allocated for MSME Support in Union Budget",
    source: "Economic Times",
    time: "2 hours ago",
    url: "https://economictimes.indiatimes.com",
    content: `
      <h2>₹50,000 Crore Allocated for MSME Support in Union Budget</h2>
      
      <p>In the recent Union Budget 2025-26, the Government has allocated ₹50,000 crore specifically for MSME support and development programs.</p>
      
      <h3>Budget Allocation Breakdown:</h3>
      <ul>
        <li>₹20,000 crore for subsidy programs (PMEGP, MUDRA, etc.)</li>
        <li>₹15,000 crore for technology and skill development</li>
        <li>₹10,000 crore for export promotion</li>
        <li>₹5,000 crore for infrastructure development</li>
      </ul>
      
      <h3>Key Initiatives:</h3>
      <p><strong>1. Digital Transformation:</strong> Special funds allocated for digitalization of MSMEs</p>
      <p><strong>2. Skill Development:</strong> Training programs for youth entrepreneurs</p>
      <p><strong>3. Export Support:</strong> Incentives for MSME exports to international markets</p>
      <p><strong>4. Women Entrepreneurship:</strong> Dedicated fund of ₹2,500 crore for women-led businesses</p>
      
      <h3>Expected Outcomes:</h3>
      <ul>
        <li>Creation of 100,000 new jobs</li>
        <li>₹2 lakh crore additional MSME credit</li>
        <li>Doubling of MSME exports</li>
        <li>Enhanced competitiveness in global markets</li>
      </ul>
      
      <p>This substantial allocation reflects the Government's commitment to strengthening the MSME sector as the backbone of the Indian economy.</p>
    `,
  },
  "mudra-rates-unchanged": {
    title: "Interest Rates on MUDRA Loans Remain Unchanged at 8.5%",
    source: "Business Standard",
    time: "5 hours ago",
    url: "https://www.business-standard.com",
    content: `
      <h2>Interest Rates on MUDRA Loans Remain Unchanged at 8.5%</h2>
      
      <p>The Reserve Bank of India has announced that interest rates on MUDRA loans will remain stable at 8.5% for the next quarter.</p>
      
      <h3>Current Rate Structure:</h3>
      <ul>
        <li>Base Rate: 8.5%</li>
        <li>Processing Fee: Nil for loans up to ₹10 lakh</li>
        <li>Insurance: Optional</li>
      </ul>
      
      <h3>Why This Rate?</h3>
      <p>The 8.5% rate is designed to be affordable for micro-entrepreneurs while ensuring banks can sustain lending operations.</p>
      
      <h3>Comparison with Other Schemes:</h3>
      <ul>
        <li>PMEGP: Interest rate varies by lender (8% - 10%)</li>
        <li>Normal MSME Loans: 9% - 12%</li>
        <li>MUDRA: 8.5% (most competitive)</li>
      </ul>
      
      <p>This stable rate environment provides certainty for entrepreneurs in their financial planning and loan repayment schedules.</p>
    `,
  },
  "kvic-pmegp-units": {
    title: "KVIC Approves 15,000 New PMEGP Units in January",
    source: "PIB",
    time: "1 day ago",
    url: "https://pib.gov.in",
    content: `
      <h2>KVIC Approves 15,000 New PMEGP Units in January</h2>
      
      <p>The Khadi and Village Industries Commission (KVIC) has approved 15,000 new PMEGP units in January 2026, marking a record monthly approval.</p>
      
      <h3>Sector-Wise Distribution:</h3>
      <ul>
        <li>Manufacturing: 45% (6,750 units)</li>
        <li>Service Sector: 35% (5,250 units)</li>
        <li>Agro-based: 20% (3,000 units)</li>
      </ul>
      
      <h3>Beneficiary Categories:</h3>
      <ul>
        <li>SC/ST: 4,500 units</li>
        <li>Women: 5,250 units</li>
        <li>General: 5,250 units</li>
      </ul>
      
      <h3>Investment Scale:</h3>
      <p>Average project cost: ₹20 lakh</p>
      <p>Total investment value: ₹3,000 crore</p>
      <p>Expected job creation: 45,000 direct + 90,000 indirect jobs</p>
      
      <h3>Top Approved Industries:</h3>
      <ul>
        <li>Food Processing</li>
        <li>Textile & Apparel</li>
        <li>Healthcare Services</li>
        <li>IT-ITeS</li>
        <li>Renewable Energy</li>
      </ul>
      
      <p>This approval rate reflects growing entrepreneurial interest and confidence in government support schemes.</p>
    `,
  },
  "digital-india-loan-speed": {
    title: "Digital India Initiative Speeds Up Loan Disbursement by 40%",
    source: "Mint",
    time: "2 days ago",
    url: "https://www.livemint.com",
    content: `
      <h2>Digital India Initiative Speeds Up Loan Disbursement by 40%</h2>
      
      <p>Digital infrastructure improvements under the Digital India initiative have accelerated MSME loan disbursement by 40% in the last quarter.</p>
      
      <h3>Speed Improvements:</h3>
      <ul>
        <li>Previous approval time: 45 days</li>
        <li>Current approval time: 27 days (40% faster)</li>
        <li>Disbursement time: 5-7 days from approval</li>
      </ul>
      
      <h3>Technology Implementations:</h3>
      <ul>
        <li>AI-based document verification</li>
        <li>Real-time credit assessment</li>
        <li>Digital signature integration</li>
        <li>Automated fund transfer</li>
      </ul>
      
      <h3>Impact on Entrepreneurs:</h3>
      <ul>
        <li>Faster business launch</li>
        <li>Reduced operational costs</li>
        <li>Better cash flow management</li>
        <li>Increased competitiveness</li>
      </ul>
      
      <h3>Banks Participating:</h3>
      <p>Over 150 banks have integrated with the digital platform, covering 95% of MSME lending market.</p>
      
      <p>This technological leap is expected to process 20 lakh additional MSME loans annually.</p>
    `,
  },
  "sbi-msme-milestone": {
    title: "State Bank of India Crosses ₹1 Lakh Crore in MSME Lending",
    source: "Financial Express",
    time: "3 days ago",
    url: "https://www.financialexpress.com",
    content: `
      <h2>State Bank of India Crosses ₹1 Lakh Crore in MSME Lending</h2>
      
      <p>State Bank of India, the country's largest bank, has achieved a milestone by crossing ₹1 lakh crore in cumulative MSME lending.</p>
      
      <h3>Key Metrics:</h3>
      <ul>
        <li>Total MSME loans: ₹1,00,000 crore</li>
        <li>Number of MSME borrowers: 45 lakh</li>
        <li>Year-on-year growth: 25%</li>
        <li>Default rate: Only 2.1% (industry average: 3.5%)</li>
      </ul>
      
      <h3>Loan Portfolio Distribution:</h3>
      <ul>
        <li>Manufacturing: 40%</li>
        <li>Retail & Trading: 35%</li>
        <li>Services: 25%</li>
      </ul>
      
      <h3>SBI's MSME Support Programs:</h3>
      <ul>
        <li>Pradhan Mantri Mudra Yojana (PMMY)</li>
        <li>Stand-up India Scheme</li>
        <li>CGTMSE Support</li>
        <li>Digital loans up to ₹1 crore</li>
      </ul>
      
      <h3>Future Plans:</h3>
      <p>SBI aims to double its MSME lending to ₹2 lakh crore in the next 3 years, focusing on:</p>
      <ul>
        <li>Women entrepreneurs</li>
        <li>Startups and innovation</li>
        <li>Export-oriented businesses</li>
        <li>Green and sustainable enterprises</li>
      </ul>
      
      <p>This achievement demonstrates the critical role of public sector banks in supporting India's MSME ecosystem.</p>
    `,
  },
};

const NewsDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const news = slug ? newsData[slug] : null;

  if (!news) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-32 pb-16">
          <div className="container mx-auto px-4 lg:px-8 text-center">
            <h1 className="text-3xl font-bold mb-4">News Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The news article you're looking for doesn't exist.
            </p>
            <Button variant="hero" onClick={() => navigate("/learning")}>
              Back to Learning
            </Button>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-8">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate("/learning")}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Learning
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto"
          >
            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {news.time}
              </div>
              <div className="text-primary font-medium">{news.source}</div>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold mb-8">{news.title}</h1>

            {/* Content */}
            <div className="prose prose-invert max-w-none mb-8">
              <div
                dangerouslySetInnerHTML={{ __html: news.content }}
                className="space-y-6 text-muted-foreground"
              />
            </div>

            {/* Source & CTA */}
            <div className="border-t border-border pt-8 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <Button variant="outline" asChild>
                <a href={news.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Read Original Source
                </a>
              </Button>
              <Button variant="hero" asChild>
                <Link to="/signup">Start Your Application</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default NewsDetail;
