import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2, Sparkles, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  articles?: Article[];
}

const ScoutChatbot = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
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
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchQueryLimit();
    }
  }, [isOpen, user]);

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
          setQueriesRemaining(null); // Unlimited
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
    const { data: queryData } = await supabase
      .from('scout_queries')
      .select('query_count')
      .eq('query_date', today)
      .eq('user_id', user?.id || null)
      .maybeSingle();

    const currentCount = queryData?.query_count || 0;
    setQueriesRemaining(queryLimit - currentCount);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log("Sending Scout message to:", `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scout-chat`);
      
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

      console.log("Scout response status:", response.status, "Content-Type:", response.headers.get('Content-Type'));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to get response" }));
        console.error("Scout chat error:", response.status, errorData);
        throw new Error(errorData.error || `Failed to get response (${response.status})`);
      }

      if (!response.body) {
        console.error("No response body received");
        throw new Error("No response body");
      }

      console.log("Starting to read stream...");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let textBuffer = "";
      let toolCallBuffer = "";
      let searchQuery = "";

      // Add empty assistant message that we'll update
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log("Stream reading completed");
            break;
          }

          // Decode the chunk and add to buffer
          textBuffer += decoder.decode(value, { stream: true });
          console.log("Buffer length:", textBuffer.length, "First 50 chars:", textBuffer.substring(0, 50));

          // Process complete lines
          let newlineIndex;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            const line = textBuffer.slice(0, newlineIndex).trim();
            textBuffer = textBuffer.slice(newlineIndex + 1);

            // Skip empty lines and comments
            if (!line || line.startsWith(':')) continue;
            
            // Must start with "data: "
            if (!line.startsWith('data: ')) continue;
            
            const data = line.slice(6);
            
            // Check for [DONE] signal
            if (data === '[DONE]') {
              console.log("Received [DONE] signal");
              break;
            }

            try {
              const parsed = JSON.parse(data);
              console.log("Parsed chunk:", parsed);
              const delta = parsed.choices?.[0]?.delta;
              
              // Handle tool calls
              if (delta?.tool_calls) {
                const toolCall = delta.tool_calls[0];
                if (toolCall?.function?.arguments) {
                  toolCallBuffer += toolCall.function.arguments;
                }
              } else if (delta?.content) {
                assistantContent += delta.content;
                setMessages((prev) =>
                  prev.map((msg, i) =>
                    i === prev.length - 1
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                );
              }

              // Check if finish_reason indicates tool call completion
              if (parsed.choices?.[0]?.finish_reason === "tool_calls" && toolCallBuffer) {
                try {
                  const toolArgs = JSON.parse(toolCallBuffer);
                  searchQuery = toolArgs.query;
                  console.log("Scout searching for:", searchQuery);
                  
                  // Search for articles
                  const { data: articles, error: searchError } = await supabase
                    .from("articles")
                    .select("id, title, slug, excerpt")
                    .eq("status", "published")
                    .or(`title.ilike.%${searchQuery}%,excerpt.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
                    .limit(5);

                  if (searchError) {
                    console.error("Article search error:", searchError);
                  } else if (articles && articles.length > 0) {
                    console.log("Found articles:", articles.length);
                    setMessages((prev) =>
                      prev.map((msg, i) =>
                        i === prev.length - 1
                          ? { ...msg, articles: articles as Article[] }
                          : msg
                      )
                    );
                  }
                } catch (e) {
                  console.error("Error parsing tool call:", e);
                }
              }
            } catch (e) {
              console.error("Error parsing JSON line:", line, "Error:", e);
            }
          }
        }
      } catch (streamError) {
        console.error("Stream reading error:", streamError);
        throw streamError;
      }


      console.log("Scout message completed successfully");
      setIsLoading(false);
      fetchQueryLimit(); // Refresh query count after successful message
    } catch (error) {
      console.error("Scout chat error:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message. Please try again.",
        variant: "destructive",
      });
      // Remove the empty assistant message if it exists
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

  // Hide on admin and editor pages
  if (location.pathname === '/admin' || location.pathname === '/editor' || location.pathname.startsWith('/admin/')) {
    return null;
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        {/* Pulsing glow ring */}
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
        <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        
        <Button
          onClick={() => setIsOpen(true)}
          className="relative rounded-full w-16 h-16 bg-gradient-to-br from-primary via-primary to-accent shadow-[0_0_30px_rgba(0,188,212,0.5)] hover:shadow-[0_0_40px_rgba(0,188,212,0.8)] transition-all duration-300 hover:scale-110 border border-primary/50"
          size="icon"
        >
          <Bot className="h-7 w-7 animate-pulse" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
        onClick={() => setIsOpen(false)}
      />
      
      <div className="fixed bottom-4 right-4 left-4 md:left-auto md:right-6 md:w-96 h-[600px] max-h-[85vh] z-50 animate-scale-in">
        {/* Outer glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-2xl blur-2xl" />
        
        {/* Main container */}
        <div className="relative bg-card/98 backdrop-blur-xl border-2 border-primary/50 rounded-2xl shadow-[0_8px_80px_rgba(0,188,212,0.6),0_0_0_1px_rgba(0,188,212,0.2)] flex flex-col overflow-hidden">
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }} />
        
        {/* Header */}
        <div className="relative flex items-center justify-between p-4 border-b border-primary/20 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
          {/* Animated scan line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full animate-pulse" />
              <div className="relative bg-gradient-to-br from-primary to-accent p-2 rounded-full">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                Ask Scout
                <Sparkles className="h-4 w-4 text-accent animate-pulse" />
              </h3>
              <p className="text-xs text-muted-foreground">AI-Powered Assistant</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="hover:bg-primary/10 hover:text-primary transition-all rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

      {/* Messages */}
      <div className="relative flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            {msg.role === "assistant" && (
              <div className="mr-2 mt-1">
                <div className="relative">
                  <div className="absolute inset-0 bg-accent/30 blur-md rounded-full" />
                  <div className="relative bg-gradient-to-br from-accent to-primary p-1.5 rounded-full">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl p-3 relative group ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_0_20px_rgba(0,188,212,0.3)] border border-primary/20"
                  : "bg-card border border-border shadow-sm"
              }`}
            >
              {msg.role === "user" && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              )}
              <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
              
              {msg.articles && msg.articles.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-border/30 pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">Related Articles:</p>
                  {msg.articles.map((article) => (
                    <a
                      key={article.id}
                      href={`/article/${article.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2 rounded-lg bg-background/50 hover:bg-background/80 border border-border/30 hover:border-primary/50 transition-all group/article"
                    >
                      <p className="text-sm font-medium group-hover/article:text-primary transition-colors line-clamp-2">
                        {article.title}
                      </p>
                      {article.excerpt && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {article.excerpt}
                        </p>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="mr-2 mt-1">
              <div className="relative">
                <div className="absolute inset-0 bg-accent/30 blur-md rounded-full animate-pulse" />
                <div className="relative bg-gradient-to-br from-accent to-primary p-1.5 rounded-full">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-3 flex items-center gap-2 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="relative p-4 border-t border-primary/20 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
        {/* Glow line on top */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent" />
        
        {queriesRemaining !== null && queriesRemaining <= 5 && (
          <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-1.5 border border-border/30">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            {queriesRemaining} {queriesRemaining === 1 ? 'query' : 'queries'} remaining today
            {!user && ' · Sign in for more'}
          </div>
        )}
        {queriesRemaining === null && user && (
          <div className="text-xs mb-3 flex items-center gap-2 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg px-3 py-1.5 border border-primary/30">
            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            <span className="text-primary font-semibold">Unlimited queries (Thought Leader)</span>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
            fetchQueryLimit();
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1 group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Scout anything..."
              disabled={isLoading}
              className="relative border-primary/30 focus-visible:ring-primary/50 bg-background/50 backdrop-blur"
            />
          </div>
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || !input.trim()}
            className="relative bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-[0_0_20px_rgba(0,188,212,0.3)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)] transition-all disabled:opacity-50 disabled:shadow-none rounded-lg"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
      </div>
      </div>
    </>
  );
};

export default ScoutChatbot;
