export interface JargonEntry {
  term: string;
  plain: string;
  brutal: string;
  eli5: string;
  sassLevel: 1 | 2 | 3;
  category: "technical" | "corporate" | "startup" | "policy";
  asiaContext?: string;
}

export const JARGON_DICTIONARY: JargonEntry[] = [
  // === TECHNICAL BUZZWORDS ===
  { term: "LLM", plain: "A large language model — software trained on massive text data to generate human-like text.", brutal: "A very expensive autocomplete that sometimes hallucinates.", eli5: "A robot that read the whole internet and now tries to talk like a person.", sassLevel: 1, category: "technical" },
  { term: "foundation model", plain: "A large AI model trained on broad data, then adapted for specific tasks.", brutal: "A one-size-fits-all AI that companies charge you extra to customize.", eli5: "A big brain that learns everything first, then gets taught to do one special job.", sassLevel: 2, category: "technical" },
  { term: "multimodal", plain: "AI that can process multiple types of input like text, images, and audio.", brutal: "It can look at pictures AND read. Revolutionary.", eli5: "An AI that can see, hear, and read — like you!", sassLevel: 2, category: "technical" },
  { term: "agentic", plain: "AI that can independently take actions and make decisions to complete tasks.", brutal: "AI that does stuff on its own, which is either exciting or terrifying depending on what it decides to do.", eli5: "A helper robot that doesn't wait to be told every little thing.", sassLevel: 2, category: "technical" },
  { term: "RAG", plain: "Retrieval-Augmented Generation — AI that looks up real information before answering.", brutal: "Teaching AI to Google things before making stuff up.", eli5: "Instead of guessing, the robot checks its notebook first.", sassLevel: 1, category: "technical" },
  { term: "fine-tuning", plain: "Training a pre-built AI model further on specific data to improve its performance on particular tasks.", brutal: "Paying a lot of money to make the AI slightly less wrong about your industry.", eli5: "Teaching a smart dog a new trick.", sassLevel: 1, category: "technical" },
  { term: "inference", plain: "When an AI model processes input and produces output — the actual 'thinking' step.", brutal: "The part where AI burns electricity to give you an answer.", eli5: "When the robot actually does its thinking.", sassLevel: 1, category: "technical" },
  { term: "tokens", plain: "Small chunks of text (words or word fragments) that AI models process.", brutal: "The way AI companies measure how much to charge you.", eli5: "Words chopped into tiny pieces so the robot can read them.", sassLevel: 1, category: "technical" },
  { term: "parameters", plain: "The internal settings an AI model learns during training — more parameters generally means more capable.", brutal: "Big numbers companies brag about. '70 billion parameters!' Cool, it still can't count.", eli5: "All the little knobs inside the robot's brain.", sassLevel: 2, category: "technical" },
  { term: "transformer", plain: "The neural network architecture behind most modern AI language models.", brutal: "Not the movie robots. The math that makes ChatGPT work.", eli5: "A special recipe for building smart robots that understand words.", sassLevel: 1, category: "technical" },
  { term: "diffusion model", plain: "AI that generates images by gradually removing noise from a random starting point.", brutal: "Fancy noise-cancellation, but for pictures.", eli5: "Starting with TV static and slowly turning it into a picture.", sassLevel: 1, category: "technical" },
  { term: "neural network", plain: "Software loosely inspired by how brain cells connect, used to find patterns in data.", brutal: "Math pretending to be a brain. It's neither neural nor a network.", eli5: "A computer that copies how your brain connects ideas.", sassLevel: 1, category: "technical" },
  { term: "deep learning", plain: "Machine learning using neural networks with many layers to learn complex patterns.", brutal: "Regular learning, but with more layers and a bigger cloud bill.", eli5: "Teaching a computer by giving it lots and lots of examples.", sassLevel: 1, category: "technical" },
  { term: "machine learning", plain: "Software that improves at tasks by learning from data rather than being explicitly programmed.", brutal: "Statistics wearing a trench coat and calling itself AI.", eli5: "A computer that gets better at something by practising, like you learning to ride a bike.", sassLevel: 2, category: "technical" },
  { term: "NLP", plain: "Natural Language Processing — teaching computers to understand and generate human language.", brutal: "Making computers read. They're still not great at it.", eli5: "Teaching robots to understand what people say and write.", sassLevel: 1, category: "technical" },
  { term: "computer vision", plain: "AI that can analyze and understand images and videos.", brutal: "Teaching a computer to see. It still can't find Wally.", eli5: "Giving the robot eyes so it can look at pictures.", sassLevel: 1, category: "technical" },
  { term: "reinforcement learning", plain: "Training AI by rewarding good outcomes and penalizing bad ones.", brutal: "Treats for the AI when it's a good boy.", eli5: "The robot gets a gold star when it does something right.", sassLevel: 2, category: "technical" },
  { term: "generative AI", plain: "AI that creates new content — text, images, music, code — rather than just analyzing existing data.", brutal: "The thing that made your graphic designer nervous.", eli5: "A robot that can draw, write stories, and make music.", sassLevel: 2, category: "technical" },
  { term: "AGI", plain: "Artificial General Intelligence — hypothetical AI that matches human-level intelligence across all tasks.", brutal: "The thing tech CEOs promise is '2 years away' every single year.", eli5: "A robot as smart as a person at everything. Doesn't exist yet.", sassLevel: 3, category: "technical", asiaContext: "Major research focus for Chinese and Japanese AI labs." },
  { term: "ASI", plain: "Artificial Superintelligence — hypothetical AI surpassing human intelligence. Purely theoretical.", brutal: "Science fiction that VCs use to justify their valuations.", eli5: "A robot smarter than every person on Earth combined. Very much made up so far.", sassLevel: 3, category: "technical" },
  { term: "edge AI", plain: "Running AI directly on devices (phones, cameras, sensors) instead of in the cloud.", brutal: "AI that works without WiFi. Groundbreaking.", eli5: "The robot lives inside your phone instead of far away on a big computer.", sassLevel: 1, category: "technical", asiaContext: "Big push in manufacturing hubs like China, Japan, and South Korea." },
  { term: "federated learning", plain: "Training AI across many devices without centralizing private data.", brutal: "We promise we're not looking at your data. Pinky swear.", eli5: "Lots of robots learn together but nobody shares their homework.", sassLevel: 2, category: "technical" },
  { term: "hallucination", plain: "When AI generates confident-sounding but factually incorrect information.", brutal: "Lying. It's called lying.", eli5: "When the robot makes something up and says it really confidently.", sassLevel: 3, category: "technical" },
  { term: "prompt engineering", plain: "Crafting effective instructions to get better results from AI tools.", brutal: "Asking nicely. The world's newest 'engineering' discipline.", eli5: "Learning the magic words to make the robot do what you want.", sassLevel: 3, category: "technical" },
  { term: "embedding", plain: "Converting text or images into numbers that capture their meaning, so AI can compare them.", brutal: "Turning words into math so computers feel less confused.", eli5: "Giving every word a secret number code.", sassLevel: 1, category: "technical" },
  { term: "vector database", plain: "A database optimized for storing and searching those numerical representations of data.", brutal: "A spreadsheet with extra steps and a Series B.", eli5: "A special filing cabinet for the robot's number codes.", sassLevel: 2, category: "technical" },
  { term: "latent space", plain: "The compressed, abstract representation of data that AI models work with internally.", brutal: "The AI's imagination. It's weirder than yours.", eli5: "The robot's daydream world where it figures things out.", sassLevel: 1, category: "technical" },
  { term: "attention mechanism", plain: "The part of a transformer that decides which words are most relevant to each other.", brutal: "AI's ability to focus, which is better than most meeting attendees.", eli5: "The robot decides which words in a sentence are most important.", sassLevel: 1, category: "technical" },
  { term: "GPT", plain: "Generative Pre-trained Transformer — OpenAI's family of text-generating models.", brutal: "The thing your boss thinks will replace you.", eli5: "A famous robot made by a company called OpenAI.", sassLevel: 2, category: "technical" },
  { term: "RLHF", plain: "Reinforcement Learning from Human Feedback — training AI using human ratings of its outputs.", brutal: "Paying humans to tell AI when it's being weird.", eli5: "People tell the robot 'good answer' or 'bad answer' so it learns.", sassLevel: 1, category: "technical" },
  { term: "synthetic data", plain: "Artificially generated data used to train AI when real data is scarce or private.", brutal: "Fake data for training. What could go wrong?", eli5: "Made-up practice examples for the robot to learn from.", sassLevel: 2, category: "technical" },
  { term: "model collapse", plain: "When AI trained on AI-generated data degrades in quality over generations.", brutal: "AI eating its own cooking until it forgets how to cook.", eli5: "The robot copies from another robot's homework until nobody remembers the right answers.", sassLevel: 2, category: "technical" },
  { term: "quantization", plain: "Compressing an AI model to use less memory and run faster, with some quality trade-off.", brutal: "Making AI dumber so it fits on your phone.", eli5: "Squishing the robot's brain to fit in a smaller box.", sassLevel: 2, category: "technical" },
  { term: "open source model", plain: "An AI model whose code and weights are publicly available for anyone to use and modify.", brutal: "Free AI. There's always a catch, but at least it's free.", eli5: "A robot recipe anyone can use and change.", sassLevel: 1, category: "technical" },
  { term: "API", plain: "Application Programming Interface — a way for software to talk to other software.", brutal: "A digital waiter that takes your order to the kitchen.", eli5: "A special phone line that lets computers talk to each other.", sassLevel: 1, category: "technical" },
  { term: "GPU", plain: "Graphics Processing Unit — powerful chips that AI models run on.", brutal: "The reason NVIDIA is worth more than some countries.", eli5: "A super-fast computer chip that helps the robot think.", sassLevel: 1, category: "technical", asiaContext: "TSMC in Taiwan manufactures most of the world's AI chips." },
  { term: "TPU", plain: "Tensor Processing Unit — Google's custom chip designed specifically for AI workloads.", brutal: "Google's special chip because regular chips weren't expensive enough.", eli5: "Google's own special thinking chip for their robots.", sassLevel: 2, category: "technical" },
  { term: "zero-shot", plain: "AI performing a task it wasn't specifically trained for, with no examples.", brutal: "Winging it, but make it sound scientific.", eli5: "The robot tries something brand new without any practice.", sassLevel: 2, category: "technical" },
  { term: "few-shot", plain: "AI learning from just a handful of examples to perform a new task.", brutal: "Showing AI 3 examples and calling it 'trained'.", eli5: "The robot sees a few examples and figures it out.", sassLevel: 2, category: "technical" },
  { term: "mixture of experts", plain: "An AI architecture that routes queries to specialized sub-models for efficiency.", brutal: "A committee of AIs. Works about as well as human committees.", eli5: "Instead of one big robot, a team of smaller expert robots.", sassLevel: 2, category: "technical" },
  { term: "context window", plain: "The maximum amount of text an AI can consider at once.", brutal: "The AI's attention span, measured in tokens and dollars.", eli5: "How much the robot can remember at one time.", sassLevel: 1, category: "technical" },
  { term: "benchmark", plain: "A standardized test used to compare AI model performance.", brutal: "Tests that AI companies cherry-pick to make their model look best.", eli5: "A school test for robots.", sassLevel: 2, category: "technical" },

  // === CORPORATE FLUFF ===
  { term: "AI-powered", plain: "Uses artificial intelligence as part of its functionality.", brutal: "Has an if-statement and a marketing team.", eli5: "A robot helps with it.", sassLevel: 3, category: "corporate" },
  { term: "AI-driven", plain: "Primarily guided or operated by artificial intelligence.", brutal: "Same as 'AI-powered' but the marketing team got a thesaurus.", eli5: "A robot is in charge.", sassLevel: 3, category: "corporate" },
  { term: "leveraging AI", plain: "Using AI to achieve something.", brutal: "Using. They mean using. Just say using.", eli5: "Using the robot to help.", sassLevel: 3, category: "corporate" },
  { term: "harnessing the power of", plain: "Using effectively.", brutal: "This phrase adds zero information. It just sounds grand.", eli5: "Using something really well.", sassLevel: 3, category: "corporate" },
  { term: "paradigm shift", plain: "A fundamental change in approach or underlying assumptions.", brutal: "Something changed. Probably less than they're implying.", eli5: "Everything is done differently now.", sassLevel: 3, category: "corporate" },
  { term: "synergy", plain: "Combined effort producing a result greater than the sum of individual efforts.", brutal: "We put two things together and hope for the best.", eli5: "When two things work better together, like peanut butter and jelly.", sassLevel: 3, category: "corporate" },
  { term: "at scale", plain: "Applied broadly, to a large number of users or use cases.", brutal: "We want to do it a lot. That's the whole insight.", eli5: "Doing something for lots and lots of people.", sassLevel: 2, category: "corporate" },
  { term: "end-to-end", plain: "Covering the entire process from start to finish.", brutal: "We do everything (poorly) so you don't have to use a competitor.", eli5: "From the very beginning to the very end.", sassLevel: 2, category: "corporate" },
  { term: "best-in-class", plain: "Among the top performers in its category.", brutal: "Self-awarded. No trophy exists for this.", eli5: "We think we're the best.", sassLevel: 3, category: "corporate" },
  { term: "world-class", plain: "Of the highest quality globally.", brutal: "A meaningless superlative. Who decides the class?", eli5: "Really, really good.", sassLevel: 3, category: "corporate" },
  { term: "cutting-edge", plain: "The most advanced currently available.", brutal: "New. It's just new.", eli5: "The newest, shiniest version.", sassLevel: 2, category: "corporate" },
  { term: "state-of-the-art", plain: "Represents the highest level of development at a given time.", brutal: "Was state-of-the-art when we wrote this press release. Probably isn't anymore.", eli5: "The very best right now.", sassLevel: 2, category: "corporate" },
  { term: "revolutionary", plain: "Introducing significant, radical change.", brutal: "Slightly better than the last version.", eli5: "Something that changes everything (supposedly).", sassLevel: 3, category: "corporate" },
  { term: "game-changing", plain: "Significantly altering how something is done.", brutal: "Marketing-speak for 'we added a new feature'.", eli5: "Changes the rules of the game.", sassLevel: 3, category: "corporate" },
  { term: "disruptive", plain: "Challenging established ways of doing business.", brutal: "We're going to annoy the existing companies. That's the business plan.", eli5: "Shaking things up.", sassLevel: 2, category: "corporate" },
  { term: "innovative", plain: "Introducing new ideas or methods.", brutal: "We did something. It might be new. Hard to tell.", eli5: "A brand new idea.", sassLevel: 2, category: "corporate" },
  { term: "next-generation", plain: "The upcoming, improved version.", brutal: "The current version, but with a number added.", eli5: "The newer, better one coming next.", sassLevel: 2, category: "corporate" },
  { term: "transformative", plain: "Causing a major change in form, nature, or function.", brutal: "It changes things. We just won't say what or how much.", eli5: "Changes stuff a lot.", sassLevel: 2, category: "corporate" },
  { term: "ecosystem", plain: "A network of interconnected products, services, and stakeholders.", brutal: "We have more than one product and we want them to sound connected.", eli5: "A bunch of things that all work together, like animals in a forest.", sassLevel: 2, category: "corporate" },
  { term: "holistic approach", plain: "Considering all aspects of a problem together.", brutal: "We haven't decided what to focus on yet.", eli5: "Looking at the whole thing, not just one part.", sassLevel: 3, category: "corporate" },
  { term: "democratizing AI", plain: "Making AI accessible to non-experts or smaller organizations.", brutal: "We made a slightly cheaper product.", eli5: "Letting everyone use the robot, not just fancy companies.", sassLevel: 3, category: "corporate", asiaContext: "Common claim by Southeast Asian startups targeting SMEs." },
  { term: "unlock value", plain: "Gain benefits from something.", brutal: "Make money. They mean make money.", eli5: "Find the treasure hiding inside.", sassLevel: 3, category: "corporate" },
  { term: "digital transformation", plain: "Adopting digital technology across a business.", brutal: "Finally getting off spreadsheets. Probably moving to different spreadsheets.", eli5: "Making everything work on computers instead of paper.", sassLevel: 2, category: "corporate", asiaContext: "Major government initiative across ASEAN nations." },
  { term: "strategic partnership", plain: "A business collaboration between two organizations.", brutal: "We signed a contract. It might even lead to revenue.", eli5: "Two companies decided to work together.", sassLevel: 2, category: "corporate" },
  { term: "thought leadership", plain: "Being recognized as an authority in a particular field.", brutal: "Writing blog posts and calling it leadership.", eli5: "When someone shares smart ideas and people listen.", sassLevel: 3, category: "corporate" },
  { term: "value proposition", plain: "The main benefit a product offers to customers.", brutal: "Why you should buy this. Apparently that needs a fancy term.", eli5: "Why this thing is good for you.", sassLevel: 2, category: "corporate" },
  { term: "actionable insights", plain: "Useful information you can act on.", brutal: "Information. Just information. The 'actionable' part is your problem.", eli5: "Stuff you learn that helps you decide what to do.", sassLevel: 3, category: "corporate" },
  { term: "scalable solution", plain: "Something that works for both small and large implementations.", brutal: "It works now. We think it'll still work later. No guarantees.", eli5: "Something that works when it's small AND when it's big.", sassLevel: 2, category: "corporate" },
  { term: "seamless integration", plain: "Easy to connect with existing systems.", brutal: "It has an API. The integration will not be seamless.", eli5: "It plugs in without any trouble (in theory).", sassLevel: 3, category: "corporate" },
  { term: "robust", plain: "Strong, reliable, and able to handle various conditions.", brutal: "It works most of the time.", eli5: "Strong and tough.", sassLevel: 2, category: "corporate" },
  { term: "mission-critical", plain: "Essential for the core operation of a business.", brutal: "Important. Just say important.", eli5: "Super important — can't work without it.", sassLevel: 2, category: "corporate" },
  { term: "leverage", plain: "Use effectively.", brutal: "USE. The word is USE.", eli5: "Use something to help you.", sassLevel: 3, category: "corporate" },
  { term: "deep dive", plain: "A thorough examination of a topic.", brutal: "We'll spend slightly more than five minutes on it.", eli5: "Looking really carefully at something.", sassLevel: 2, category: "corporate" },
  { term: "move the needle", plain: "Make a noticeable impact.", brutal: "Actually do something measurable, for once.", eli5: "Make a real difference.", sassLevel: 2, category: "corporate" },
  { term: "north star", plain: "A guiding principle or primary goal.", brutal: "The one metric we haven't changed this quarter.", eli5: "The most important goal that guides everything.", sassLevel: 2, category: "corporate" },
  { term: "low-hanging fruit", plain: "Easy wins or simple improvements to make first.", brutal: "The stuff we should've done ages ago.", eli5: "The easiest things to do first.", sassLevel: 2, category: "corporate" },
  { term: "circle back", plain: "Return to discuss something later.", brutal: "Ignore this for now and probably forever.", eli5: "Talk about it later.", sassLevel: 2, category: "corporate" },
  { term: "unparalleled", plain: "Without equal; the best.", brutal: "We didn't actually compare ourselves to anyone.", eli5: "Nothing else is as good.", sassLevel: 3, category: "corporate" },
  { term: "future-proof", plain: "Designed to remain useful as technology changes.", brutal: "We hope it still works in 18 months.", eli5: "Still useful when the future comes.", sassLevel: 2, category: "corporate" },
  { term: "turnkey solution", plain: "A complete, ready-to-use system.", brutal: "You still need to turn the key. And probably fix the lock.", eli5: "Ready to use right away, like a toy that comes with batteries.", sassLevel: 2, category: "corporate" },
  { term: "operationalize", plain: "Put into practical use.", brutal: "Start actually doing the thing we've been talking about for six months.", eli5: "Start using it for real.", sassLevel: 2, category: "corporate" },

  // === STARTUP SPEAK ===
  { term: "moat", plain: "A competitive advantage that protects a business from rivals.", brutal: "The one thing stopping people from copying you. Often imaginary.", eli5: "A castle wall that keeps competitors away.", sassLevel: 2, category: "startup" },
  { term: "flywheel", plain: "A self-reinforcing cycle where each component strengthens the others.", brutal: "Things get better over time. That's it. That's the flywheel.", eli5: "A spinning wheel that keeps going faster on its own.", sassLevel: 2, category: "startup" },
  { term: "product-market fit", plain: "When a product satisfies strong market demand.", brutal: "People actually want to buy what you're selling. Rare.", eli5: "Making something people actually want.", sassLevel: 1, category: "startup" },
  { term: "runway", plain: "How long a startup can operate before running out of money.", brutal: "The countdown to 'we need more money or we die'.", eli5: "How much time before the piggy bank is empty.", sassLevel: 2, category: "startup" },
  { term: "pivot", plain: "Fundamentally changing a business strategy or product direction.", brutal: "Plan A failed. Pretend Plan B was always the plan.", eli5: "Turning around and going a different way.", sassLevel: 3, category: "startup" },
  { term: "unicorn", plain: "A privately held startup valued at over $1 billion.", brutal: "A company worth a billion dollars that probably loses money.", eli5: "A super rare, magical startup worth a LOT of money.", sassLevel: 2, category: "startup", asiaContext: "India has the third-most unicorns globally. Southeast Asia's count is growing fast." },
  { term: "vertical", plain: "A specific industry or niche market.", brutal: "An industry. Just an industry.", eli5: "One specific type of business, like hospitals or schools.", sassLevel: 2, category: "startup" },
  { term: "horizontal", plain: "Applicable across many industries.", brutal: "We sell to anyone with a credit card.", eli5: "Something that works for lots of different businesses.", sassLevel: 2, category: "startup" },
  { term: "B2B", plain: "Business-to-business — selling products or services to other companies.", brutal: "Selling to companies, not humans. The margins are better.", eli5: "Companies selling stuff to other companies.", sassLevel: 1, category: "startup" },
  { term: "SaaS", plain: "Software as a Service — software you rent monthly instead of buying.", brutal: "Software you pay for forever and never own.", eli5: "Renting a computer program instead of buying it.", sassLevel: 1, category: "startup" },
  { term: "ARR", plain: "Annual Recurring Revenue — yearly subscription income.", brutal: "How much money comes in every year (before all the costs).", eli5: "Money that comes in every year like clockwork.", sassLevel: 1, category: "startup" },
  { term: "MRR", plain: "Monthly Recurring Revenue — monthly subscription income.", brutal: "ARR divided by 12. Yes, it needed its own acronym.", eli5: "Money that comes in every month.", sassLevel: 1, category: "startup" },
  { term: "TAM", plain: "Total Addressable Market — the maximum possible market size.", brutal: "A number so big it makes investors feel good. Never achievable.", eli5: "If EVERYONE bought it, this is how much money it would make.", sassLevel: 3, category: "startup" },
  { term: "Series A", plain: "The first major round of venture capital funding.", brutal: "The money round where you have to prove you might make money someday.", eli5: "Getting a big allowance to grow the business.", sassLevel: 1, category: "startup" },
  { term: "Series B", plain: "The second major funding round, typically for scaling.", brutal: "You're growing but still not profitable. Here's more money.", eli5: "An even bigger allowance.", sassLevel: 1, category: "startup" },
  { term: "Series C", plain: "Later-stage funding for expansion and market dominance.", brutal: "At this point you should really be making money. Are you making money?", eli5: "The really big allowance before you're all grown up.", sassLevel: 2, category: "startup" },
  { term: "burn rate", plain: "How quickly a company spends its cash reserves.", brutal: "The speed at which money evaporates.", eli5: "How fast the piggy bank empties.", sassLevel: 2, category: "startup" },
  { term: "growth hacking", plain: "Creative, low-cost strategies to rapidly acquire users.", brutal: "Marketing, but you can't afford a marketing budget.", eli5: "Clever tricks to get people to try your thing.", sassLevel: 3, category: "startup" },
  { term: "10x", plain: "Ten times better or larger than current state.", brutal: "A number picked for dramatic effect.", eli5: "Making something ten times better.", sassLevel: 2, category: "startup" },
  { term: "disrupt", plain: "Fundamentally change an industry.", brutal: "Annoy incumbents until they buy you or copy you.", eli5: "Shake things up in a big way.", sassLevel: 2, category: "startup" },
  { term: "hockey stick growth", plain: "Dramatic, exponential revenue or user growth.", brutal: "That one chart in the pitch deck that requires a lot of squinting.", eli5: "Growing really slowly, then really REALLY fast.", sassLevel: 3, category: "startup" },
  { term: "MVP", plain: "Minimum Viable Product — the simplest version of a product to test the idea.", brutal: "The barely-working version you show investors while calling it a product.", eli5: "The simplest version that actually works.", sassLevel: 2, category: "startup" },
  { term: "exit", plain: "When founders and investors sell their stake in a company.", brutal: "The moment everyone gets paid. The actual goal all along.", eli5: "Selling your lemonade stand for a lot of money.", sassLevel: 2, category: "startup" },
  { term: "bootstrapped", plain: "Built without external funding, using only revenue.", brutal: "Nobody wanted to invest, so they figured it out alone. Respect.", eli5: "Building something with your own money.", sassLevel: 1, category: "startup" },
  { term: "cap table", plain: "A spreadsheet showing who owns what percentage of a company.", brutal: "The spreadsheet that determines who gets rich.", eli5: "A list of who owns how much of the company.", sassLevel: 1, category: "startup" },

  // === POLICY JARGON ===
  { term: "responsible AI", plain: "Developing and deploying AI with consideration for ethics, fairness, and safety.", brutal: "Promising to be careful. Pinky promise.", eli5: "Making sure the robot is nice and fair.", sassLevel: 2, category: "policy", asiaContext: "Singapore's AI governance framework is a leading example in APAC." },
  { term: "ethical AI", plain: "AI designed and used in ways that align with moral principles.", brutal: "'Responsible AI' in a different font.", eli5: "Making the robot do the right thing.", sassLevel: 2, category: "policy" },
  { term: "AI governance", plain: "The policies, standards, and oversight structures for managing AI systems.", brutal: "Rules for AI. Still being written. Good luck.", eli5: "The rulebook for how robots should behave.", sassLevel: 1, category: "policy", asiaContext: "Active frameworks in Singapore, Japan, South Korea, and China." },
  { term: "algorithmic accountability", plain: "Holding organizations responsible for the decisions their AI systems make.", brutal: "When the AI messes up, someone should get blamed. But who?", eli5: "Making sure someone is responsible when the robot makes a mistake.", sassLevel: 2, category: "policy" },
  { term: "AI safety", plain: "Research focused on ensuring AI systems behave as intended without causing harm.", brutal: "Trying to make sure AI doesn't do something catastrophic. Work in progress.", eli5: "Making sure the robot doesn't do anything dangerous.", sassLevel: 1, category: "policy" },
  { term: "alignment", plain: "Ensuring AI systems pursue goals that match human intentions and values.", brutal: "Teaching AI to want what we want. Sounds easy, isn't.", eli5: "Making sure the robot wants to help us, not ignore us.", sassLevel: 1, category: "policy" },
  { term: "guardrails", plain: "Safety constraints built into AI systems to prevent harmful outputs.", brutal: "The 'please don't be awful' settings.", eli5: "Bumper lanes at the bowling alley, but for robots.", sassLevel: 2, category: "policy" },
  { term: "red-teaming", plain: "Deliberately trying to make an AI system fail or produce harmful outputs to find weaknesses.", brutal: "Paying people to bully the AI. For science.", eli5: "Testing the robot by being mean to it on purpose.", sassLevel: 2, category: "policy" },
  { term: "sandbox", plain: "A controlled testing environment for trying out new technologies or regulations.", brutal: "A playground where regulators pretend innovation is happening.", eli5: "A safe play area to test new ideas.", sassLevel: 2, category: "policy", asiaContext: "Regulatory sandboxes popular in Singapore, Hong Kong, and Thailand for fintech/AI." },
  { term: "regulatory framework", plain: "A set of rules and guidelines governing how something can be used.", brutal: "The rules. Eventually. After many consultations.", eli5: "The rules that tell everyone what they can and can't do.", sassLevel: 2, category: "policy" },
  { term: "data sovereignty", plain: "The principle that data is subject to the laws of the country where it's collected.", brutal: "Your data has to stay in our country. Good luck with cloud computing.", eli5: "Data has to follow the rules of the country it's in.", sassLevel: 1, category: "policy", asiaContext: "India, Vietnam, Indonesia, and China all have data localization requirements." },
  { term: "explainability", plain: "The ability to understand and describe how an AI reached a particular decision.", brutal: "'Why did the AI do that?' Great question. Nobody knows.", eli5: "The robot can explain why it made its choice.", sassLevel: 2, category: "policy" },
  { term: "bias", plain: "When an AI system produces unfair or skewed results, often reflecting prejudices in training data.", brutal: "The AI learned from humans. It learned the bad parts too.", eli5: "When the robot is unfair because it learned from unfair examples.", sassLevel: 1, category: "policy" },
  { term: "human-in-the-loop", plain: "AI systems that require human oversight or approval for critical decisions.", brutal: "A person double-checks the AI. Job security in disguise.", eli5: "A person watches the robot and helps when needed.", sassLevel: 2, category: "policy" },
  { term: "trustworthy AI", plain: "AI that is reliable, transparent, and respects privacy and fairness.", brutal: "AI you can trust. Theoretically. The trust is aspirational.", eli5: "A robot you can believe in.", sassLevel: 2, category: "policy" },
  { term: "privacy by design", plain: "Building privacy protections into systems from the start, not as an afterthought.", brutal: "Thinking about privacy before the data breach, for once.", eli5: "Building the robot's house with a lock on the door from the start.", sassLevel: 2, category: "policy" },
  { term: "dual-use", plain: "Technology that can be applied for both civilian and military purposes.", brutal: "It could help people or hurt people. Depends on who's buying.", eli5: "Something that can be used for good or not-so-good things.", sassLevel: 1, category: "policy" },
  { term: "compute", plain: "The processing power needed to train and run AI models.", brutal: "Electricity, GPUs, and the budget to pay for them.", eli5: "How much brain power the computer needs.", sassLevel: 1, category: "technical" },
  { term: "pre-training", plain: "The initial training phase where a model learns from a large dataset.", brutal: "The expensive part before the other expensive part.", eli5: "The robot's first big round of studying.", sassLevel: 1, category: "technical" },
  { term: "open-weight", plain: "Models whose learned parameters are shared, but training code may not be.", brutal: "Open source, but like, halfway.", eli5: "You can use the robot's brain, but not its recipe.", sassLevel: 2, category: "technical" },
  { term: "AI copilot", plain: "An AI assistant that works alongside a human, suggesting actions.", brutal: "Clippy's glow-up.", eli5: "A robot helper that sits next to you while you work.", sassLevel: 2, category: "corporate" },
  { term: "hyperscaler", plain: "A massive cloud computing provider like AWS, Azure, or Google Cloud.", brutal: "Three companies that own the internet's plumbing.", eli5: "A really really big computer company.", sassLevel: 1, category: "technical", asiaContext: "Alibaba Cloud and Huawei Cloud are the major Asian hyperscalers." },
  { term: "sovereign AI", plain: "National initiatives to develop domestic AI capabilities independent of foreign providers.", brutal: "Building our own ChatGPT because we don't trust theirs.", eli5: "A country making its own robot so it doesn't need someone else's.", sassLevel: 2, category: "policy", asiaContext: "India, Japan, and Singapore are all investing in sovereign AI capabilities." },
  { term: "AI washing", plain: "Exaggerating or falsely claiming AI capabilities in a product.", brutal: "Putting 'AI' on the label to charge more. Works every time.", eli5: "Pretending something has a robot inside when it really doesn't.", sassLevel: 3, category: "corporate" },
  { term: "data flywheel", plain: "A cycle where more users generate more data, which improves the AI, which attracts more users.", brutal: "More users = more data = better AI = more hype. Repeat.", eli5: "More people using the robot makes it smarter, which gets more people.", sassLevel: 2, category: "startup" },
  { term: "moonshot", plain: "An ambitious, exploratory project with little expectation of near-term profitability.", brutal: "A project so ambitious no one will notice if it fails.", eli5: "Trying something really really hard, like going to the moon.", sassLevel: 2, category: "corporate" },
  { term: "first-mover advantage", plain: "The benefit of being the first to enter a market.", brutal: "Being first, which matters until someone does it better.", eli5: "Being the first one to open a lemonade stand on the street.", sassLevel: 2, category: "startup" },
  { term: "second-mover advantage", plain: "Learning from the first mover's mistakes and building a better product.", brutal: "Copying the first mover's homework and getting a better grade.", eli5: "Watching someone else go first, then doing it even better.", sassLevel: 2, category: "startup" },
];

export const SAMPLE_TEXTS = [
  `We are thrilled to announce our revolutionary AI-powered platform that leverages cutting-edge foundation models to deliver transformative, end-to-end solutions at scale. Our best-in-class multimodal system harnesses the power of generative AI to unlock value through seamless integration with your existing ecosystem. This paradigm shift in digital transformation will democratize AI for enterprises seeking a holistic approach to operationalize their data-driven strategies.`,
  `Our next-generation agentic AI copilot represents a game-changing disruption in the B2B SaaS vertical. By leveraging state-of-the-art RAG and fine-tuning techniques, we've achieved product-market fit with a scalable solution that moves the needle on enterprise productivity. Our moat is our proprietary data flywheel — the more users on our platform, the smarter our AI becomes. We're bootstrapped with hockey stick growth and a clear path to exit.`,
  `In alignment with our commitment to responsible AI and ethical AI governance, we are implementing robust guardrails and human-in-the-loop oversight mechanisms across our AI ecosystem. Our regulatory framework ensures algorithmic accountability through explainability and privacy by design, while our red-teaming approach validates the trustworthy AI principles embedded in our sovereign AI strategy. This deep dive into AI safety represents our north star for the region.`,
];

export function findJargonInText(text: string): { term: string; entry: JargonEntry; startIndex: number; endIndex: number }[] {
  const results: { term: string; entry: JargonEntry; startIndex: number; endIndex: number }[] = [];
  const lowerText = text.toLowerCase();

  // Sort by term length descending to match longer phrases first
  const sorted = [...JARGON_DICTIONARY].sort((a, b) => b.term.length - a.term.length);

  const used = new Set<number>(); // track character positions already matched

  for (const entry of sorted) {
    const termLower = entry.term.toLowerCase();
    let searchFrom = 0;
    while (true) {
      const idx = lowerText.indexOf(termLower, searchFrom);
      if (idx === -1) break;

      // Check word boundary
      const before = idx > 0 ? lowerText[idx - 1] : " ";
      const after = idx + termLower.length < lowerText.length ? lowerText[idx + termLower.length] : " ";
      const boundaryChars = /[\s.,;:!?()\-"'/\[\]{}]/;

      if (boundaryChars.test(before) && boundaryChars.test(after)) {
        // Check no overlap with existing matches
        let overlaps = false;
        for (let i = idx; i < idx + termLower.length; i++) {
          if (used.has(i)) { overlaps = true; break; }
        }
        if (!overlaps) {
          for (let i = idx; i < idx + termLower.length; i++) used.add(i);
          results.push({ term: text.substring(idx, idx + entry.term.length), entry, startIndex: idx, endIndex: idx + entry.term.length });
        }
      }
      searchFrom = idx + 1;
    }
  }

  return results.sort((a, b) => a.startIndex - b.startIndex);
}
