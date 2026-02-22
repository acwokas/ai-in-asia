import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Send, Loader2, Sparkles, Bot, Mic, Download, BookOpen, Trash2, Zap, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryColor } from "@/lib/categoryColors";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ArticleSuggestion {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category_slug: string;
  featured_image_url?: string;
}

const STORAGE_KEY = "scout-chat-history";
const MAX_STORED_MESSAGES = 20;

const saveToLocalStorage = (messages: Message[]) => {
  try {
    const toStore = messages.slice(-MAX_STORED_MESSAGES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch { /* quota exceeded */ }
};

const loadFromLocalStorage = (): Message[] | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* corrupt data */ }
  return null;
};

const defaultMessage: Message = {
  role: "assistant",
  content: "Hello! I'm Scout, your AI assistant for AI in ASIA. Ask me anything about AI developments, trends, and news across Asia.",
};

const ScoutChatbot = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [queriesRemaining, setQueriesRemaining] = useState<number | null>(null);
  const [queryLimit, setQueryLimit] = useState(3);
  const [messages, setMessages] = useState<Message[]>(() => {
    const stored = loadFromLocalStorage();
    return stored && stored.length > 0 ? stored : [defaultMessage];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [articleSuggestions, setArticleSuggestions] = useState<ArticleSuggestion[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Context awareness
  const articleContext = useArticleContext(location);

  // Persist messages to localStorage
  useEffect(() => {
    if (messages.length > 1) {
      saveToLocalStorage(messages);
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      fetchQueryLimit();
      if (user) {
        loadConversation();
      }
    }
  }, [isOpen, user]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error("Voice input failed", { description: "Please try again or type your message." });
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const fetchQueryLimit = async () => {
    let limit = 3;
    
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
          setQueryLimit(999);
          return;
        } else if (points >= 500) {
          limit = 50;
        } else if (points >= 100) {
          limit = 25;
        } else {
          limit = 10;
        }
      }
    }

    setQueryLimit(limit);
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
    setQueriesRemaining(limit - currentCount);
  };

  const loadConversation = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setConversationId(data.id);
      setMessages(data.messages as unknown as Message[]);
    }
  };

  const saveConversation = async (newMessages: Message[]) => {
    if (!user) return;
    if (conversationId) {
      await supabase
        .from('chat_conversations')
        .update({ 
          messages: newMessages as any,
          updated_at: new Date().toISOString(),
          title: newMessages[1]?.content.substring(0, 50) || 'New Conversation'
        })
        .eq('id', conversationId);
    } else {
      const { data } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: user.id,
          messages: newMessages as any,
          title: newMessages[1]?.content.substring(0, 50) || 'New Conversation'
        })
        .select()
        .single();
      if (data) setConversationId(data.id);
    }
  };

  const clearConversation = () => {
    setMessages([defaultMessage]);
    setConversationId(null);
    localStorage.removeItem(STORAGE_KEY);
    toast("Conversation cleared");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startVoiceInput = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const exportTranscript = () => {
    const transcript = messages
      .map(m => `${m.role === 'user' ? 'You' : 'Scout'}: ${m.content}`)
      .join('\n\n');
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scout-chat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("Transcript exported");
  };

  const sendQuickAction = (text: string) => {
    setInput(text);
    // Trigger send on next tick so input is set
    setTimeout(() => {
      const form = document.getElementById("scout-chat-form") as HTMLFormElement;
      form?.requestSubmit();
    }, 0);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    if (queriesRemaining !== null && queriesRemaining <= 0) {
      if (!user) {
        toast.error("Query limit reached", { description: "Sign in for more daily queries." });
      } else {
        toast.error("Daily limit reached", { description: "You've used all your queries for today." });
      }
      return;
    }

    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const bodyPayload: any = { messages: newMessages };
      // Add article context if available
      if (articleContext) {
        bodyPayload.context = articleContext;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scout-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(bodyPayload),
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
              // skip malformed lines
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
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to send message. Please try again.",
      });
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

  // Quick actions based on current page
  const quickActions = getQuickActions(location, articleContext);

  // Hide on admin and editor pages
  if (location.pathname === '/admin' || location.pathname === '/editor' || location.pathname.startsWith('/admin/')) {
    return null;
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-20 right-6 z-50">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
        <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        <Button
          onClick={() => setIsOpen(true)}
          className="relative rounded-full w-16 h-16 bg-gradient-to-br from-primary via-primary to-accent shadow-[0_0_30px_rgba(0,188,212,0.5)] hover:shadow-[0_0_40px_rgba(0,188,212,0.8)] transition-all duration-300 hover:scale-110 border border-primary/50"
          size="icon"
          aria-label="Open Scout AI assistant"
        >
          <Bot className="h-7 w-7 animate-pulse" />
        </Button>
      </div>
    );
  }

  const usedQueries = queriesRemaining !== null ? queryLimit - queriesRemaining : 0;

  return (
    <>
      <div 
        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
        onClick={() => setIsOpen(false)}
      />
      
      <div className="fixed bottom-20 right-4 left-4 md:left-auto md:right-6 md:w-96 h-[600px] max-h-[80vh] z-50 animate-scale-in">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-2xl blur-2xl" />
        
        <div className="relative bg-card/98 backdrop-blur-xl border-2 border-primary/50 rounded-2xl shadow-[0_8px_80px_rgba(0,188,212,0.6),0_0_0_1px_rgba(0,188,212,0.2)] flex flex-col overflow-hidden h-full">
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }} />
          
          {/* Header */}
          <div className="relative flex items-center justify-between p-4 border-b border-primary/20 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
            
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full animate-pulse" />
                <div className="relative bg-gradient-to-br from-primary to-accent p-2 rounded-full">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  Ask Scout
                  <Sparkles className="h-4 w-4 text-accent animate-pulse" />
                </h3>
                {articleContext ? (
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]" title={articleContext.title}>
                    Reading: {articleContext.title}
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">AI-Powered Assistant</p>
                    {queriesRemaining !== null && (
                      <Badge variant={queriesRemaining <= 3 ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0">
                        {queriesRemaining}/{queryLimit}
                      </Badge>
                    )}
                    {queriesRemaining === null && user && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30">∞</Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={clearConversation}
                className="hover:bg-destructive/10 hover:text-destructive transition-all rounded-full h-8 w-8"
                aria-label="Clear conversation"
                title="Clear conversation"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={exportTranscript}
                className="hover:bg-primary/10 hover:text-primary transition-all rounded-full h-8 w-8"
                aria-label="Export transcript"
                title="Export transcript"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="hover:bg-primary/10 hover:text-primary transition-all rounded-full h-8 w-8"
                aria-label="Close Scout assistant"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4" aria-live="polite" aria-relevant="additions">
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
                  <div className="bg-card border border-border rounded-2xl p-3 shadow-sm">
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

          {/* Input */}
          <div className="relative p-4 border-t border-primary/20 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent" />
            
            {/* Rate limit warnings */}
            {queriesRemaining !== null && queriesRemaining <= 0 && (
              <div className="text-xs mb-3 flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg px-3 py-2 border border-destructive/20">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                {!user ? (
                  <span>Daily limit reached. <Link to="/auth" className="underline font-semibold" onClick={() => setIsOpen(false)}>Sign in</Link> for more queries.</span>
                ) : (
                  <span>You've reached your daily limit. Come back tomorrow!</span>
                )}
              </div>
            )}
            {queriesRemaining !== null && queriesRemaining > 0 && queriesRemaining <= 3 && (
              <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-1.5 border border-border/30">
                <AlertTriangle className="h-3 w-3 text-accent" />
                {queriesRemaining} {queriesRemaining === 1 ? 'query' : 'queries'} remaining today
                {!user && ' · Sign in for more'}
              </div>
            )}

            {/* Quick action pills */}
            {quickActions.length > 0 && !isLoading && (
              <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendQuickAction(action.prompt)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 transition-colors whitespace-nowrap flex-shrink-0 min-h-[32px]"
                  >
                    <Zap className="h-3 w-3" />
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            <form
              id="scout-chat-form"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1 group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Scout anything..."
                  disabled={isLoading || (queriesRemaining !== null && queriesRemaining <= 0)}
                  className="relative border-primary/30 focus-visible:ring-primary/50 bg-background/50 backdrop-blur"
                />
              </div>
              <Button 
                type="submit" 
                size="icon" 
                disabled={isLoading || !input.trim() || (queriesRemaining !== null && queriesRemaining <= 0)}
                className="relative bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-[0_0_20px_rgba(0,188,212,0.3)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)] transition-all disabled:opacity-50 disabled:shadow-none rounded-lg"
                aria-label="Send message to Scout"
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

// Hook to extract article context from the current URL
function useArticleContext(location: ReturnType<typeof useLocation>) {
  const [context, setContext] = useState<{ title: string; excerpt?: string; category?: string } | null>(null);

  useEffect(() => {
    const path = location.pathname;
    // Match /:category/:slug pattern (article pages)
    const articleMatch = path.match(/^\/([^/]+)\/([^/]+)$/);
    const categoryMatch = path.match(/^\/category\/([^/]+)$/);

    if (articleMatch && !['category', 'tag', 'author', 'admin', 'newsletter', 'guides', 'ai-policy-atlas'].includes(articleMatch[1])) {
      // Try to get article info from the page
      const titleEl = document.querySelector('h1');
      const metaDesc = document.querySelector('meta[name="description"]');
      if (titleEl?.textContent) {
        setContext({
          title: titleEl.textContent,
          excerpt: metaDesc?.getAttribute('content') || undefined,
          category: articleMatch[1],
        });
        return;
      }
    }
    
    if (categoryMatch) {
      setContext({
        title: `${categoryMatch[1]} category`,
        category: categoryMatch[1],
      });
      return;
    }

    setContext(null);
  }, [location.pathname]);

  return context;
}

// Get quick actions based on current page context
function getQuickActions(location: ReturnType<typeof useLocation>, articleContext: { title: string; category?: string } | null) {
  const actions: { label: string; prompt: string }[] = [];

  actions.push({ label: "What's trending?", prompt: "What's trending in AI in Asia right now?" });

  if (articleContext && articleContext.category && !['category'].includes(articleContext.category)) {
    actions.push({ 
      label: "Explain this article", 
      prompt: `Can you explain the key points of the article "${articleContext.title}"?` 
    });
  }

  const path = location.pathname;
  if (path.includes('policy') || path.includes('category/news')) {
    actions.push({ label: "Compare AI policies", prompt: "Compare AI regulation policies across major Asian countries" });
  }

  return actions;
}

export default ScoutChatbot;
