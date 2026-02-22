import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Sparkles, Bot, AlertTriangle, LogIn } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_PROMPTS = [
  { emoji: "🌏", text: "What's the latest in Asian AI?" },
  { emoji: "📜", text: "Explain AI regulation in Singapore" },
  { emoji: "🤖", text: "What should I read about generative AI?" },
  { emoji: "🔍", text: "Compare AI adoption across ASEAN" },
  { emoji: "🛠️", text: "What are the top AI tools for business?" },
  { emoji: "📰", text: "Summarize this week's AI news" },
];

const AskScout = () => {
  const { user } = useAuth();
  const [queriesRemaining, setQueriesRemaining] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm Scout, your AI assistant for AI in ASIA. Ask me anything about AI developments, trends, and news across Asia.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasUserMessages = messages.some(m => m.role === "user");

  useEffect(() => {
    fetchQueryLimit();
  }, [user]);

  const fetchQueryLimit = async () => {
    let queryLimit = 3;
    
    if (user) {
      const { data: stats } = await supabase
        .from('user_stats')
        .select('points')
        .eq('user_id', user.id)
        .single();
      
      if (stats) {
        const points = stats.points || 0;
        if (points >= 1000) {
          setQueriesRemaining(null);
          return;
        } else if (points >= 500) {
          queryLimit = 50;
        } else if (points >= 100) {
          queryLimit = 25;
        } else {
          queryLimit = 10;
        }
      }
    }

    const today = new Date().toISOString().split('T')[0];
    let query = supabase
      .from('scout_queries')
      .select('query_count')
      .eq('query_date', today);
    
    if (user?.id) {
      query = query.eq('user_id', user.id);
    } else {
      query = query.is('user_id', null);
    }
    
    const { data: queryData } = await query.maybeSingle();
    const currentCount = queryData?.query_count || 0;
    setQueriesRemaining(queryLimit - currentCount);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 1) {
      scrollToBottom();
    }
  }, [messages]);

  const sendPrompt = (text: string) => {
    setInput(text);
    setTimeout(() => {
      const form = document.getElementById("ask-scout-form") as HTMLFormElement;
      form?.requestSubmit();
    }, 0);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scout-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: newMessages }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to get response" }));
        throw new Error(errorData.error || `Failed to get response (${response.status})`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let textBuffer = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            const line = textBuffer.slice(0, newlineIndex).trim();
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (!line || line.startsWith(':')) continue;
            if (!line.startsWith('data: ')) continue;
            
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              
              if (delta?.content) {
                assistantContent += delta.content;
                setMessages((prev) =>
                  prev.map((msg, i) =>
                    i === prev.length - 1
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                );
              }
            } catch (e) {
              // skip
            }
          }
        }
      } catch (streamError) {
        throw streamError;
      }

      setIsLoading(false);
      fetchQueryLimit();
    } catch (error) {
      console.error("Scout chat error:", error);
      toast.error("Error", { description: error instanceof Error ? error.message : "Failed to send message. Please try again." });
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.role === "assistant" && !lastMsg.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Ask Scout - AI Assistant"
        description="Ask Scout anything about AI developments, trends, and news across Asia. Your AI-powered assistant for AI in ASIA."
        noIndex={true}
      />
      
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto w-full">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full animate-pulse" />
                <div className="relative bg-gradient-to-br from-primary to-accent p-4 rounded-full">
                  <Bot className="h-12 w-12 text-primary-foreground" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
              Ask Scout
              <Sparkles className="h-6 w-6 text-accent animate-pulse" />
            </h1>
            <p className="text-muted-foreground text-lg">
              Your AI-powered assistant for AI in ASIA
            </p>
          </div>

          {/* Suggested Prompts - only show before user sends first message */}
          {!hasUserMessages && (
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt.text}
                  onClick={() => sendPrompt(prompt.text)}
                  className="text-left p-4 rounded-xl border border-border hover:border-primary/50 bg-card hover:bg-primary/5 transition-all group min-h-[60px]"
                >
                  <span className="text-lg mr-2">{prompt.emoji}</span>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    {prompt.text}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Sign-in prompt for anonymous users */}
          {!user && (
            <div className="mb-6 flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
              <LogIn className="h-5 w-5 text-primary flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                <Link to="/auth" className="text-primary font-semibold hover:underline">Sign in</Link> to unlock more daily queries and save your conversations.
              </p>
            </div>
          )}

          {/* Chat Container */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur-2xl" />
            
            <div className="relative bg-card/98 backdrop-blur-xl border-2 border-primary/50 rounded-2xl shadow-[0_8px_80px_rgba(0,188,212,0.6),0_0_0_1px_rgba(0,188,212,0.2)] overflow-hidden flex flex-col h-[600px]">
              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />

              {/* Messages */}
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4 pb-4 min-h-full">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      {msg.role === "assistant" && (
                        <div className="mr-3 mt-1">
                          <div className="relative">
                            <div className="absolute inset-0 bg-accent/30 blur-md rounded-full" />
                            <div className="relative bg-gradient-to-br from-accent to-primary p-2 rounded-full">
                              <Bot className="h-5 w-5 text-primary-foreground" />
                            </div>
                          </div>
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] rounded-2xl p-4 relative group ${
                          msg.role === "user"
                            ? "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_0_20px_rgba(0,188,212,0.3)] border border-primary/20"
                            : "bg-card border border-border shadow-sm"
                        }`}
                      >
                        {msg.role === "user" && (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                        )}
                        <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start animate-fade-in">
                      <div className="mr-3 mt-1">
                        <div className="relative">
                          <div className="absolute inset-0 bg-accent/30 blur-md rounded-full animate-pulse" />
                          <div className="relative bg-gradient-to-br from-accent to-primary p-2 rounded-full">
                            <Bot className="h-5 w-5 text-primary-foreground" />
                          </div>
                        </div>
                      </div>
                      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground mr-1">Scout is thinking</span>
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="relative border-t border-primary/20 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 p-6 flex-shrink-0">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent" />
                
                {queriesRemaining !== null && queriesRemaining <= 5 && queriesRemaining > 0 && (
                  <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2 bg-muted/30 rounded-lg px-4 py-2 border border-border/30">
                    <AlertTriangle className="h-3.5 w-3.5 text-accent" />
                    {queriesRemaining} {queriesRemaining === 1 ? 'query' : 'queries'} remaining today
                    {!user && ' · Sign in for more'}
                  </div>
                )}
                {queriesRemaining !== null && queriesRemaining <= 0 && (
                  <div className="text-sm mb-4 flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg px-4 py-2 border border-destructive/20">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Daily limit reached.{' '}
                    {!user && <Link to="/auth" className="underline font-semibold">Sign in for more.</Link>}
                  </div>
                )}
                {queriesRemaining === null && user && (
                  <div className="text-sm mb-4 flex items-center gap-2 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg px-4 py-2 border border-primary/30">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-primary font-semibold">Unlimited queries (Thought Leader)</span>
                  </div>
                )}
                
                <form
                  id="ask-scout-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex gap-3"
                >
                  <div className="relative flex-1 group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask Scout anything about AI in Asia..."
                      disabled={isLoading || (queriesRemaining !== null && queriesRemaining <= 0)}
                      className="relative border-primary/30 focus-visible:ring-primary/50 bg-background/50 backdrop-blur h-12 text-base"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={isLoading || !input.trim() || (queriesRemaining !== null && queriesRemaining <= 0)}
                    className="relative bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-[0_0_20px_rgba(0,188,212,0.3)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)] transition-all disabled:opacity-50 disabled:shadow-none rounded-lg h-12 w-12"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              </div>
            </div>
          </div>

          {/* AI Disclaimer */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            Scout is powered by AI and may make mistakes. Always verify important information.
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AskScout;
