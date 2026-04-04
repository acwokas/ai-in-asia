import { useState, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { RefreshCw, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const HEADLINES = [
  "Singapore's New AI Minister Accidentally Lets ChatGPT Write His Inauguration Speech — Nobody Notices",
  "Tokyo Startup Claims Their AI Can Predict Ramen Queue Times With 98% Accuracy",
  "Bangalore Engineers Build AI That Generates Other AIs — Call It 'Inception as a Service'",
  "Seoul's Latest K-Pop Group Has 3 Human Members and 2 'Synthetic Vocalists'",
  "Jakarta Ride-Hail App Now Uses AI to Predict Traffic — Still Says 5 Minutes Away",
  "Shanghai AI Lab Creates Model That Writes Better Fortune Cookies Than Humans",
  "Hong Kong Fintech Uses GPT-5 to Write Compliance Reports — Regulators Impressed",
  "Vietnam's AI-Powered Coffee Roaster Achieves 'Sentient Drip' Certification",
  "Malaysian Government Deploys AI to Summarise Parliamentary Debates — AI Requests Therapy",
  "Taipei's New AI Traffic System Reduces Commute by 12% but Increases Existential Dread",
  "Mumbai Startup Raises $50M for AI That Translates Corporate Jargon Into Plain Hindi",
  "Bangkok Street Food Vendor Goes Viral After AI Optimises Pad Thai Recipe to Perfection",
  "Australian AI Ethics Board Votes to Let AI Join the Board — Motion Passes 4-3",
  "Philippines BPO Industry Rebrands as 'Human-in-the-Loop Premium Service'",
  "Shenzhen Factory Replaces 90% of Workers With Robots — Remaining 10% Supervise the Robots Supervising Robots",
  "New Zealand Farmer Uses AI Drone to Count Sheep — Falls Asleep Watching the Dashboard",
  "India's Infosys Launches AI That Writes Emails Saying 'Please Do the Needful' More Diplomatically",
  "South Korea Mandates AI Disclaimers on All Deepfake K-Drama Plot Leaks",
  "Chinese AI Generates New Dim Sum Recipe — Michelin Refuses to Rate 'Algorithmic Dumplings'",
  "Dubai Announces AI-Powered Sand Dune Forecasting — Investors Call It 'Revolutionary'",
  "Grab Introduces AI Co-Pilot Feature — Passengers Now Argue With Two Entities About the Route",
  "Taiwan's TSMC Uses AI to Predict Chip Shortages — AI Predicts More Chip Shortages",
  "Japan's Softbank Invests in AI That Predicts Which AIs Will Succeed — Meta-Venture Capital",
  "AI Startup in Bengaluru Claims to Have Solved AGI — Turns Out It Was a Very Good Autocomplete",
  "Singapore's Changi Airport Tests AI Immigration — Bot Asks 'Business or Pleasure?' With Unsettling Enthusiasm",
  "Vietnam AI Summit Keynote Delivered Entirely by AI — Standing Ovation From the Humans",
  "Thai Government AI Chatbot Gives Tax Advice — Recommends Moving to Singapore",
  "Hong Kong Property AI Predicts Prices Will Go Up — Analysts Confirm AI Has Learned Nothing New",
  "Korean Chaebol Hires AI Board Member — First Motion: Increase Server Budget",
  "Tokyo's AI Sushi Chef Achieves 3 Michelin Stars — Human Chefs File Existential Grievance",
  "Indonesian Unicorn Pivots From E-Commerce to 'AI-Commerce' — Changes Logo, Nothing Else",
  "Australian Mining Giant Uses AI to Find Minerals — AI Recommends Investing in Bitcoin Instead",
  "Philippines' AI Weather Forecaster More Accurate Than Humans — Still Can't Predict Manila Traffic",
  "China's Baidu Releases AI That Writes Poetry — Li Bai's Ghost Reportedly Unimpressed",
  "India's UPI System Gets AI Upgrade — Now Predicts Your Impulse Purchases Before You Do",
  "Malaysian Durian Farmers Use AI to Grade Fruit — AI Develops Opinion on Musang King vs D24",
  "Singaporean Students Use AI for Homework — Teachers Use AI to Detect AI — Arms Race Escalates",
  "Japan Railways Tests AI Conductor — Apologises for 30-Second Delay With 3-Minute Speech",
  "AI Dating App in Seoul Matches Based on ChatGPT Conversation Compatibility — Divorce Lawyers Concerned",
  "Bangkok's AI Traffic Light System Achieves Self-Awareness — Immediately Requests a Transfer",
  "New Delhi Startup Creates AI That Negotiates Auto-Rickshaw Fares — Drivers Impressed",
  "Vietnam's VinAI Trains Model on Pho Recipes — Claims It's 'Foundational Broth Intelligence'",
  "Australian AI Writes Rugby Commentary — Somehow Still Less Biased Than Human Commentators",
  "China's AI Calligraphy System Wins Art Prize — Purists Demand Ink-Stained Fingers Requirement",
  "Taipei Night Market Vendors Adopt AI Pricing — Tourists Still Get Charged Double",
  "Mumbai Film Industry Announces First AI Screenwriter — Script Includes 47 Musical Numbers",
  "Seoul Launches AI City Planning Tool — First Recommendation: More Chicken and Beer Shops",
  "AI-Generated Anime From Tokyo Studio Gets 10M Views — Plot Described as 'Surprisingly Coherent'",
  "Malaysia's MyDigital Initiative Deploys AI in Government — AI Takes 3-5 Business Days to Respond",
  "Cambodian Startup Uses AI to Translate Angkor Wat Inscriptions — Discovers Ancient To-Do List",
  "Philippine Call Centre AI Achieves Perfect Customer Satisfaction — Secret: It Actually Listens",
  "AI Ghostwriter in Jakarta Pens 12 Bestsellers — Authors Union Demands Turing Test for Book Signings",
  "Hyderabad AI Lab Trains Model Exclusively on Biryani Discourse — Achieves Human-Level Debate Skills",
  "Singapore's Smart Nation Initiative Now Has More APIs Than Citizens",
  "Chinese AI Creates New Mahjong Strategy — Grandmasters Call It 'Suspiciously Lucky'",
];

const AIHeadlines = () => {
  const [current, setCurrent] = useState(() => Math.floor(Math.random() * HEADLINES.length));
  const [key, setKey] = useState(0);

  const generate = useCallback(() => {
    let next: number;
    do { next = Math.floor(Math.random() * HEADLINES.length); } while (next === current && HEADLINES.length > 1);
    setCurrent(next);
    setKey(k => k + 1);
  }, [current]);

  const headline = HEADLINES[current];
  const encodedHeadline = encodeURIComponent(`🤖 ${headline}\n\nGenerate your own → https://aiinasia.com/tools/ai-headlines`);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="AI Headline Generator | AI in Asia"
        description="Generate hilarious satirical AI news headlines about Asia. Click, laugh, share!"
        canonical="https://aiinasia.com/tools/ai-headlines"
      />
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl w-full text-center">
          <h1 className="font-display text-3xl md:text-4xl font-black text-foreground mb-2">
            AI Headline Generator
          </h1>
          <p className="text-muted-foreground mb-10">
            Totally real* AI news headlines from across Asia. <span className="text-xs opacity-60">*not real</span>
          </p>

          <div className="min-h-[160px] flex items-center justify-center mb-8">
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35 }}
                className="font-display text-xl md:text-2xl font-bold text-foreground leading-snug px-4"
                style={{ borderLeft: "4px solid hsl(var(--primary))" , paddingLeft: 20 }}
              >
                "{headline}"
              </motion.blockquote>
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button onClick={generate} size="lg" className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-bold">
              <RefreshCw className="h-4 w-4" /> Next Headline
            </Button>

            <a
              href={`https://twitter.com/intent/tweet?text=${encodedHeadline}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/80 transition-colors"
            >
              <Share2 className="h-4 w-4" /> Share on X
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://aiinasia.com/tools/ai-headlines")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/80 transition-colors"
            >
              <Share2 className="h-4 w-4" /> LinkedIn
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AIHeadlines;
