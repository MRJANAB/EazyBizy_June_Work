export type SupportedLanguage = "en" | "hi" | "od";

export interface ChatbotKnowledgeEntry {
  category: string;
  keywords: string[];
  answer: Record<SupportedLanguage, string>;
  priority?: number;
}

export const chatbotWelcomeMessage: Record<SupportedLanguage, string> = {
  en: `Hello! 👋 I’m EazyBizy AI — your assistant for MSME loans, bank-ready reports, and EazyBizy platform support.

🌍 I speak: English | हिंदी | ଓଡ଼ିଆ

I can help you with:
🏠 Home page guidance
🏦 Loan schemes and eligibility
📊 CMA Reports, DPR, DSCR, and documentation
🧮 EMI Calculator and repayment planning
📁 Application form filling guidance
📄 Document upload and verification
📌 Dashboard, application preview, and loan history
💳 Payment history and loan details
💬 Contact and FAQ support`,
  hi: `Hello! 👋 मैं EazyBizy AI हूँ — MSME loans, bank-ready reports, और EazyBizy platform support के लिए आपका assistant।

🌍 I speak: English | हिंदी | ଓଡ଼ିଆ

I can help you with:
🏠 Home page guidance
🏦 Loan schemes and eligibility
📊 CMA Reports, DPR, DSCR, and documentation
🧮 EMI Calculator and repayment planning
📁 Application form filling guidance
📄 Document upload and verification
📌 Dashboard, application preview, and loan history
💳 Payment history and loan details
💬 Contact and FAQ support`,
  od: `Hello! 👋 ମୁଁ EazyBizy AI — MSME loans, bank-ready reports, ଓ EazyBizy platform support ପାଇଁ ଆପଣଙ୍କ assistant।

🌍 I speak: English | हिंदी | ଓଡ଼ିଆ

I can help you with:
🏠 Home page guidance
🏦 Loan schemes and eligibility
📊 CMA Reports, DPR, DSCR, and documentation
🧮 EMI Calculator and repayment planning
📁 Application form filling guidance
📄 Document upload and verification
📌 Dashboard, application preview, and loan history
💳 Payment history and loan details
💬 Contact and FAQ support`,
};

export const chatbotFallbackAnswer: Record<SupportedLanguage, string> = {
  en: `I’m sorry, I don’t have exact information for this query right now. Please contact EazyBizy support or check the related website section.

Contact EazyBizy Support:
Email: eazybizysupport24x7@gmail.com
Phone: +91-674-3184837`,
  hi: `I’m sorry, I don’t have exact information for this query right now. Please contact EazyBizy support or check the related website section.

Contact EazyBizy Support:
Email: eazybizysupport24x7@gmail.com
Phone: +91-674-3184837`,
  od: `I’m sorry, I don’t have exact information for this query right now. Please contact EazyBizy support or check the related website section.

Contact EazyBizy Support:
Email: eazybizysupport24x7@gmail.com
Phone: +91-674-3184837`,
};

export const chatbotKnowledgeBase: ChatbotKnowledgeEntry[] = [
  {
    category: "Greeting",
    keywords: ["hello", "hi", "hey", "namaste", "namaskar"],
    priority: 1,
    answer: {
      en: chatbotWelcomeMessage.en,
      hi: chatbotWelcomeMessage.hi,
      od: chatbotWelcomeMessage.od,
    },
  },
  {
    category: "Home Page",
    keywords: ["home", "homepage", "main page", "landing page", "eazybizy website", "what is eazybizy"],
    priority: 5,
    answer: {
      en: `🏠 Home Page Help

EazyBizy is a loan and business report support platform that helps users understand loan schemes, prepare bank-ready reports, fill applications, upload documents, track status, and manage loan-related details.

Step 1: Visit the Home Page.
Step 2: Read the main service information.
Step 3: Explore Loan Schemes, Features, How It Works, Learning, FAQs, or Contact.
Step 4: Login or Sign Up to start your loan/report application.`,
      hi: `🏠 Home Page Help

EazyBizy एक loan और business report support platform है। यह users को loan schemes समझने, bank-ready reports तैयार करने, application भरने, documents upload करने, status track करने, और loan-related details manage करने में मदद करता है।

Step 1: Home Page खोलें।
Step 2: main service information पढ़ें।
Step 3: Loan Schemes, Features, How It Works, Learning, FAQs, या Contact section देखें।
Step 4: Login या Sign Up करके अपनी application शुरू करें।`,
      od: `🏠 Home Page Help

EazyBizy ଏକ loan ଓ business report support platform ଅଟେ। ଏହା users ଙ୍କୁ loan schemes ବୁଝିବା, bank-ready reports ପ୍ରସ୍ତୁତ କରିବା, application ଭରିବା, documents upload କରିବା, status track କରିବା, ଓ loan-related details manage କରିବାରେ ସାହାଯ୍ୟ କରେ।

Step 1: Home Page ଖୋଲନ୍ତୁ।
Step 2: main service information ପଢନ୍ତୁ।
Step 3: Loan Schemes, Features, How It Works, Learning, FAQs, କିମ୍ବା Contact section ଦେଖନ୍ତୁ।
Step 4: Login କିମ୍ବା Sign Up କରି application ଆରମ୍ଭ କରନ୍ତୁ।`,
    },
  },
  {
    category: "Loan Schemes",
    keywords: ["loan schemes", "scheme", "mudra", "msme", "pmegp", "stand up india", "cgtmse", "business loan", "government loan", "eligibility", "which loan scheme is best for me"],
    priority: 6,
    answer: {
      en: `🏦 Loan Schemes Help

The Loan Schemes section helps users compare different business loan schemes.

Available scheme guidance:
1. MUDRA Loan - Best for small shops and micro businesses.
2. PMEGP - Best for new project or business setup with subsidy support.
3. MSME Loan - Best for existing businesses needing working capital or expansion.
4. Stand-Up India - Best for women entrepreneurs and SC/ST entrepreneurs.
5. CGTMSE - Best for collateral-free MSME loans.
6. Other schemes - Startup, NABARD, NSIC, and state MSME schemes.

Step 1: Open the Loan Schemes page.
Step 2: Select or compare schemes.
Step 3: Check eligibility, loan amount, documents, and benefits.
Step 4: Choose the best scheme based on your business type.`,
      hi: `🏦 Loan Schemes Help

Loan Schemes section users को अलग-अलग business loan schemes compare करने में मदद करता है।

Available scheme guidance:
1. MUDRA Loan - छोटे shops और micro businesses के लिए।
2. PMEGP - नए project या business setup और subsidy support के लिए।
3. MSME Loan - existing businesses के working capital या expansion के लिए।
4. Stand-Up India - women entrepreneurs और SC/ST entrepreneurs के लिए।
5. CGTMSE - collateral-free MSME loans के लिए।
6. Other schemes - Startup, NABARD, NSIC, और state MSME schemes।

Step 1: Loan Schemes page खोलें।
Step 2: schemes select या compare करें।
Step 3: eligibility, loan amount, documents, और benefits check करें।
Step 4: अपने business type के अनुसार best scheme चुनें।`,
      od: `🏦 Loan Schemes Help

Loan Schemes section users ଙ୍କୁ ଭିନ୍ନ business loan schemes compare କରିବାରେ ସାହାଯ୍ୟ କରେ।

Available scheme guidance:
1. MUDRA Loan - ଛୋଟ shops ଓ micro businesses ପାଇଁ।
2. PMEGP - ନୂତନ project କିମ୍ବା business setup ଓ subsidy support ପାଇଁ।
3. MSME Loan - existing businesses ର working capital କିମ୍ବା expansion ପାଇଁ।
4. Stand-Up India - women entrepreneurs ଓ SC/ST entrepreneurs ପାଇଁ।
5. CGTMSE - collateral-free MSME loans ପାଇଁ।
6. Other schemes - Startup, NABARD, NSIC, ଓ state MSME schemes।

Step 1: Loan Schemes page ଖୋଲନ୍ତୁ।
Step 2: schemes select କିମ୍ବା compare କରନ୍ତୁ।
Step 3: eligibility, loan amount, documents, ଓ benefits check କରନ୍ତୁ।
Step 4: ନିଜ business type ଅନୁଯାୟୀ best scheme ବାଛନ୍ତୁ।`,
    },
  },
  {
    category: "Features",
    keywords: ["features", "website features", "platform features", "what features", "tools"],
    answer: {
      en: `✨ Features Help

EazyBizy provides useful features for loan and report management.

Main features:
- Loan scheme comparison
- Application form filling
- CMA report support
- DPR report support
- DSCR calculation guidance
- EMI calculator
- Document upload
- Application status tracking
- Dashboard overview
- Loan details view
- Payment history
- Learning dashboard
- Contact and FAQ support`,
      hi: `✨ Features Help

EazyBizy loan और report management के लिए useful features देता है।

Main features:
- Loan scheme comparison
- Application form filling
- CMA report support
- DPR report support
- DSCR calculation guidance
- EMI calculator
- Document upload
- Application status tracking
- Dashboard overview
- Loan details view
- Payment history
- Learning dashboard
- Contact and FAQ support`,
      od: `✨ Features Help

EazyBizy loan ଓ report management ପାଇଁ useful features ଦେଇଥାଏ।

Main features:
- Loan scheme comparison
- Application form filling
- CMA report support
- DPR report support
- DSCR calculation guidance
- EMI calculator
- Document upload
- Application status tracking
- Dashboard overview
- Loan details view
- Payment history
- Learning dashboard
- Contact and FAQ support`,
    },
  },
  {
    category: "How It Works",
    keywords: ["how it works", "process", "steps", "how to use", "start process", "website process", "how to use eazybizy"],
    priority: 5,
    answer: {
      en: `🧭 How It Works

EazyBizy works in simple steps:

Step 1: Sign Up or Login.
Step 2: Open the Dashboard.
Step 3: Choose a loan scheme or start a new application.
Step 4: Fill personal, business, and loan details.
Step 5: Upload required documents.
Step 6: Preview your application.
Step 7: Submit the application.
Step 8: Track application status from the dashboard.
Step 9: View loan details, reports, and payment history.`,
      hi: `🧭 How It Works

EazyBizy simple steps में काम करता है:

Step 1: Sign Up या Login करें।
Step 2: Dashboard खोलें।
Step 3: loan scheme चुनें या नई application शुरू करें।
Step 4: personal, business, और loan details भरें।
Step 5: required documents upload करें।
Step 6: application preview करें।
Step 7: application submit करें।
Step 8: dashboard से application status track करें।
Step 9: loan details, reports, और payment history देखें।`,
      od: `🧭 How It Works

EazyBizy simple steps ରେ କାମ କରେ:

Step 1: Sign Up କିମ୍ବା Login କରନ୍ତୁ।
Step 2: Dashboard ଖୋଲନ୍ତୁ।
Step 3: loan scheme ବାଛନ୍ତୁ କିମ୍ବା ନୂଆ application ଆରମ୍ଭ କରନ୍ତୁ।
Step 4: personal, business, ଓ loan details ଭରନ୍ତୁ।
Step 5: required documents upload କରନ୍ତୁ।
Step 6: application preview କରନ୍ତୁ।
Step 7: application submit କରନ୍ତୁ।
Step 8: dashboard ରୁ application status track କରନ୍ତୁ।
Step 9: loan details, reports, ଓ payment history ଦେଖନ୍ତୁ।`,
    },
  },
  {
    category: "Login",
    keywords: ["login", "sign in", "account login", "how to login", "user login"],
    priority: 6,
    answer: {
      en: `🔐 Login Help

Step 1: Click the Login or Sign In button.
Step 2: Enter your registered email or mobile number.
Step 3: Enter your password.
Step 4: Click Login.
Step 5: After successful login, you will be redirected to your Dashboard.

If you cannot login:
- Check email or mobile and password.
- Reset password if available.
- Contact EazyBizy support if the issue continues.`,
      hi: `🔐 Login Help

Step 1: Login या Sign In button पर click करें।
Step 2: registered email या mobile number डालें।
Step 3: password डालें।
Step 4: Login पर click करें।
Step 5: successful login के बाद Dashboard पर redirect हो जाएंगे।

अगर login नहीं हो रहा:
- email या mobile और password check करें।
- password reset करें अगर option available हो।
- issue जारी रहे तो EazyBizy support से संपर्क करें।`,
      od: `🔐 Login Help

Step 1: Login କିମ୍ବା Sign In button ଉପରେ click କରନ୍ତୁ।
Step 2: registered email କିମ୍ବା mobile number ଦିଅନ୍ତୁ।
Step 3: password ଦିଅନ୍ତୁ।
Step 4: Login ଉପରେ click କରନ୍ତୁ।
Step 5: successful login ପରେ Dashboard କୁ redirect ହେବେ।

ଯଦି login ହେଉନାହିଁ:
- email କିମ୍ବା mobile ଓ password check କରନ୍ତୁ।
- password reset କରନ୍ତୁ ଯଦି option ଅଛି।
- issue ଚାଲୁଥିଲେ EazyBizy support ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ।`,
    },
  },
  {
    category: "Sign Up",
    keywords: ["sign up", "register", "create account", "new account", "signup", "how to sign up"],
    priority: 6,
    answer: {
      en: `📝 Sign Up Help

Step 1: Click Sign Up or Register.
Step 2: Enter your name, email or mobile number, and password.
Step 3: Verify your details if required.
Step 4: Submit the form.
Step 5: Login using your registered credentials.

After signup, you can access your dashboard, applications, reports, and documents.`,
      hi: `📝 Sign Up Help

Step 1: Sign Up या Register पर click करें।
Step 2: अपना name, email या mobile number, और password भरें।
Step 3: अगर required हो तो details verify करें।
Step 4: form submit करें।
Step 5: registered credentials से login करें।

Signup के बाद आप dashboard, applications, reports, और documents access कर सकते हैं।`,
      od: `📝 Sign Up Help

Step 1: Sign Up କିମ୍ବା Register ଉପରେ click କରନ୍ତୁ।
Step 2: ନାମ, email କିମ୍ବା mobile number, ଓ password ଭରନ୍ତୁ।
Step 3: ଆବଶ୍ୟକ ହେଲେ details verify କରନ୍ତୁ।
Step 4: form submit କରନ୍ତୁ।
Step 5: registered credentials ଦ୍ୱାରା login କରନ୍ତୁ।

Signup ପରେ ଆପଣ dashboard, applications, reports, ଓ documents access କରିପାରିବେ।`,
    },
  },
  {
    category: "Dashboard",
    keywords: ["dashboard", "user dashboard", "account overview", "dashboard page", "dashboard help", "how to use dashboard"],
    priority: 6,
    answer: {
      en: `📌 Dashboard Help

The Dashboard gives the user a complete overview of their activity.

Dashboard may show:
- Application summary
- Loan status
- Saved drafts
- Previous applications
- Document status
- CMA or DPR report status
- EMI or repayment information
- Loan details
- Payment history
- Notifications

Step 1: Login to your EazyBizy account.
Step 2: Open the Dashboard.
Step 3: Use quick actions like New Application, Upload Documents, Check Status, or View Loan Details.
Step 4: Open the required section to continue.

Important:
Each logged-in user should only see their own data, applications, reports, documents, and payment history.`,
      hi: `📌 Dashboard Help

Dashboard user को उसकी activity का complete overview देता है।

Dashboard में यह दिख सकता है:
- Application summary
- Loan status
- Saved drafts
- Previous applications
- Document status
- CMA या DPR report status
- EMI या repayment information
- Loan details
- Payment history
- Notifications

Step 1: EazyBizy account में login करें।
Step 2: Dashboard खोलें।
Step 3: New Application, Upload Documents, Check Status, या View Loan Details जैसे quick actions का उपयोग करें।
Step 4: ज़रूरी section खोलकर आगे बढ़ें।

Important:
हर logged-in user को केवल अपना data, applications, reports, documents, और payment history ही दिखना चाहिए।`,
      od: `📌 Dashboard Help

Dashboard user କୁ ତାଙ୍କର activity ର complete overview ଦେଇଥାଏ।

Dashboard ରେ ଏଗୁଡିକ ଦେଖାଯାଇପାରେ:
- Application summary
- Loan status
- Saved drafts
- Previous applications
- Document status
- CMA କିମ୍ବା DPR report status
- EMI କିମ୍ବା repayment information
- Loan details
- Payment history
- Notifications

Step 1: EazyBizy account ରେ login କରନ୍ତୁ।
Step 2: Dashboard ଖୋଲନ୍ତୁ।
Step 3: New Application, Upload Documents, Check Status, କିମ୍ବା View Loan Details ଭଳି quick actions ବ୍ୟବହାର କରନ୍ତୁ।
Step 4: ଆବଶ୍ୟକ section ଖୋଲି ଆଗକୁ ବଢନ୍ତୁ।

Important:
ପ୍ରତ୍ୟେକ logged-in user କୁ କେବଳ ନିଜ data, applications, reports, documents, ଓ payment history ଦେଖାଯିବା ଉଚିତ।`,
    },
  },
  {
    category: "Learning",
    keywords: ["learning", "learning dashboard", "guide", "tutorial", "education", "how to learn", "training"],
    answer: {
      en: `🎓 Learning Section Help

The Learning section helps users understand loans, reports, and website usage.

It can guide users about:
- How to apply for a loan
- How to compare loan schemes
- What is CMA Report
- What is DPR
- What is DSCR
- How to upload documents
- How to calculate EMI
- How to track application status

Step 1: Open the Learning section.
Step 2: Select the topic you want to understand.
Step 3: Read the guide.
Step 4: Follow the steps in your application or dashboard.`,
      hi: `🎓 Learning Section Help

Learning section users को loans, reports, और website usage समझने में मदद करता है।

यह इन topics पर guide कर सकता है:
- loan के लिए apply कैसे करें
- loan schemes compare कैसे करें
- CMA Report क्या है
- DPR क्या है
- DSCR क्या है
- documents कैसे upload करें
- EMI कैसे calculate करें
- application status कैसे track करें

Step 1: Learning section खोलें।
Step 2: जिस topic को समझना है उसे चुनें।
Step 3: guide पढ़ें।
Step 4: application या dashboard में steps follow करें।`,
      od: `🎓 Learning Section Help

Learning section users ଙ୍କୁ loans, reports, ଓ website usage ବୁଝିବାରେ ସାହାଯ୍ୟ କରେ।

ଏହା ଏହି topics ଉପରେ guide କରିପାରେ:
- loan ପାଇଁ apply କିପରି କରିବେ
- loan schemes compare କିପରି କରିବେ
- CMA Report କ’ଣ
- DPR କ’ଣ
- DSCR କ’ଣ
- documents କିପରି upload କରିବେ
- EMI କିପରି calculate କରିବେ
- application status କିପରି track କରିବେ

Step 1: Learning section ଖୋଲନ୍ତୁ।
Step 2: ବୁଝିବାକୁ ଚାହୁଁଥିବା topic ବାଛନ୍ତୁ।
Step 3: guide ପଢନ୍ତୁ।
Step 4: application କିମ୍ବା dashboard ରେ steps follow କରନ୍ତୁ।`,
    },
  },
  {
    category: "Contact",
    keywords: ["contact", "support", "help", "customer care", "email", "phone", "reach out", "how to contact support"],
    priority: 6,
    answer: {
      en: `💬 Contact Page Help

Step 1: Open the Contact page.
Step 2: Fill your name, email, subject, and message.
Step 3: Submit the contact form.
Step 4: Wait for support response.

Contact EazyBizy Support:
Email: eazybizysupport24x7@gmail.com
Phone: +91-674-3184837`,
      hi: `💬 Contact Page Help

Step 1: Contact page खोलें।
Step 2: अपना name, email, subject, और message भरें।
Step 3: contact form submit करें।
Step 4: support response का इंतज़ार करें।

Contact EazyBizy Support:
Email: eazybizysupport24x7@gmail.com
Phone: +91-674-3184837`,
      od: `💬 Contact Page Help

Step 1: Contact page ଖୋଲନ୍ତୁ।
Step 2: ନିଜ name, email, subject, ଓ message ଭରନ୍ତୁ।
Step 3: contact form submit କରନ୍ତୁ।
Step 4: support response ପାଇଁ ଅପେକ୍ଷା କରନ୍ତୁ।

Contact EazyBizy Support:
Email: eazybizysupport24x7@gmail.com
Phone: +91-674-3184837`,
    },
  },
  {
    category: "FAQs",
    keywords: ["faq", "faqs", "questions", "common questions", "help questions"],
    answer: {
      en: `❓ FAQs Help

The FAQs section contains answers to common questions about EazyBizy.

FAQs may include:
- How to apply for a loan?
- Which loan scheme is suitable?
- What documents are required?
- What is CMA Report?
- What is DPR?
- How to upload documents?
- How to check application status?
- How to contact support?

Step 1: Open the FAQs page.
Step 2: Search or read the common questions.
Step 3: Click a question to view the answer.
Step 4: Contact support if your question is not listed.`,
      hi: `❓ FAQs Help

FAQs section में EazyBizy से जुड़े common questions के answers होते हैं।

FAQs में यह शामिल हो सकता है:
- loan के लिए apply कैसे करें?
- कौन-सी loan scheme suitable है?
- कौन-से documents required हैं?
- CMA Report क्या है?
- DPR क्या है?
- documents कैसे upload करें?
- application status कैसे check करें?
- support से कैसे contact करें?

Step 1: FAQs page खोलें।
Step 2: common questions search करें या पढ़ें।
Step 3: answer देखने के लिए question पर click करें।
Step 4: अगर आपका question list में नहीं है तो support से contact करें।`,
      od: `❓ FAQs Help

FAQs section ରେ EazyBizy ସମ୍ବନ୍ଧିତ common questions ର answers ଥାଏ।

FAQs ରେ ଏଗୁଡିକ ଥାଇପାରେ:
- loan ପାଇଁ apply କିପରି କରିବେ?
- କେଉଁ loan scheme suitable?
- କେଉଁ documents required?
- CMA Report କ’ଣ?
- DPR କ’ଣ?
- documents କିପରି upload କରିବେ?
- application status କିପରି check କରିବେ?
- support ସହିତ କିପରି contact କରିବେ?

Step 1: FAQs page ଖୋଲନ୍ତୁ।
Step 2: common questions search କିମ୍ବା ପଢନ୍ତୁ।
Step 3: answer ଦେଖିବାକୁ question ଉପରେ click କରନ୍ତୁ।
Step 4: ଯଦି question list ରେ ନଥାଏ ତେବେ support ସହିତ contact କରନ୍ତୁ।`,
    },
  },
  {
    category: "Application Form",
    keywords: ["application form", "fill form", "new application", "apply", "loan application", "form filling", "how to fill application form"],
    priority: 6,
    answer: {
      en: `📁 Application Form Help

Step 1: Login to your account.
Step 2: Open Dashboard.
Step 3: Click New Application.
Step 4: Fill Personal Information.
Step 5: Fill Business Information.
Step 6: Enter Loan Requirement.
Step 7: Add Financial Details.
Step 8: Upload required documents.
Step 9: Preview your application.
Step 10: Submit the application.

Example fields:
Name = Enter full name as per Aadhaar/PAN.
Mobile Number = Enter active mobile number.
Business Name = Enter your shop/company name.
Loan Amount = Enter required loan amount.
Turnover = Enter yearly business sales.`,
      hi: `📁 Application Form Help

Step 1: account में login करें।
Step 2: Dashboard खोलें।
Step 3: New Application पर click करें।
Step 4: Personal Information भरें।
Step 5: Business Information भरें।
Step 6: Loan Requirement दर्ज करें।
Step 7: Financial Details जोड़ें।
Step 8: required documents upload करें।
Step 9: application preview करें।
Step 10: application submit करें।

Example fields:
Name = Aadhaar/PAN के अनुसार पूरा नाम।
Mobile Number = active mobile number।
Business Name = shop/company का नाम।
Loan Amount = required loan amount।
Turnover = yearly business sales।`,
      od: `📁 Application Form Help

Step 1: account ରେ login କରନ୍ତୁ।
Step 2: Dashboard ଖୋଲନ୍ତୁ।
Step 3: New Application ଉପରେ click କରନ୍ତୁ।
Step 4: Personal Information ଭରନ୍ତୁ।
Step 5: Business Information ଭରନ୍ତୁ।
Step 6: Loan Requirement ଦିଅନ୍ତୁ।
Step 7: Financial Details ଯୋଡନ୍ତୁ।
Step 8: required documents upload କରନ୍ତୁ।
Step 9: application preview କରନ୍ତୁ।
Step 10: application submit କରନ୍ତୁ।

Example fields:
Name = Aadhaar/PAN ଅନୁଯାୟୀ ପୂର୍ଣ୍ଣ ନାମ।
Mobile Number = active mobile number।
Business Name = shop/company ନାମ।
Loan Amount = required loan amount।
Turnover = yearly business sales।`,
    },
  },
  {
    category: "Personal Information",
    keywords: ["personal details", "personal information", "applicant details", "name", "aadhaar", "pan"],
    answer: {
      en: `👤 Personal Information Help

In Personal Information, fill:

Name = Full legal name
Mobile Number = Active mobile number
Email = Active email address
Date of Birth = Applicant date of birth
Address = Current address
Aadhaar Number = 12-digit Aadhaar number
PAN Number = 10-character PAN number`,
      hi: `👤 Personal Information Help

Personal Information में यह भरें:

Name = पूरा legal name
Mobile Number = active mobile number
Email = active email address
Date of Birth = applicant date of birth
Address = current address
Aadhaar Number = 12-digit Aadhaar number
PAN Number = 10-character PAN number`,
      od: `👤 Personal Information Help

Personal Information ରେ ଏହା ଭରନ୍ତୁ:

Name = ପୂର୍ଣ୍ଣ legal name
Mobile Number = active mobile number
Email = active email address
Date of Birth = applicant date of birth
Address = current address
Aadhaar Number = 12-digit Aadhaar number
PAN Number = 10-character PAN number`,
    },
  },
  {
    category: "Business Information",
    keywords: ["business details", "business information", "shop details", "company details", "gst", "udyam"],
    answer: {
      en: `🏢 Business Information Help

In Business Information, fill:

Business Name = Registered business or shop name
Business Type = Proprietorship, Partnership, Private Limited, etc.
Business Category = Trading, Service, or Manufacturing
Business Address = Business location
Years in Business = Business running period
GST Number = GSTIN if available
Udyam Registration = Udyam number if available
Annual Turnover = Yearly sales amount`,
      hi: `🏢 Business Information Help

Business Information में यह भरें:

Business Name = registered business या shop name
Business Type = Proprietorship, Partnership, Private Limited, आदि
Business Category = Trading, Service, या Manufacturing
Business Address = business location
Years in Business = business running period
GST Number = GSTIN अगर available हो
Udyam Registration = Udyam number अगर available हो
Annual Turnover = yearly sales amount`,
      od: `🏢 Business Information Help

Business Information ରେ ଏହା ଭରନ୍ତୁ:

Business Name = registered business କିମ୍ବା shop name
Business Type = Proprietorship, Partnership, Private Limited, ଇତ୍ୟାଦି
Business Category = Trading, Service, କିମ୍ବା Manufacturing
Business Address = business location
Years in Business = business running period
GST Number = GSTIN ଯଦି available ଥାଏ
Udyam Registration = Udyam number ଯଦି available ଥାଏ
Annual Turnover = yearly sales amount`,
    },
  },
  {
    category: "CMA Report",
    keywords: ["cma", "cma report", "credit monitoring arrangement", "bank report", "financial report", "what is cma report"],
    priority: 6,
    answer: {
      en: `📊 CMA Report Help

CMA Report means Credit Monitoring Arrangement.

It is used by banks to check the financial strength and repayment capacity of a business.

CMA Report includes:
- Business profile
- Projected profit and loss
- Balance sheet
- Cash flow
- Fund flow
- Working capital calculation
- DSCR
- Financial ratios
- Loan repayment capacity

To prepare CMA Report:
Step 1: Enter business details.
Step 2: Add sales, purchase, and expense details.
Step 3: Add assets and liabilities.
Step 4: Enter loan requirement.
Step 5: Review financial projections.
Step 6: Generate CMA report.`,
      hi: `📊 CMA Report Help

CMA Report का मतलब Credit Monitoring Arrangement है।

यह bank को business की financial strength और repayment capacity check करने में मदद करता है।

CMA Report में शामिल है:
- Business profile
- Projected profit and loss
- Balance sheet
- Cash flow
- Fund flow
- Working capital calculation
- DSCR
- Financial ratios
- Loan repayment capacity

CMA Report तैयार करने के लिए:
Step 1: business details भरें।
Step 2: sales, purchase, और expense details जोड़ें।
Step 3: assets और liabilities जोड़ें।
Step 4: loan requirement दर्ज करें।
Step 5: financial projections review करें।
Step 6: CMA report generate करें।`,
      od: `📊 CMA Report Help

CMA Report ର ଅର୍ଥ Credit Monitoring Arrangement।

ଏହା bank କୁ business ର financial strength ଓ repayment capacity check କରିବାରେ ସାହାଯ୍ୟ କରେ।

CMA Report ରେ ଥାଏ:
- Business profile
- Projected profit and loss
- Balance sheet
- Cash flow
- Fund flow
- Working capital calculation
- DSCR
- Financial ratios
- Loan repayment capacity

CMA Report ପ୍ରସ୍ତୁତ ପାଇଁ:
Step 1: business details ଭରନ୍ତୁ।
Step 2: sales, purchase, ଓ expense details ଯୋଡନ୍ତୁ।
Step 3: assets ଓ liabilities ଯୋଡନ୍ତୁ।
Step 4: loan requirement ଦିଅନ୍ତୁ।
Step 5: financial projections review କରନ୍ତୁ।
Step 6: CMA report generate କରନ୍ତୁ।`,
    },
  },
  {
    category: "DPR Report",
    keywords: ["dpr", "detailed project report", "project report", "what is dpr"],
    priority: 6,
    answer: {
      en: `📄 DPR Report Help

DPR means Detailed Project Report.

It explains the complete business or project plan for bank loan approval.

DPR includes:
- Business introduction
- Promoter details
- Project cost
- Machinery or equipment cost
- Working capital requirement
- Revenue projection
- Profitability projection
- Loan requirement
- Repayment plan`,
      hi: `📄 DPR Report Help

DPR का मतलब Detailed Project Report है।

यह bank loan approval के लिए complete business या project plan समझाता है।

DPR में शामिल है:
- Business introduction
- Promoter details
- Project cost
- Machinery या equipment cost
- Working capital requirement
- Revenue projection
- Profitability projection
- Loan requirement
- Repayment plan`,
      od: `📄 DPR Report Help

DPR ର ଅର୍ଥ Detailed Project Report।

ଏହା bank loan approval ପାଇଁ complete business କିମ୍ବା project plan ବ୍ୟାଖ୍ୟା କରେ।

DPR ରେ ଥାଏ:
- Business introduction
- Promoter details
- Project cost
- Machinery କିମ୍ବା equipment cost
- Working capital requirement
- Revenue projection
- Profitability projection
- Loan requirement
- Repayment plan`,
    },
  },
  {
    category: "DSCR",
    keywords: ["dscr", "debt service coverage ratio", "repayment capacity"],
    answer: {
      en: `📉 DSCR Help

DSCR means Debt Service Coverage Ratio.

It checks whether the business has enough income to repay the loan.

Simple formula:
DSCR = Net Operating Income / Total Debt Service

A good DSCR means better repayment capacity.`,
      hi: `📉 DSCR Help

DSCR का मतलब Debt Service Coverage Ratio है।

यह check करता है कि business के पास loan repay करने के लिए पर्याप्त income है या नहीं।

Simple formula:
DSCR = Net Operating Income / Total Debt Service

अच्छा DSCR बेहतर repayment capacity दिखाता है।`,
      od: `📉 DSCR Help

DSCR ର ଅର୍ଥ Debt Service Coverage Ratio।

ଏହା check କରେ ଯେ business ପାଖରେ loan repay କରିବାକୁ ପର୍ଯ୍ୟାପ୍ତ income ଅଛି କି ନାହିଁ।

Simple formula:
DSCR = Net Operating Income / Total Debt Service

ଭଲ DSCR ଭଲ repayment capacity ଦେଖାଏ।`,
    },
  },
  {
    category: "Application Preview",
    keywords: ["application preview", "preview application", "review application", "final preview", "check application"],
    answer: {
      en: `👁️ Application Preview Help

Application Preview helps users check all details before final submission.

Step 1: Complete all required form sections.
Step 2: Click Preview Application.
Step 3: Check personal, business, loan, and document details.
Step 4: Edit any incorrect information.
Step 5: Submit only after confirming all details are correct.`,
      hi: `👁️ Application Preview Help

Application Preview final submission से पहले सभी details check करने में मदद करता है।

Step 1: सभी required form sections complete करें।
Step 2: Preview Application पर click करें।
Step 3: personal, business, loan, और document details check करें।
Step 4: गलत information हो तो edit करें।
Step 5: सब कुछ सही होने पर ही submit करें।`,
      od: `👁️ Application Preview Help

Application Preview final submission ପୂର୍ବରୁ ସମସ୍ତ details check କରିବାରେ ସାହାଯ୍ୟ କରେ।

Step 1: ସମସ୍ତ required form sections complete କରନ୍ତୁ।
Step 2: Preview Application ଉପରେ click କରନ୍ତୁ।
Step 3: personal, business, loan, ଓ document details check କରନ୍ତୁ।
Step 4: ଭୁଲ information ଥିଲେ edit କରନ୍ତୁ।
Step 5: ସବୁଠିକ୍ ହେଲେ submit କରନ୍ତୁ।`,
    },
  },
  {
    category: "Document Upload",
    keywords: ["documents", "upload documents", "aadhaar upload", "pan upload", "bank statement", "gst", "udyam", "business proof", "how to upload documents"],
    priority: 6,
    answer: {
      en: `📄 Document Upload Help

Step 1: Login to your account.
Step 2: Open Documents section.
Step 3: Select document type.
Step 4: Upload PDF, JPG, or PNG file.
Step 5: Click Submit.
Step 6: Check document verification status.

Common documents:
- Aadhaar Card
- PAN Card
- Bank Statement
- GST Certificate if available
- Udyam Registration if available
- Business Proof
- Income Proof
- CMA Report if required
- DPR if required`,
      hi: `📄 Document Upload Help

Step 1: account में login करें।
Step 2: Documents section खोलें।
Step 3: document type select करें।
Step 4: PDF, JPG, या PNG file upload करें।
Step 5: Submit पर click करें।
Step 6: document verification status check करें।

Common documents:
- Aadhaar Card
- PAN Card
- Bank Statement
- GST Certificate अगर available हो
- Udyam Registration अगर available हो
- Business Proof
- Income Proof
- CMA Report अगर required हो
- DPR अगर required हो`,
      od: `📄 Document Upload Help

Step 1: account ରେ login କରନ୍ତୁ।
Step 2: Documents section ଖୋଲନ୍ତୁ।
Step 3: document type select କରନ୍ତୁ।
Step 4: PDF, JPG, କିମ୍ବା PNG file upload କରନ୍ତୁ।
Step 5: Submit ଉପରେ click କରନ୍ତୁ।
Step 6: document verification status check କରନ୍ତୁ।

Common documents:
- Aadhaar Card
- PAN Card
- Bank Statement
- GST Certificate ଯଦି available ଥାଏ
- Udyam Registration ଯଦି available ଥାଏ
- Business Proof
- Income Proof
- CMA Report ଯଦି required ଥାଏ
- DPR ଯଦି required ଥାଏ`,
    },
  },
  {
    category: "Document Status",
    keywords: ["document status", "verified", "rejected", "pending", "need more documents"],
    answer: {
      en: `✅ Document Status Help

Document status meaning:

Pending = Document uploaded but not checked yet
Verified = Document is approved
Rejected = Document has an issue
Need More Documents = User must upload extra or corrected documents

If rejected:
Step 1: Open Documents section.
Step 2: Check rejection reason.
Step 3: Upload corrected document.
Step 4: Submit again.`,
      hi: `✅ Document Status Help

Document status का meaning:

Pending = document upload हुआ है, पर check नहीं हुआ
Verified = document approved है
Rejected = document में issue है
Need More Documents = extra या corrected documents upload करने हैं

अगर rejected हो:
Step 1: Documents section खोलें।
Step 2: rejection reason देखें।
Step 3: corrected document upload करें।
Step 4: फिर से submit करें।`,
      od: `✅ Document Status Help

Document status ର meaning:

Pending = document upload ହୋଇଛି, କିନ୍ତୁ check ହୋଇନାହିଁ
Verified = document approved
Rejected = document ରେ issue ଅଛି
Need More Documents = extra କିମ୍ବା corrected documents upload କରିବାକୁ ପଡିବ

ଯଦି rejected:
Step 1: Documents section ଖୋଲନ୍ତୁ।
Step 2: rejection reason ଦେଖନ୍ତୁ।
Step 3: corrected document upload କରନ୍ତୁ।
Step 4: ପୁଣି submit କରନ୍ତୁ।`,
    },
  },
  {
    category: "Loan Details",
    keywords: ["loan details", "loan amount", "interest rate", "tenure", "processing fee", "repayment", "emi details"],
    answer: {
      en: `💳 Loan Details Help

Loan Details section shows important loan information.

It may include:
- Loan Amount
- Loan Type
- Interest Rate
- EMI Amount
- Tenure
- Processing Fees
- Repayment Details
- Application ID
- Current Loan Status

Step 1: Login to your account.
Step 2: Open Loan Details.
Step 3: Select your application.
Step 4: View complete loan information.`,
      hi: `💳 Loan Details Help

Loan Details section important loan information दिखाता है।

इसमें यह शामिल हो सकता है:
- Loan Amount
- Loan Type
- Interest Rate
- EMI Amount
- Tenure
- Processing Fees
- Repayment Details
- Application ID
- Current Loan Status

Step 1: account में login करें।
Step 2: Loan Details खोलें।
Step 3: अपनी application चुनें।
Step 4: complete loan information देखें।`,
      od: `💳 Loan Details Help

Loan Details section important loan information ଦେଖାଏ।

ଏଥିରେ ଏହା ଥାଇପାରେ:
- Loan Amount
- Loan Type
- Interest Rate
- EMI Amount
- Tenure
- Processing Fees
- Repayment Details
- Application ID
- Current Loan Status

Step 1: account ରେ login କରନ୍ତୁ।
Step 2: Loan Details ଖୋଲନ୍ତୁ।
Step 3: ନିଜ application ବାଛନ୍ତୁ।
Step 4: complete loan information ଦେଖନ୍ତୁ।`,
    },
  },
  {
    category: "Payment History",
    keywords: ["payment history", "payment", "repayment", "emi paid", "transaction", "installment history", "how to check payment history"],
    priority: 6,
    answer: {
      en: `💳 Payment History Help

Payment History helps users track repayment activity.

It may show:
- Paid EMI records
- Pending payments
- Payment date
- Transaction status
- Payment amount
- Receipt or reference details

Step 1: Login to your account.
Step 2: Open Dashboard.
Step 3: Go to Payment History.
Step 4: Check paid, pending, or failed payment details.`,
      hi: `💳 Payment History Help

Payment History users को repayment activity track करने में मदद करता है।

इसमें यह दिख सकता है:
- Paid EMI records
- Pending payments
- Payment date
- Transaction status
- Payment amount
- Receipt या reference details

Step 1: account में login करें।
Step 2: Dashboard खोलें।
Step 3: Payment History में जाएँ।
Step 4: paid, pending, या failed payment details check करें।`,
      od: `💳 Payment History Help

Payment History users ଙ୍କୁ repayment activity track କରିବାରେ ସାହାଯ୍ୟ କରେ।

ଏଥିରେ ଏହା ଦେଖାଯାଇପାରେ:
- Paid EMI records
- Pending payments
- Payment date
- Transaction status
- Payment amount
- Receipt କିମ୍ବା reference details

Step 1: account ରେ login କରନ୍ତୁ।
Step 2: Dashboard ଖୋଲନ୍ତୁ।
Step 3: Payment History କୁ ଯାନ୍ତୁ।
Step 4: paid, pending, କିମ୍ବା failed payment details check କରନ୍ତୁ।`,
    },
  },
  {
    category: "Application Status",
    keywords: ["application status", "status tracker", "track application", "submitted", "under review", "approved", "rejected", "how to check application status"],
    priority: 6,
    answer: {
      en: `📌 Application Status Help

Application Status shows the progress of the user’s application.

Status stages:
Submitted = Application submitted successfully
Under Review = Team is checking details
Verification = Documents and data are being verified
Approved = Application or report is approved
Rejected = Application has been rejected
Need More Documents = User must upload missing or corrected documents

Step 1: Login to your account.
Step 2: Open Status Tracker.
Step 3: Select your application.
Step 4: Check current status and remarks.`,
      hi: `📌 Application Status Help

Application Status user की application की progress दिखाता है।

Status stages:
Submitted = application successfully submit हुई
Under Review = team details check कर रही है
Verification = documents और data verify हो रहे हैं
Approved = application या report approved
Rejected = application reject हुई
Need More Documents = missing या corrected documents upload करने हैं

Step 1: account में login करें।
Step 2: Status Tracker खोलें।
Step 3: अपनी application चुनें।
Step 4: current status और remarks check करें।`,
      od: `📌 Application Status Help

Application Status user ଙ୍କ application ର progress ଦେଖାଏ।

Status stages:
Submitted = application ସଫଳତାର ସହ submit ହୋଇଛି
Under Review = team details check କରୁଛି
Verification = documents ଓ data verify ହେଉଛି
Approved = application କିମ୍ବା report approved
Rejected = application reject ହୋଇଛି
Need More Documents = missing କିମ୍ବା corrected documents upload କରିବାକୁ ପଡିବ

Step 1: account ରେ login କରନ୍ତୁ।
Step 2: Status Tracker ଖୋଲନ୍ତୁ।
Step 3: ନିଜ application ବାଛନ୍ତୁ।
Step 4: current status ଓ remarks check କରନ୍ତୁ।`,
    },
  },
  {
    category: "Loan History",
    keywords: ["loan history", "previous application", "old application", "saved report", "report history"],
    answer: {
      en: `🕘 Loan History Help

Loan History shows the user’s previous loan and report activity.

It may include:
- Previous loan applications
- Saved drafts
- Submitted forms
- Generated reports
- Old application status
- Document status

Important:
Each user should only see their own loan history after login.`,
      hi: `🕘 Loan History Help

Loan History user की previous loan और report activity दिखाता है।

इसमें यह शामिल हो सकता है:
- Previous loan applications
- Saved drafts
- Submitted forms
- Generated reports
- Old application status
- Document status

Important:
Login के बाद हर user को केवल अपनी loan history ही दिखनी चाहिए।`,
      od: `🕘 Loan History Help

Loan History user ଙ୍କ previous loan ଓ report activity ଦେଖାଏ।

ଏଥିରେ ଏହା ଥାଇପାରେ:
- Previous loan applications
- Saved drafts
- Submitted forms
- Generated reports
- Old application status
- Document status

Important:
Login ପରେ ପ୍ରତ୍ୟେକ user କୁ କେବଳ ନିଜ loan history ଦେଖାଯିବା ଉଚିତ।`,
    },
  },
  {
    category: "Saved Drafts",
    keywords: ["draft", "saved draft", "incomplete application", "continue application"],
    answer: {
      en: `💾 Saved Drafts Help

Saved Draft helps users continue incomplete applications later.

Step 1: Login to your account.
Step 2: Open Dashboard or Application History.
Step 3: Click Saved Drafts.
Step 4: Select the draft.
Step 5: Continue filling the form.
Step 6: Preview and submit.`,
      hi: `💾 Saved Drafts Help

Saved Draft users को incomplete applications बाद में continue करने में मदद करता है।

Step 1: account में login करें।
Step 2: Dashboard या Application History खोलें।
Step 3: Saved Drafts पर click करें।
Step 4: draft चुनें।
Step 5: form भरना continue करें।
Step 6: preview करके submit करें।`,
      od: `💾 Saved Drafts Help

Saved Draft users ଙ୍କୁ incomplete applications ପରେ continue କରିବାରେ ସାହାଯ୍ୟ କରେ।

Step 1: account ରେ login କରନ୍ତୁ।
Step 2: Dashboard କିମ୍ବା Application History ଖୋଲନ୍ତୁ।
Step 3: Saved Drafts ଉପରେ click କରନ୍ତୁ।
Step 4: draft ବାଛନ୍ତୁ।
Step 5: form ଭରା continue କରନ୍ତୁ।
Step 6: preview କରି submit କରନ୍ତୁ।`,
    },
  },
  {
    category: "Profile",
    keywords: ["profile", "account", "user profile", "update profile", "my account"],
    answer: {
      en: `👤 Profile Help

The Profile section helps users view or update their account details.

It may include:
- Name
- Email
- Mobile number
- Address
- Business details
- Password or security settings

Step 1: Login to your account.
Step 2: Open Profile or Settings.
Step 3: Update required details.
Step 4: Save changes.`,
      hi: `👤 Profile Help

Profile section users को account details देखने या update करने में मदद करता है।

इसमें यह शामिल हो सकता है:
- Name
- Email
- Mobile number
- Address
- Business details
- Password या security settings

Step 1: account में login करें।
Step 2: Profile या Settings खोलें।
Step 3: required details update करें।
Step 4: changes save करें।`,
      od: `👤 Profile Help

Profile section users ଙ୍କୁ account details ଦେଖିବା କିମ୍ବା update କରିବାରେ ସାହାଯ୍ୟ କରେ।

ଏଥିରେ ଏହା ଥାଇପାରେ:
- Name
- Email
- Mobile number
- Address
- Business details
- Password କିମ୍ବା security settings

Step 1: account ରେ login କରନ୍ତୁ।
Step 2: Profile କିମ୍ବା Settings ଖୋଲନ୍ତୁ।
Step 3: required details update କରନ୍ତୁ।
Step 4: changes save କରନ୍ତୁ।`,
    },
  },
  {
    category: "User Data Privacy",
    keywords: ["privacy", "my data", "user data", "secure", "personal information", "other users data"],
    priority: 6,
    answer: {
      en: `🔐 User Data Privacy

EazyBizy should keep user data private and secure.

Important rules:
- A logged-in user should only see their own applications.
- A logged-in user should only see their own reports.
- A logged-in user should only see their own documents.
- A logged-in user should only see their own payment history.
- Normal users must not see other users’ records.
- Admin can manage all user records only from the admin panel.`,
      hi: `🔐 User Data Privacy

EazyBizy को user data private और secure रखना चाहिए।

Important rules:
- logged-in user को केवल अपनी applications दिखनी चाहिए।
- logged-in user को केवल अपनी reports दिखनी चाहिए।
- logged-in user को केवल अपने documents दिखने चाहिए।
- logged-in user को केवल अपनी payment history दिखनी चाहिए।
- normal users को दूसरे users के records नहीं दिखने चाहिए।
- admin सभी user records केवल admin panel से manage कर सकता है।`,
      od: `🔐 User Data Privacy

EazyBizy କୁ user data private ଓ secure ରଖିବା ଉଚିତ।

Important rules:
- logged-in user କୁ କେବଳ ନିଜ applications ଦେଖାଯିବା ଉଚିତ।
- logged-in user କୁ କେବଳ ନିଜ reports ଦେଖାଯିବା ଉଚିତ।
- logged-in user କୁ କେବଳ ନିଜ documents ଦେଖାଯିବା ଉଚିତ।
- logged-in user କୁ କେବଳ ନିଜ payment history ଦେଖାଯିବା ଉଚିତ।
- normal users ମାନେ ଅନ୍ୟ users ଙ୍କ records ଦେଖିପାରିବେ ନାହିଁ।
- admin ସମସ୍ତ user records କେବଳ admin panel ରୁ manage କରିପାରିବେ।`,
    },
  },
  {
    category: "Mobile Navigation",
    keywords: ["mobile menu", "hamburger menu", "triple bar", "navigation", "mobile dashboard"],
    answer: {
      en: `📱 Mobile Navigation Help

On mobile:

Step 1: Tap the triple-bar menu icon.
Step 2: Choose Dashboard, Application, Documents, Loan Details, Learning, Contact, or FAQs.
Step 3: Open the required section.
Step 4: Use the back button to return to the previous page.`,
      hi: `📱 Mobile Navigation Help

Mobile पर:

Step 1: triple-bar menu icon पर tap करें।
Step 2: Dashboard, Application, Documents, Loan Details, Learning, Contact, या FAQs चुनें।
Step 3: ज़रूरी section खोलें।
Step 4: previous page पर लौटने के लिए back button का उपयोग करें।`,
      od: `📱 Mobile Navigation Help

Mobile ରେ:

Step 1: triple-bar menu icon ଉପରେ tap କରନ୍ତୁ।
Step 2: Dashboard, Application, Documents, Loan Details, Learning, Contact, କିମ୍ବା FAQs ବାଛନ୍ତୁ।
Step 3: ଆବଶ୍ୟକ section ଖୋଲନ୍ତୁ।
Step 4: previous page କୁ ଫେରିବା ପାଇଁ back button ବ୍ୟବହାର କରନ୍ତୁ।`,
    },
  },
  {
    category: "Support",
    keywords: ["support issue", "problem", "not working", "error", "technical issue"],
    priority: 4,
    answer: {
      en: `🛠️ Support Help

If you need support:

Step 1: Open the Contact page.
Step 2: Fill the support form.
Step 3: Mention your issue clearly.
Step 4: Submit the form.

Contact EazyBizy Support:
Email: eazybizysupport24x7@gmail.com
Phone: +91-674-3184837`,
      hi: `🛠️ Support Help

अगर आपको support चाहिए:

Step 1: Contact page खोलें।
Step 2: support form भरें।
Step 3: अपना issue clearly लिखें।
Step 4: form submit करें।

Contact EazyBizy Support:
Email: eazybizysupport24x7@gmail.com
Phone: +91-674-3184837`,
      od: `🛠️ Support Help

ଯଦି support ଦରକାର:

Step 1: Contact page ଖୋଲନ୍ତୁ।
Step 2: support form ଭରନ୍ତୁ।
Step 3: ନିଜ issue ସ୍ପଷ୍ଟ ଭାବରେ ଲେଖନ୍ତୁ।
Step 4: form submit କରନ୍ତୁ।

Contact EazyBizy Support:
Email: eazybizysupport24x7@gmail.com
Phone: +91-674-3184837`,
    },
  },
];
