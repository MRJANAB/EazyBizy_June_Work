import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, User, Copy, CheckCheck } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface AIAssistBadgeProps {
  fieldLabel?: string;
  tooltip?: string;
  variant?: "default" | "inline";
  onApply?: (text: string) => void;
}

interface AssistPanelProps {
  fieldLabel: string;
  onClose: () => void;
  onApply?: (text: string) => void;
}

const DEFAULT_FIELD_LABEL = "this field";
const QUICK_PROMPTS = ["Write a sample", "Make it formal", "Make it shorter", "Give me tips"];

const getWelcomeMessage = (fieldLabel: string): Message => ({
  role: "assistant",
  text: `Hi! I'm here to help you fill in **${fieldLabel}**.\n\nClick a quick option below or type your question!`,
});

// Stub AI response; replace this function body with a real API call later.
async function getAIResponse(fieldLabel: string, messages: Message[]): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 900));

  const lastMsg = messages[messages.length - 1]?.text?.toLowerCase() || "";
  const field = fieldLabel.toLowerCase();

  if (lastMsg.includes("shorter") || lastMsg.includes("brief") || lastMsg.includes("concise")) {
    return `Here's a concise version for **${fieldLabel}**:\n\nA focused, streamlined description that highlights the most important points clearly and professionally.`;
  }

  if (lastMsg.includes("formal") || lastMsg.includes("professional")) {
    return `Here's a formal version for **${fieldLabel}**:\n\nThis business entity operates with a commitment to excellence, delivering high-quality products and services in accordance with industry standards and regulatory requirements.`;
  }

  if (lastMsg.includes("example") || lastMsg.includes("sample")) {
    if (field.includes("business overview") || field.includes("business description")) {
      return `**Example for Business Overview:**\n\nABC Enterprises is a registered MSME specializing in eco-friendly packaging solutions. Established in 2022 in Pune, we manufacture biodegradable packaging for FMCG companies across Maharashtra. We serve 40+ clients with a monthly turnover of Rs 8 lakhs and plan to expand into Gujarat and Karnataka within 18 months.`;
    }

    if (field.includes("product") || field.includes("service")) {
      return `**Example for Products/Services:**\n\n1. Biodegradable carry bags (sizes: small, medium, large)\n2. Food-grade paper packaging boxes\n3. Custom printed packaging for retail brands\n\nAll products are BIS certified and manufactured using recycled kraft paper.`;
    }

    if (field.includes("market") || field.includes("customer")) {
      return `**Example for Target Market:**\n\nPrimary: FMCG companies and supermarkets in Tier 1 and Tier 2 cities\nSecondary: E-commerce sellers and kirana stores\nTarget age: Business owners aged 25-55\nGeography: Maharashtra, Gujarat, Karnataka`;
    }

    if (field.includes("competitive") || field.includes("usp")) {
      return `**Example for Competitive Advantage:**\n\nOur key differentiators are:\n- 48-hour delivery guarantee within a 200 km radius\n- ISO 9001 certified manufacturing process\n- 15% lower pricing than competitors due to in-house raw material processing\n- Custom branding and printing at no extra cost`;
    }

    if (field.includes("promoter") || field.includes("experience")) {
      return `**Example for Promoter Experience:**\n\nMr. Rajesh Shah, 38, holds a B.E. in Mechanical Engineering from VJTI Mumbai and has 12 years of experience in the packaging industry. He previously worked as Production Manager at Parle Products Pvt. Ltd. before founding ABC Enterprises in 2022.`;
    }

    if (field.includes("introduction")) {
      return `**Example Introduction:**\n\nThis project report presents the business plan for ABC Enterprises, a Pune-based MSME seeking a term loan of Rs 25 lakhs under the PMEGP scheme. The enterprise is engaged in eco-friendly packaging manufacturing and has demonstrated consistent growth since inception in 2022.`;
    }

    if (field.includes("collateral")) {
      return `**Example for Collateral Details:**\n\nResidential property at Plot No. 42, Sector 7, Pune - market value Rs 45 lakhs (owned by applicant, mortgage-free). Fixed deposit of Rs 3 lakhs in SBI. Vehicle RC of Tata Ace (2022 model) worth Rs 4.5 lakhs.`;
    }

    return `**Example for ${fieldLabel}:**\n\nHere is a sample entry that demonstrates the kind of information banks and lenders typically look for in this section. Be specific, use real numbers where possible, and keep the tone professional.`;
  }

  if (field.includes("business overview") || field.includes("business description")) {
    return `I can help you write a strong **Business Overview** for your bank submission.\n\nA good overview includes:\n- What your business does\n- Where it operates\n- How long it has been running\n- Monthly turnover or projections\n- Number of employees\n\nWould you like me to write a **sample**, make it **more formal**, or make it **shorter**?`;
  }

  if (field.includes("product") || field.includes("service")) {
    return `For **Products / Services**, banks want clear specifics.\n\nTry to include:\n- List of main products or services\n- Any certifications (BIS, FSSAI, ISO)\n- Pricing range or volume capacity\n\nType **"example"** and I'll write a sample for you!`;
  }

  if (field.includes("market") || field.includes("customer")) {
    return `For **Target Market**, describe:\n- Who your customers are (B2B or B2C)\n- Which cities or regions you serve\n- Approximate customer count\n\nType **"example"** for a sample!`;
  }

  if (field.includes("competitive") || field.includes("usp")) {
    return `Your **Competitive Advantage** should answer: Why would a customer choose you over others?\n\nStrong USPs include:\n- Price advantage\n- Faster delivery\n- Better quality or certification\n- Unique technology or process\n\nType **"example"** for a sample!`;
  }

  if (field.includes("promoter") || field.includes("experience")) {
    return `For **Promoter Experience**, include:\n- Your educational qualifications\n- Years of relevant work experience\n- Previous companies or roles\n- Any awards or recognition\n\nThis builds lender confidence. Type **"example"** for a sample!`;
  }

  if (field.includes("introduction")) {
    return `The **Introduction** section sets the tone for your entire project report.\n\nIt should cover:\n- Name and type of business\n- Loan amount and scheme applied for\n- Location and registration details\n- Brief purpose of the loan\n\nType **"example"** and I'll draft one for you!`;
  }

  if (field.includes("market aspects")) {
    return `**Market Aspects** should describe:\n- Size of the target market\n- Growth trends in your industry\n- Your market share or target share\n- Demand drivers for your product or service\n\nType **"example"** for a complete sample!`;
  }

  if (field.includes("management aspects")) {
    return `**Management Aspects** covers:\n- Organizational structure\n- Key team members and their roles\n- Management experience and expertise\n- Decision-making processes\n\nType **"example"** for a sample!`;
  }

  if (field.includes("technical aspects")) {
    return `**Technical Aspects** should explain:\n- Manufacturing process or service delivery\n- Machinery and equipment used\n- Location and infrastructure\n- Capacity and production details\n\nType **"example"** for a sample!`;
  }

  if (field.includes("financial aspects")) {
    return `**Financial Aspects** should include:\n- Total project cost breakdown\n- Means of finance (loan plus own contribution)\n- Projected revenue for 3-5 years\n- Break-even point\n\nType **"example"** for a sample!`;
  }

  if (field.includes("address")) {
    return `I can help format your **Address** properly for official documents.\n\nMake sure to include:\n- Building or plot number\n- Street and area name\n- City, State, Pincode\n\nType **"example"** for a sample!`;
  }

  if (field.includes("collateral")) {
    return `For **Collateral Details**, list all assets you can offer as security:\n- Property (with approximate market value)\n- Fixed deposits\n- Vehicles (with RC number)\n- Gold or jewellery\n- Machinery\n\nType **"example"** for a sample!`;
  }

  return `I can help you fill in **${fieldLabel}** with professional, bank-ready content.\n\nTry asking:\n- **"Write a sample"** and I'll draft a complete example\n- **"Make it formal"** for a professional tone\n- **"Make it shorter"** for a concise version\n\nWhat would you like?`;
}

const cleanMessageText = (text: string) =>
  text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^(Example for .+?:|Here's a .+?:)\n\n/i, "")
    .trim();

const renderText = (text: string) => {
  const lines = text.split("\n");

  return lines.map((line, index) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);

    return (
      <span key={`${line}-${index}`}>
        {parts.map((part, partIndex) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={`${part}-${partIndex}`}>{part.slice(2, -2)}</strong>
          ) : (
            <span key={`${part}-${partIndex}`}>{part}</span>
          ),
        )}
        {index < lines.length - 1 && <br />}
      </span>
    );
  });
};

const AssistPanel = ({ fieldLabel, onClose, onApply }: AssistPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([getWelcomeMessage(fieldLabel)]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const send = async (text: string) => {
    const nextText = text.trim();
    if (!nextText || loading) return;

    const userMessage: Message = { role: "user", text: nextText };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    const reply = await getAIResponse(fieldLabel, updatedMessages);
    setMessages([...updatedMessages, { role: "assistant", text: reply }]);
    setLoading(false);
  };

  const handleApply = (text: string) => {
    if (!onApply) return;

    onApply(cleanMessageText(text));
    onClose();
  };

  const handleCopy = async (text: string, index: number) => {
    const cleanText = cleanMessageText(text);

    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(cleanText);
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      <div
        className="fixed bottom-6 right-6 z-[80] flex flex-col overflow-hidden shadow-2xl"
        style={{
          width: "min(360px, calc(100vw - 24px))",
          height: "min(520px, calc(100vh - 24px))",
          background: "hsl(220 24% 12%)",
          border: "1px solid hsl(220 20% 20%)",
          borderRadius: "20px",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="flex flex-shrink-0 items-center justify-between px-4 py-3"
          style={{
            background: "hsl(174 72% 56% / 0.10)",
            borderBottom: "1px solid hsl(220 20% 20%)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: "hsl(174 72% 56% / 0.20)" }}
            >
              <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(174 72% 56%)" }} />
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight text-white">AI Assist</p>
              <p className="text-[10px] leading-tight" style={{ color: "hsl(174 72% 56%)" }}>
                {fieldLabel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={`Close AI assist for ${fieldLabel}`}
            className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: "thin" }}>
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={cn("flex gap-2", message.role === "user" ? "flex-row-reverse" : "flex-row")}
            >
              <div
                className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                style={{
                  background:
                    message.role === "assistant" ? "hsl(174 72% 56% / 0.20)" : "hsl(220 20% 25%)",
                }}
              >
                {message.role === "assistant" ? (
                  <Sparkles className="h-3 w-3" style={{ color: "hsl(174 72% 56%)" }} />
                ) : (
                  <User className="h-3 w-3 text-gray-300" />
                )}
              </div>

              <div
                className={cn(
                  "flex max-w-[82%] flex-col gap-1",
                  message.role === "user" ? "items-end" : "items-start",
                )}
              >
                <div
                  className="rounded-2xl px-3 py-2 text-xs leading-relaxed"
                  style={{
                    background:
                      message.role === "user" ? "hsl(174 72% 56% / 0.18)" : "hsl(220 20% 18%)",
                    color: message.role === "user" ? "hsl(174 72% 75%)" : "#e2e8f0",
                    borderRadius:
                      message.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                  }}
                >
                  {renderText(message.text)}
                </div>

                {message.role === "assistant" && index > 0 && (
                  <div className="flex gap-1.5">
                    {onApply && (
                      <button
                        type="button"
                        onClick={() => handleApply(message.text)}
                        className="rounded-full px-2.5 py-1 text-[10px] font-medium transition-all hover:opacity-90 active:scale-95"
                        style={{
                          background: "hsl(174 72% 56%)",
                          color: "hsl(220 26% 8%)",
                        }}
                      >
                        Apply to field
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleCopy(message.text, index)}
                      className="rounded-full px-2.5 py-1 text-[10px] font-medium transition-all hover:opacity-80"
                      style={{
                        background: "hsl(220 20% 22%)",
                        color: "#94a3b8",
                      }}
                    >
                      {copiedIndex === index ? (
                        <span className="flex items-center gap-1">
                          <CheckCheck className="h-2.5 w-2.5" />
                          Copied
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Copy className="h-2.5 w-2.5" />
                          Copy
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2">
              <div
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: "hsl(174 72% 56% / 0.20)" }}
              >
                <Sparkles className="h-3 w-3" style={{ color: "hsl(174 72% 56%)" }} />
              </div>

              <div
                className="flex items-center gap-1 rounded-2xl px-3 py-2.5"
                style={{ background: "hsl(220 20% 18%)", borderRadius: "4px 18px 18px 18px" }}
              >
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="h-1.5 w-1.5 animate-bounce rounded-full"
                    style={{
                      background: "hsl(174 72% 56%)",
                      animationDelay: `${dot * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div
          className="flex flex-shrink-0 flex-wrap gap-1.5 border-t px-3 pb-1 pt-2"
          style={{ borderColor: "hsl(220 20% 18%)" }}
        >
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void send(prompt)}
              disabled={loading}
              className="rounded-full px-2.5 py-1 text-[10px] transition-all hover:opacity-90 disabled:opacity-40"
              style={{
                background: "hsl(174 72% 56% / 0.10)",
                border: "1px solid hsl(174 72% 56% / 0.25)",
                color: "hsl(174 72% 65%)",
              }}
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex flex-shrink-0 gap-2 px-3 pb-3 pt-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void send(input);
              }
            }}
            placeholder="Ask anything about this field..."
            disabled={loading}
            className="flex-1 rounded-xl px-3 py-2 text-xs outline-none disabled:opacity-50"
            style={{
              background: "hsl(220 20% 18%)",
              border: "1px solid hsl(220 20% 26%)",
              color: "#e2e8f0",
            }}
          />

          <button
            type="button"
            onClick={() => void send(input)}
            disabled={loading || !input.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-all hover:opacity-90 disabled:opacity-30 active:scale-95"
            style={{ background: "hsl(174 72% 56%)" }}
          >
            <Send className="h-3.5 w-3.5" style={{ color: "hsl(220 26% 8%)" }} />
          </button>
        </div>
      </div>
    </>
  );
};

const AIAssistPanel = ({
  fieldLabel = DEFAULT_FIELD_LABEL,
  tooltip = "Get AI help for this field",
  variant = "default",
  onApply,
}: AIAssistBadgeProps) => {
  const [open, setOpen] = useState(false);

  const trigger = (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`Open AI assist for ${fieldLabel}`}
      onClick={() => setOpen(true)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border transition-all hover:-translate-y-0.5 hover:shadow-sm",
        "border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
        variant === "inline" ? "shrink-0 px-1.5 py-1 text-[10px] sm:px-2" : "px-2.5 py-1 text-[11px] font-medium",
      )}
    >
      <Sparkles className={cn("shrink-0", variant === "inline" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      <span>{variant === "inline" ? "AI" : "AI Assist"}</span>
    </button>
  );

  return (
    <>
      {tooltip ? (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent side="top">{tooltip}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        trigger
      )}

      {open && <AssistPanel fieldLabel={fieldLabel} onClose={() => setOpen(false)} onApply={onApply} />}
    </>
  );
};

export default AIAssistPanel;
