export interface EcoCompany {
  name: string;
  country: string;
  countrySlug: string;
  city: string;
  lat: number;
  lng: number;
  sector: string;
  layer: "startups" | "research" | "bigtech" | "investors";
  founded: number;
  fundingStage: string;
  fundingAmount: string;
  description: string;
  website: string;
  articleLink?: string;
}

export interface CountryMeta {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  sectors: string[];
  summary: string;
}

export const LAYER_COLORS: Record<string, string> = {
  startups: "#10b981",
  research: "#6366f1",
  bigtech: "#f59e0b",
  investors: "#ec4899",
};

export const LAYER_LABELS: Record<string, string> = {
  startups: "Startups",
  research: "Research Labs",
  bigtech: "Big Tech",
  investors: "Investors",
};

export const SECTORS = [
  "NLP", "Computer Vision", "Robotics", "Healthcare AI", "FinTech AI",
  "EdTech AI", "Autonomous Vehicles", "AI Chips", "Generative AI",
  "Enterprise AI", "AI Infrastructure", "Cybersecurity AI", "AgriTech AI",
  "LegalTech AI", "E-commerce AI", "Climate AI", "Gaming AI",
];

export const FUNDING_STAGES = [
  "Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Series D+",
  "Public", "Government-Funded", "Corporate R&D", "N/A",
];

export const COUNTRIES: CountryMeta[] = [
  { slug: "japan", name: "Japan", lat: 36.2, lng: 138.2, zoom: 5, sectors: ["Robotics", "NLP", "Generative AI", "Autonomous Vehicles"], summary: "World leader in robotics and industrial AI, with a surging generative AI scene." },
  { slug: "south-korea", name: "South Korea", lat: 35.9, lng: 127.7, zoom: 6, sectors: ["NLP", "Healthcare AI", "EdTech AI", "AI Chips"], summary: "Home to Naver and Kakao AI labs, plus a vibrant healthtech and edtech AI ecosystem." },
  { slug: "china", name: "China", lat: 35.8, lng: 104.1, zoom: 4, sectors: ["NLP", "Computer Vision", "Autonomous Vehicles", "AI Chips", "Generative AI"], summary: "Global AI superpower with deep strengths in vision, language models, and autonomous driving." },
  { slug: "india", name: "India", lat: 20.6, lng: 78.9, zoom: 4.5, sectors: ["NLP", "FinTech AI", "Enterprise AI", "Healthcare AI"], summary: "Fast-growing AI ecosystem with government-backed language tech and massive enterprise adoption." },
  { slug: "singapore", name: "Singapore", lat: 1.35, lng: 103.82, zoom: 10, sectors: ["FinTech AI", "Enterprise AI", "Cybersecurity AI", "AI Infrastructure"], summary: "Asia's AI hub for venture capital, fintech, and regional HQs of global AI companies." },
  { slug: "indonesia", name: "Indonesia", lat: -0.79, lng: 113.9, zoom: 4.5, sectors: ["E-commerce AI", "FinTech AI", "AgriTech AI"], summary: "Southeast Asia's largest economy building AI for e-commerce and financial inclusion." },
  { slug: "vietnam", name: "Vietnam", lat: 14.06, lng: 108.2, zoom: 5.5, sectors: ["Computer Vision", "NLP", "Enterprise AI"], summary: "Emerging AI player with strong engineering talent and government AI strategy." },
  { slug: "thailand", name: "Thailand", lat: 15.87, lng: 100.99, zoom: 5.5, sectors: ["Healthcare AI", "AgriTech AI", "E-commerce AI"], summary: "Growing AI adoption in healthcare, agriculture, and smart city initiatives." },
  { slug: "malaysia", name: "Malaysia", lat: 4.21, lng: 101.98, zoom: 5.5, sectors: ["Enterprise AI", "FinTech AI", "E-commerce AI"], summary: "AI-driven fintech growth and government digital economy push." },
  { slug: "philippines", name: "Philippines", lat: 12.88, lng: 121.77, zoom: 5.5, sectors: ["FinTech AI", "E-commerce AI", "Enterprise AI"], summary: "BPO industry evolving with AI, plus rising fintech and digital services." },
  { slug: "taiwan", name: "Taiwan", lat: 23.7, lng: 120.96, zoom: 6.5, sectors: ["AI Chips", "Computer Vision", "Enterprise AI"], summary: "Global semiconductor leader powering the world's AI infrastructure." },
  { slug: "australia", name: "Australia", lat: -25.27, lng: 133.78, zoom: 3.5, sectors: ["Enterprise AI", "Climate AI", "Healthcare AI", "Cybersecurity AI"], summary: "Mature AI ecosystem with strong research universities and growing startup scene." },
  { slug: "hong-kong", name: "Hong Kong", lat: 22.32, lng: 114.17, zoom: 10, sectors: ["FinTech AI", "Enterprise AI", "AI Infrastructure"], summary: "Financial hub leveraging AI for fintech innovation and cross-border commerce." },
  { slug: "new-zealand", name: "New Zealand", lat: -40.9, lng: 174.89, zoom: 5, sectors: ["AgriTech AI", "Climate AI", "Enterprise AI"], summary: "Niche AI strengths in agriculture, sustainability, and creative industries." },
  { slug: "bangladesh", name: "Bangladesh", lat: 23.68, lng: 90.36, zoom: 6.5, sectors: ["NLP", "FinTech AI", "Enterprise AI"], summary: "Emerging AI talent pool with focus on Bangla NLP and financial inclusion." },
  { slug: "pakistan", name: "Pakistan", lat: 30.38, lng: 69.35, zoom: 5, sectors: ["NLP", "Enterprise AI", "EdTech AI"], summary: "Growing AI community with focus on Urdu NLP and remote AI services." },
];

export const COMPANIES: EcoCompany[] = [
  // --- JAPAN ---
  { name: "Preferred Networks", country: "Japan", countrySlug: "japan", city: "Tokyo", lat: 35.68, lng: 139.77, sector: "AI Infrastructure", layer: "startups", founded: 2014, fundingStage: "Series D+", fundingAmount: "$230M+", description: "Deep learning infrastructure and industrial AI applications.", website: "https://www.preferred.jp/en/" },
  { name: "Sakana AI", country: "Japan", countrySlug: "japan", city: "Tokyo", lat: 35.67, lng: 139.75, sector: "Generative AI", layer: "startups", founded: 2023, fundingStage: "Series A", fundingAmount: "$300M", description: "Founded by ex-Google researchers, building nature-inspired AI models.", website: "https://sakana.ai" },
  { name: "ABEJA", country: "Japan", countrySlug: "japan", city: "Tokyo", lat: 35.66, lng: 139.73, sector: "Enterprise AI", layer: "startups", founded: 2012, fundingStage: "Public", fundingAmount: "IPO", description: "Enterprise AI platform for manufacturing and retail optimization.", website: "https://abejainc.com/en/" },
  { name: "Recursion", country: "Japan", countrySlug: "japan", city: "Tokyo", lat: 35.69, lng: 139.70, sector: "Generative AI", layer: "startups", founded: 2023, fundingStage: "Series A", fundingAmount: "$18M", description: "Japanese LLM development for enterprise and government use.", website: "https://recursion.com" },
  { name: "RIKEN AIP", country: "Japan", countrySlug: "japan", city: "Tokyo", lat: 35.71, lng: 139.76, sector: "AI Infrastructure", layer: "research", founded: 2016, fundingStage: "Government-Funded", fundingAmount: "N/A", description: "Japan's flagship AI research center, part of RIKEN national labs.", website: "https://aip.riken.jp/en/" },
  { name: "SoftBank Group", country: "Japan", countrySlug: "japan", city: "Tokyo", lat: 35.66, lng: 139.74, sector: "AI Infrastructure", layer: "investors", founded: 1981, fundingStage: "Public", fundingAmount: "N/A", description: "Global technology investor with massive AI portfolio through Vision Fund.", website: "https://group.softbank.jp/en" },
  { name: "Sony AI", country: "Japan", countrySlug: "japan", city: "Tokyo", lat: 35.63, lng: 139.74, sector: "Generative AI", layer: "bigtech", founded: 2020, fundingStage: "Corporate R&D", fundingAmount: "N/A", description: "Sony's AI research division focused on gaming, imaging, and gastronomy.", website: "https://ai.sony" },
  { name: "Fixstars", country: "Japan", countrySlug: "japan", city: "Tokyo", lat: 35.65, lng: 139.71, sector: "AI Infrastructure", layer: "startups", founded: 2002, fundingStage: "Public", fundingAmount: "IPO", description: "High-performance computing and AI acceleration solutions.", website: "https://www.fixstars.com/en" },
  { name: "LeapMind", country: "Japan", countrySlug: "japan", city: "Tokyo", lat: 35.67, lng: 139.72, sector: "AI Chips", layer: "startups", founded: 2012, fundingStage: "Series C", fundingAmount: "$30M+", description: "Edge AI chip design for ultra-low power deep learning inference.", website: "https://leapmind.io/en/" },

  // --- SOUTH KOREA ---
  { name: "Naver", country: "South Korea", countrySlug: "south-korea", city: "Seongnam", lat: 37.36, lng: 127.11, sector: "NLP", layer: "bigtech", founded: 1999, fundingStage: "Public", fundingAmount: "N/A", description: "Korea's largest internet company, creator of HyperCLOVA LLMs.", website: "https://www.navercorp.com/en" },
  { name: "Kakao", country: "South Korea", countrySlug: "south-korea", city: "Jeju", lat: 33.45, lng: 126.57, sector: "NLP", layer: "bigtech", founded: 2010, fundingStage: "Public", fundingAmount: "N/A", description: "Major Korean tech conglomerate with AI-powered messaging and services.", website: "https://www.kakaocorp.com/page/en" },
  { name: "Upstage", country: "South Korea", countrySlug: "south-korea", city: "Seoul", lat: 37.53, lng: 127.0, sector: "NLP", layer: "startups", founded: 2020, fundingStage: "Series B", fundingAmount: "$72M", description: "Document AI and Solar LLM, founded by ex-Naver AI researchers.", website: "https://www.upstage.ai" },
  { name: "Riiid", country: "South Korea", countrySlug: "south-korea", city: "Seoul", lat: 37.52, lng: 126.98, sector: "EdTech AI", layer: "startups", founded: 2014, fundingStage: "Series C", fundingAmount: "$200M+", description: "AI-powered adaptive learning platform, strong in test prep.", website: "https://riiid.com" },
  { name: "Lunit", country: "South Korea", countrySlug: "south-korea", city: "Seoul", lat: 37.51, lng: 127.01, sector: "Healthcare AI", layer: "startups", founded: 2013, fundingStage: "Public", fundingAmount: "IPO", description: "AI-powered medical imaging analysis for cancer detection.", website: "https://www.lunit.io/en" },
  { name: "FuriosaAI", country: "South Korea", countrySlug: "south-korea", city: "Seoul", lat: 37.50, lng: 126.99, sector: "AI Chips", layer: "startups", founded: 2017, fundingStage: "Series B", fundingAmount: "$222M", description: "AI semiconductor company building data center inference chips.", website: "https://www.furiosa.ai" },
  { name: "KAIST AI", country: "South Korea", countrySlug: "south-korea", city: "Daejeon", lat: 36.37, lng: 127.36, sector: "AI Infrastructure", layer: "research", founded: 1971, fundingStage: "Government-Funded", fundingAmount: "N/A", description: "Korea's top technical university with world-class AI research programs.", website: "https://ai.kaist.ac.kr" },
  { name: "Rebellions", country: "South Korea", countrySlug: "south-korea", city: "Seoul", lat: 37.54, lng: 127.05, sector: "AI Chips", layer: "startups", founded: 2020, fundingStage: "Series B", fundingAmount: "$124M", description: "AI chip maker developing ATOM NPU for data center inference.", website: "https://rebellions.ai" },

  // --- CHINA ---
  { name: "Baidu", country: "China", countrySlug: "china", city: "Beijing", lat: 39.98, lng: 116.31, sector: "NLP", layer: "bigtech", founded: 2000, fundingStage: "Public", fundingAmount: "N/A", description: "China's search giant and creator of ERNIE LLM and Apollo autonomous driving.", website: "https://www.baidu.com" },
  { name: "SenseTime", country: "China", countrySlug: "china", city: "Shanghai", lat: 31.23, lng: 121.47, sector: "Computer Vision", layer: "bigtech", founded: 2014, fundingStage: "Public", fundingAmount: "IPO", description: "Leading AI vision company in facial recognition, smart city, and autonomous driving.", website: "https://www.sensetime.com/en" },
  { name: "Megvii", country: "China", countrySlug: "china", city: "Beijing", lat: 39.96, lng: 116.42, sector: "Computer Vision", layer: "startups", founded: 2011, fundingStage: "Series D+", fundingAmount: "$1.4B+", description: "Creator of Face++, specializing in facial recognition and IoT solutions.", website: "https://www.megvii.com" },
  { name: "DeepSeek", country: "China", countrySlug: "china", city: "Hangzhou", lat: 30.27, lng: 120.15, sector: "Generative AI", layer: "startups", founded: 2023, fundingStage: "Series A", fundingAmount: "$N/A", description: "Open-weight LLM developer backed by quant fund High-Flyer.", website: "https://www.deepseek.com" },
  { name: "Zhipu AI", country: "China", countrySlug: "china", city: "Beijing", lat: 39.99, lng: 116.33, sector: "NLP", layer: "startups", founded: 2019, fundingStage: "Series B", fundingAmount: "$400M+", description: "Creator of GLM family of large language models, Tsinghua University spinoff.", website: "https://www.zhipuai.cn" },
  { name: "Moonshot AI", country: "China", countrySlug: "china", city: "Beijing", lat: 40.0, lng: 116.38, sector: "Generative AI", layer: "startups", founded: 2023, fundingStage: "Series B", fundingAmount: "$1B+", description: "Developer of Kimi chatbot, one of China's most popular AI assistants.", website: "https://www.moonshot.cn" },
  { name: "01.AI", country: "China", countrySlug: "china", city: "Beijing", lat: 39.95, lng: 116.39, sector: "Generative AI", layer: "startups", founded: 2023, fundingStage: "Series A", fundingAmount: "$200M+", description: "Founded by Kai-Fu Lee, building Yi series of open LLMs.", website: "https://www.01.ai" },
  { name: "ByteDance", country: "China", countrySlug: "china", city: "Beijing", lat: 39.97, lng: 116.30, sector: "Generative AI", layer: "bigtech", founded: 2012, fundingStage: "Public", fundingAmount: "N/A", description: "TikTok parent company with massive AI R&D in recommendation and generation.", website: "https://www.bytedance.com" },
  { name: "Alibaba DAMO Academy", country: "China", countrySlug: "china", city: "Hangzhou", lat: 30.29, lng: 120.16, sector: "AI Infrastructure", layer: "research", founded: 2017, fundingStage: "Corporate R&D", fundingAmount: "N/A", description: "Alibaba's global research lab spanning NLP, vision, and quantum computing.", website: "https://damo.alibaba.com" },
  { name: "Tencent AI Lab", country: "China", countrySlug: "china", city: "Shenzhen", lat: 22.54, lng: 114.06, sector: "NLP", layer: "research", founded: 2016, fundingStage: "Corporate R&D", fundingAmount: "N/A", description: "AI research arm of Tencent, focused on NLP, vision, and gaming AI.", website: "https://ai.tencent.com/ailab/en/" },
  { name: "Huawei Cloud AI", country: "China", countrySlug: "china", city: "Shenzhen", lat: 22.55, lng: 114.07, sector: "AI Infrastructure", layer: "bigtech", founded: 1987, fundingStage: "Private", fundingAmount: "N/A", description: "Enterprise AI infrastructure and Ascend AI chip ecosystem.", website: "https://www.huaweicloud.com" },
  { name: "iFlyTek", country: "China", countrySlug: "china", city: "Hefei", lat: 31.82, lng: 117.25, sector: "NLP", layer: "bigtech", founded: 1999, fundingStage: "Public", fundingAmount: "IPO", description: "China's leading speech and language AI company.", website: "https://www.iflytek.com/en/" },
  { name: "Horizon Robotics", country: "China", countrySlug: "china", city: "Beijing", lat: 39.94, lng: 116.41, sector: "Autonomous Vehicles", layer: "startups", founded: 2015, fundingStage: "Public", fundingAmount: "IPO", description: "AI chip and ADAS solutions for autonomous driving.", website: "https://en.horizon.cc" },
  { name: "MiniMax", country: "China", countrySlug: "china", city: "Shanghai", lat: 31.22, lng: 121.45, sector: "Generative AI", layer: "startups", founded: 2021, fundingStage: "Series B", fundingAmount: "$600M+", description: "Multimodal AI company behind Talkie chatbot and Hailuo video generation.", website: "https://www.minimaxi.com" },
  { name: "Sinovation Ventures", country: "China", countrySlug: "china", city: "Beijing", lat: 39.93, lng: 116.36, sector: "AI Infrastructure", layer: "investors", founded: 2009, fundingStage: "N/A", fundingAmount: "$3B AUM", description: "Kai-Fu Lee's VC firm, one of China's most active AI investors.", website: "https://www.sinovationventures.com" },

  // --- INDIA ---
  { name: "Krutrim", country: "India", countrySlug: "india", city: "Bangalore", lat: 12.97, lng: 77.59, sector: "Generative AI", layer: "startups", founded: 2023, fundingStage: "Series A", fundingAmount: "$50M", description: "India's first AI unicorn building multilingual LLMs for Indian languages.", website: "https://olakrutrim.com" },
  { name: "Sarvam AI", country: "India", countrySlug: "india", city: "Bangalore", lat: 12.98, lng: 77.60, sector: "NLP", layer: "startups", founded: 2023, fundingStage: "Series A", fundingAmount: "$41M", description: "Building full-stack AI for Indian languages including voice and translation.", website: "https://www.sarvam.ai" },
  { name: "Fractal Analytics", country: "India", countrySlug: "india", city: "Mumbai", lat: 19.08, lng: 72.88, sector: "Enterprise AI", layer: "startups", founded: 2000, fundingStage: "Series D+", fundingAmount: "$685M", description: "AI analytics provider powering decision intelligence for Fortune 500.", website: "https://fractal.ai" },
  { name: "Ola Electric AI", country: "India", countrySlug: "india", city: "Bangalore", lat: 12.96, lng: 77.57, sector: "Autonomous Vehicles", layer: "startups", founded: 2017, fundingStage: "Public", fundingAmount: "IPO", description: "Electric mobility company using AI for autonomous driving and battery tech.", website: "https://www.olaelectric.com" },
  { name: "Uniphore", country: "India", countrySlug: "india", city: "Chennai", lat: 13.08, lng: 80.27, sector: "NLP", layer: "startups", founded: 2008, fundingStage: "Series E", fundingAmount: "$610M+", description: "Conversational AI platform for enterprise customer experience.", website: "https://www.uniphore.com" },
  { name: "IIT Bombay AI", country: "India", countrySlug: "india", city: "Mumbai", lat: 19.13, lng: 72.92, sector: "AI Infrastructure", layer: "research", founded: 1958, fundingStage: "Government-Funded", fundingAmount: "N/A", description: "Premier Indian research institution with strong NLP and computer vision labs.", website: "https://www.iitb.ac.in" },
  { name: "Accel India", country: "India", countrySlug: "india", city: "Bangalore", lat: 12.99, lng: 77.61, sector: "Enterprise AI", layer: "investors", founded: 2005, fundingStage: "N/A", fundingAmount: "$3B+ AUM", description: "Leading VC firm backing Indian AI startups from seed to growth.", website: "https://www.accel.com" },
  { name: "Mad Street Den (Vue.ai)", country: "India", countrySlug: "india", city: "Chennai", lat: 13.06, lng: 80.25, sector: "E-commerce AI", layer: "startups", founded: 2013, fundingStage: "Series C", fundingAmount: "$47M", description: "AI-powered retail automation including visual search and personalization.", website: "https://vue.ai" },
  { name: "Yellow.ai", country: "India", countrySlug: "india", city: "Bangalore", lat: 12.95, lng: 77.58, sector: "Enterprise AI", layer: "startups", founded: 2016, fundingStage: "Series C", fundingAmount: "$102M", description: "Enterprise conversational AI platform serving 1100+ enterprises globally.", website: "https://yellow.ai" },

  // --- SINGAPORE ---
  { name: "Grab AI", country: "Singapore", countrySlug: "singapore", city: "Singapore", lat: 1.30, lng: 103.84, sector: "Enterprise AI", layer: "bigtech", founded: 2012, fundingStage: "Public", fundingAmount: "IPO", description: "Southeast Asia's super-app using AI for ride-hailing, payments, and delivery.", website: "https://www.grab.com" },
  { name: "Sea Group (Shopee)", country: "Singapore", countrySlug: "singapore", city: "Singapore", lat: 1.29, lng: 103.85, sector: "E-commerce AI", layer: "bigtech", founded: 2009, fundingStage: "Public", fundingAmount: "IPO", description: "E-commerce and gaming giant using AI across Shopee and Garena.", website: "https://www.sea.com" },
  { name: "Advance Intelligence Group", country: "Singapore", countrySlug: "singapore", city: "Singapore", lat: 1.28, lng: 103.83, sector: "FinTech AI", layer: "startups", founded: 2016, fundingStage: "Series D", fundingAmount: "$800M+", description: "AI-first fintech group powering credit, e-commerce, and payments.", website: "https://www.advance.ai" },
  { name: "AI Singapore", country: "Singapore", countrySlug: "singapore", city: "Singapore", lat: 1.31, lng: 103.81, sector: "AI Infrastructure", layer: "research", founded: 2017, fundingStage: "Government-Funded", fundingAmount: "S$500M+", description: "National AI programme catalysing AI R&D and talent development.", website: "https://aisingapore.org" },
  { name: "Wiz.AI", country: "Singapore", countrySlug: "singapore", city: "Singapore", lat: 1.30, lng: 103.82, sector: "NLP", layer: "startups", founded: 2019, fundingStage: "Series A", fundingAmount: "$30M", description: "Voice AI talkbots for enterprise customer engagement in SEA languages.", website: "https://www.wiz.ai" },
  { name: "Hypotenuse AI", country: "Singapore", countrySlug: "singapore", city: "Singapore", lat: 1.32, lng: 103.84, sector: "Generative AI", layer: "startups", founded: 2020, fundingStage: "Series A", fundingAmount: "$9M", description: "AI content generation platform for e-commerce and marketing teams.", website: "https://www.hypotenuse.ai" },
  { name: "Monk's Hill Ventures", country: "Singapore", countrySlug: "singapore", city: "Singapore", lat: 1.28, lng: 103.86, sector: "Enterprise AI", layer: "investors", founded: 2014, fundingStage: "N/A", fundingAmount: "$400M AUM", description: "Southeast Asia-focused VC firm investing in AI-powered startups.", website: "https://www.monkshill.com" },
  { name: "Temasek (AI Investments)", country: "Singapore", countrySlug: "singapore", city: "Singapore", lat: 1.27, lng: 103.85, sector: "AI Infrastructure", layer: "investors", founded: 1974, fundingStage: "N/A", fundingAmount: "$380B+ AUM", description: "Singapore sovereign fund with significant AI and deep tech portfolio.", website: "https://www.temasek.com.sg" },

  // --- INDONESIA ---
  { name: "GoTo Group", country: "Indonesia", countrySlug: "indonesia", city: "Jakarta", lat: -6.21, lng: 106.85, sector: "E-commerce AI", layer: "bigtech", founded: 2021, fundingStage: "Public", fundingAmount: "IPO", description: "Indonesia's largest tech group (Gojek + Tokopedia) using AI across services.", website: "https://www.gotocompany.com" },
  { name: "Bukalapak", country: "Indonesia", countrySlug: "indonesia", city: "Jakarta", lat: -6.22, lng: 106.84, sector: "E-commerce AI", layer: "bigtech", founded: 2010, fundingStage: "Public", fundingAmount: "IPO", description: "Indonesian e-commerce platform leveraging AI for SME commerce.", website: "https://www.bukalapak.com" },
  { name: "Nodeflux", country: "Indonesia", countrySlug: "indonesia", city: "Jakarta", lat: -6.20, lng: 106.83, sector: "Computer Vision", layer: "startups", founded: 2016, fundingStage: "Series A", fundingAmount: "$6M", description: "Indonesian AI vision company for smart city and surveillance solutions.", website: "https://www.nodeflux.io" },
  { name: "Kata.ai", country: "Indonesia", countrySlug: "indonesia", city: "Jakarta", lat: -6.23, lng: 106.82, sector: "NLP", layer: "startups", founded: 2015, fundingStage: "Series B", fundingAmount: "$20M+", description: "Conversational AI platform for Bahasa Indonesia and regional languages.", website: "https://kata.ai" },
  { name: "Prosa.ai", country: "Indonesia", countrySlug: "indonesia", city: "Jakarta", lat: -6.19, lng: 106.86, sector: "NLP", layer: "startups", founded: 2018, fundingStage: "Seed", fundingAmount: "$5M", description: "Indonesian speech recognition and NLP for Bahasa Indonesia.", website: "https://prosa.ai" },

  // --- TAIWAN ---
  { name: "TSMC", country: "Taiwan", countrySlug: "taiwan", city: "Hsinchu", lat: 24.80, lng: 120.97, sector: "AI Chips", layer: "bigtech", founded: 1987, fundingStage: "Public", fundingAmount: "N/A", description: "World's largest semiconductor foundry, manufacturing chips for NVIDIA and Apple.", website: "https://www.tsmc.com" },
  { name: "MediaTek", country: "Taiwan", countrySlug: "taiwan", city: "Hsinchu", lat: 24.79, lng: 120.98, sector: "AI Chips", layer: "bigtech", founded: 1997, fundingStage: "Public", fundingAmount: "N/A", description: "Major chip designer with on-device AI capabilities for mobile and IoT.", website: "https://www.mediatek.com" },
  { name: "Appier", country: "Taiwan", countrySlug: "taiwan", city: "Taipei", lat: 25.03, lng: 121.57, sector: "Enterprise AI", layer: "startups", founded: 2012, fundingStage: "Public", fundingAmount: "IPO (Tokyo)", description: "AI-powered marketing and analytics platform serving brands across Asia.", website: "https://www.appier.com" },
  { name: "Taiwan AI Labs", country: "Taiwan", countrySlug: "taiwan", city: "Taipei", lat: 25.04, lng: 121.54, sector: "AI Infrastructure", layer: "research", founded: 2017, fundingStage: "Government-Funded", fundingAmount: "N/A", description: "Non-profit AI research lab focused on speech, healthcare, and smart city.", website: "https://ailabs.tw" },
  { name: "Realtek AI", country: "Taiwan", countrySlug: "taiwan", city: "Hsinchu", lat: 24.81, lng: 120.96, sector: "AI Chips", layer: "bigtech", founded: 1987, fundingStage: "Public", fundingAmount: "N/A", description: "Semiconductor firm integrating AI into networking and multimedia chips.", website: "https://www.realtek.com" },

  // --- AUSTRALIA ---
  { name: "Canva AI", country: "Australia", countrySlug: "australia", city: "Sydney", lat: -33.87, lng: 151.21, sector: "Generative AI", layer: "bigtech", founded: 2012, fundingStage: "Private", fundingAmount: "$40B valuation", description: "Design platform with AI-powered tools for image generation and editing.", website: "https://www.canva.com" },
  { name: "Atlassian Intelligence", country: "Australia", countrySlug: "australia", city: "Sydney", lat: -33.86, lng: 151.20, sector: "Enterprise AI", layer: "bigtech", founded: 2002, fundingStage: "Public", fundingAmount: "N/A", description: "Enterprise software giant integrating AI across Jira, Confluence, and more.", website: "https://www.atlassian.com" },
  { name: "SafetyCulture", country: "Australia", countrySlug: "australia", city: "Sydney", lat: -33.88, lng: 151.19, sector: "Enterprise AI", layer: "startups", founded: 2004, fundingStage: "Series D", fundingAmount: "$230M+", description: "Workplace operations platform using AI for inspections and safety.", website: "https://safetyculture.com" },
  { name: "CSIRO Data61", country: "Australia", countrySlug: "australia", city: "Sydney", lat: -33.87, lng: 151.22, sector: "AI Infrastructure", layer: "research", founded: 2016, fundingStage: "Government-Funded", fundingAmount: "N/A", description: "Australia's national science agency AI research division.", website: "https://data61.csiro.au" },
  { name: "Harrison.ai", country: "Australia", countrySlug: "australia", city: "Sydney", lat: -33.85, lng: 151.21, sector: "Healthcare AI", layer: "startups", founded: 2018, fundingStage: "Series B", fundingAmount: "$129M", description: "Clinical AI company building diagnostic tools for radiology and pathology.", website: "https://harrison.ai" },
  { name: "Blackbird Ventures", country: "Australia", countrySlug: "australia", city: "Sydney", lat: -33.86, lng: 151.18, sector: "Enterprise AI", layer: "investors", founded: 2012, fundingStage: "N/A", fundingAmount: "$2B+ AUM", description: "Australia's largest VC firm, backing Canva and many AI startups.", website: "https://blackbird.vc" },
  { name: "Appen", country: "Australia", countrySlug: "australia", city: "Sydney", lat: -33.84, lng: 151.22, sector: "AI Infrastructure", layer: "startups", founded: 1996, fundingStage: "Public", fundingAmount: "IPO", description: "Global AI data training company providing labelling and annotation services.", website: "https://appen.com" },

  // --- VIETNAM ---
  { name: "VinAI Research", country: "Vietnam", countrySlug: "vietnam", city: "Hanoi", lat: 21.03, lng: 105.85, sector: "Computer Vision", layer: "research", founded: 2019, fundingStage: "Corporate R&D", fundingAmount: "N/A", description: "Vingroup's AI lab publishing top-tier research in vision and language.", website: "https://www.vinai.io" },
  { name: "FPT AI", country: "Vietnam", countrySlug: "vietnam", city: "Hanoi", lat: 21.01, lng: 105.83, sector: "NLP", layer: "bigtech", founded: 1988, fundingStage: "Public", fundingAmount: "N/A", description: "Vietnam's largest IT firm with AI platform for speech and vision.", website: "https://fpt.ai/en" },
  { name: "Trusting Social", country: "Vietnam", countrySlug: "vietnam", city: "Ho Chi Minh City", lat: 10.78, lng: 106.70, sector: "FinTech AI", layer: "startups", founded: 2013, fundingStage: "Series B", fundingAmount: "$65M+", description: "AI credit scoring for the unbanked using alternative data.", website: "https://trustingsocial.com" },

  // --- THAILAND ---
  { name: "KBTG", country: "Thailand", countrySlug: "thailand", city: "Bangkok", lat: 13.76, lng: 100.50, sector: "FinTech AI", layer: "bigtech", founded: 2018, fundingStage: "Corporate R&D", fundingAmount: "N/A", description: "KBank's tech arm building AI for Thai banking and financial services.", website: "https://www.kbtg.tech" },
  { name: "AI & Robotics Ventures", country: "Thailand", countrySlug: "thailand", city: "Bangkok", lat: 13.74, lng: 100.52, sector: "Robotics", layer: "startups", founded: 2018, fundingStage: "Series A", fundingAmount: "$20M+", description: "PTT-backed venture building drone and robotics AI for inspection.", website: "https://www.arv.co.th" },
  { name: "VISTEC AI", country: "Thailand", countrySlug: "thailand", city: "Rayong", lat: 12.68, lng: 101.14, sector: "AI Infrastructure", layer: "research", founded: 2015, fundingStage: "Government-Funded", fundingAmount: "N/A", description: "Thai research institute with AI and info tech as a core focus.", website: "https://www.vistec.ac.th" },

  // --- MALAYSIA ---
  { name: "AirAsia AI (MOVE Digital)", country: "Malaysia", countrySlug: "malaysia", city: "Kuala Lumpur", lat: 3.14, lng: 101.69, sector: "Enterprise AI", layer: "bigtech", founded: 2001, fundingStage: "Public", fundingAmount: "N/A", description: "AirAsia's super-app using AI for travel, logistics, and fintech.", website: "https://www.airasia.com" },
  { name: "Aerodyne Group", country: "Malaysia", countrySlug: "malaysia", city: "Cyberjaya", lat: 2.92, lng: 101.65, sector: "Computer Vision", layer: "startups", founded: 2014, fundingStage: "Series B", fundingAmount: "$50M+", description: "Drone AI analytics for infrastructure inspection and smart agriculture.", website: "https://aerodyne.group" },
  { name: "MoneyLion", country: "Malaysia", countrySlug: "malaysia", city: "Kuala Lumpur", lat: 3.15, lng: 101.70, sector: "FinTech AI", layer: "startups", founded: 2013, fundingStage: "Public", fundingAmount: "IPO (NYSE)", description: "AI-powered personal finance and banking platform.", website: "https://www.moneylion.com" },

  // --- PHILIPPINES ---
  { name: "Voyager Innovations", country: "Philippines", countrySlug: "philippines", city: "Taguig", lat: 14.52, lng: 121.05, sector: "FinTech AI", layer: "startups", founded: 2013, fundingStage: "Series D", fundingAmount: "$210M+", description: "Operator of PayMaya/Maya, AI-driven fintech for Philippine digital payments.", website: "https://voyager.ph" },
  { name: "Thinking Machines", country: "Philippines", countrySlug: "philippines", city: "Manila", lat: 14.60, lng: 121.00, sector: "Enterprise AI", layer: "startups", founded: 2016, fundingStage: "Series A", fundingAmount: "$10M+", description: "Data science and AI consultancy powering analytics for SEA enterprises.", website: "https://thinkingmachin.es" },
  { name: "Globe Telecom AI", country: "Philippines", countrySlug: "philippines", city: "Taguig", lat: 14.53, lng: 121.06, sector: "Enterprise AI", layer: "bigtech", founded: 1935, fundingStage: "Public", fundingAmount: "N/A", description: "Major Philippine telco investing in AI for network optimization and CX.", website: "https://www.globe.com.ph" },

  // --- HONG KONG ---
  { name: "SenseTime (HQ)", country: "Hong Kong", countrySlug: "hong-kong", city: "Hong Kong", lat: 22.30, lng: 114.18, sector: "Computer Vision", layer: "bigtech", founded: 2014, fundingStage: "Public", fundingAmount: "IPO (HKEX)", description: "Listed in Hong Kong, one of the world's largest AI vision companies.", website: "https://www.sensetime.com/en" },
  { name: "Lalamove", country: "Hong Kong", countrySlug: "hong-kong", city: "Hong Kong", lat: 22.31, lng: 114.16, sector: "Enterprise AI", layer: "startups", founded: 2013, fundingStage: "Series E", fundingAmount: "$1.5B+", description: "AI-powered last-mile delivery platform operating across Asia.", website: "https://www.lalamove.com" },
  { name: "HKUST AI Lab", country: "Hong Kong", countrySlug: "hong-kong", city: "Hong Kong", lat: 22.34, lng: 114.26, sector: "AI Infrastructure", layer: "research", founded: 1991, fundingStage: "Government-Funded", fundingAmount: "N/A", description: "World-renowned AI research lab, home of influential NLP and vision work.", website: "https://ai.hkust.edu.hk" },

  // --- NEW ZEALAND ---
  { name: "Soul Machines", country: "New Zealand", countrySlug: "new-zealand", city: "Auckland", lat: -36.85, lng: 174.76, sector: "Generative AI", layer: "startups", founded: 2016, fundingStage: "Series B", fundingAmount: "$135M+", description: "Digital humans and autonomous animation powered by AI.", website: "https://www.soulmachines.com" },
  { name: "Halter", country: "New Zealand", countrySlug: "new-zealand", city: "Auckland", lat: -36.84, lng: 174.77, sector: "AgriTech AI", layer: "startups", founded: 2016, fundingStage: "Series C", fundingAmount: "$100M+", description: "AI-powered solar GPS collars for precision livestock management.", website: "https://www.hfrm.io" },

  // --- BANGLADESH ---
  { name: "Grameenphone AI", country: "Bangladesh", countrySlug: "bangladesh", city: "Dhaka", lat: 23.78, lng: 90.40, sector: "Enterprise AI", layer: "bigtech", founded: 1997, fundingStage: "Public", fundingAmount: "N/A", description: "Bangladesh's largest telco using AI for network and customer services.", website: "https://www.grameenphone.com" },
  { name: "Bangla NLP (BUET)", country: "Bangladesh", countrySlug: "bangladesh", city: "Dhaka", lat: 23.73, lng: 90.39, sector: "NLP", layer: "research", founded: 2010, fundingStage: "Government-Funded", fundingAmount: "N/A", description: "BUET research group advancing Bangla language processing and AI.", website: "https://cse.buet.ac.bd" },

  // --- PAKISTAN ---
  { name: "Afiniti", country: "Pakistan", countrySlug: "pakistan", city: "Islamabad", lat: 33.69, lng: 73.04, sector: "Enterprise AI", layer: "startups", founded: 2006, fundingStage: "Series D+", fundingAmount: "$300M+", description: "AI-driven customer interaction optimization for contact centres.", website: "https://www.afiniti.com" },
  { name: "Arbisoft AI", country: "Pakistan", countrySlug: "pakistan", city: "Lahore", lat: 31.52, lng: 74.35, sector: "Enterprise AI", layer: "startups", founded: 2007, fundingStage: "Private", fundingAmount: "N/A", description: "AI engineering services and custom ML solutions for global clients.", website: "https://arbisoft.com" },

  // --- ADDITIONAL NOTABLE ---
  { name: "Stability AI (APAC)", country: "Singapore", countrySlug: "singapore", city: "Singapore", lat: 1.29, lng: 103.80, sector: "Generative AI", layer: "startups", founded: 2019, fundingStage: "Series B", fundingAmount: "$101M", description: "Open-source generative AI company with significant Asia-Pacific operations.", website: "https://stability.ai" },
  { name: "Cinnamon AI", country: "Vietnam", countrySlug: "vietnam", city: "Ho Chi Minh City", lat: 10.80, lng: 106.66, sector: "Enterprise AI", layer: "startups", founded: 2012, fundingStage: "Series B", fundingAmount: "$20M+", description: "Japanese-Vietnamese AI company automating document processing.", website: "https://cinnamon.is" },
  { name: "Eureka AI", country: "South Korea", countrySlug: "south-korea", city: "Seoul", lat: 37.55, lng: 126.97, sector: "FinTech AI", layer: "startups", founded: 2017, fundingStage: "Series B", fundingAmount: "$45M", description: "AI-powered trading and financial analytics platform.", website: "https://eureka.ai" },
  { name: "Twelve Labs", country: "South Korea", countrySlug: "south-korea", city: "Seoul", lat: 37.56, lng: 126.96, sector: "Computer Vision", layer: "startups", founded: 2021, fundingStage: "Series A", fundingAmount: "$37M", description: "Multimodal video understanding AI with Korean-American founders.", website: "https://twelvelabs.io" },
  { name: "NUS AI Lab", country: "Singapore", countrySlug: "singapore", city: "Singapore", lat: 1.30, lng: 103.77, sector: "AI Infrastructure", layer: "research", founded: 1905, fundingStage: "Government-Funded", fundingAmount: "N/A", description: "National University of Singapore's AI research institute.", website: "https://www.comp.nus.edu.sg" },
  { name: "Tsinghua AIR", country: "China", countrySlug: "china", city: "Beijing", lat: 40.00, lng: 116.33, sector: "AI Infrastructure", layer: "research", founded: 2020, fundingStage: "Government-Funded", fundingAmount: "N/A", description: "Tsinghua University Institute for AI Industry Research.", website: "https://air.tsinghua.edu.cn/en/" },
  { name: "East Ventures", country: "Indonesia", countrySlug: "indonesia", city: "Jakarta", lat: -6.18, lng: 106.83, sector: "Enterprise AI", layer: "investors", founded: 2010, fundingStage: "N/A", fundingAmount: "$500M+ AUM", description: "Leading Southeast Asian VC with growing AI startup portfolio.", website: "https://east.vc" },
  { name: "Sequoia Capital India/SEA", country: "India", countrySlug: "india", city: "Bangalore", lat: 13.01, lng: 77.59, sector: "Enterprise AI", layer: "investors", founded: 2006, fundingStage: "N/A", fundingAmount: "$9B+ AUM", description: "Major VC investor in AI startups across India and Southeast Asia.", website: "https://www.peakxv.com" },
  { name: "GIC (AI Portfolio)", country: "Singapore", countrySlug: "singapore", city: "Singapore", lat: 1.28, lng: 103.84, sector: "AI Infrastructure", layer: "investors", founded: 1981, fundingStage: "N/A", fundingAmount: "$770B+ AUM", description: "Singapore sovereign wealth fund with extensive global AI investments.", website: "https://www.gic.com.sg" },
  { name: "Zilingo AI", country: "Singapore", countrySlug: "singapore", city: "Singapore", lat: 1.31, lng: 103.83, sector: "E-commerce AI", layer: "startups", founded: 2015, fundingStage: "Series D", fundingAmount: "$226M", description: "AI-powered fashion supply chain and B2B commerce platform.", website: "https://zilingo.com" },
];

// Helpers
export function getCompaniesForCountry(slug: string) {
  return COMPANIES.filter(c => c.countrySlug === slug);
}

export function getCountryBySlug(slug: string) {
  return COUNTRIES.find(c => c.slug === slug);
}

export function getCountryStats(slug: string) {
  const companies = getCompaniesForCountry(slug);
  const totalFunding = companies.filter(c => c.fundingAmount && c.fundingAmount !== "N/A").length;
  return {
    total: companies.length,
    startups: companies.filter(c => c.layer === "startups").length,
    research: companies.filter(c => c.layer === "research").length,
    bigtech: companies.filter(c => c.layer === "bigtech").length,
    investors: companies.filter(c => c.layer === "investors").length,
    withFunding: totalFunding,
    sectors: [...new Set(companies.map(c => c.sector))],
  };
}
