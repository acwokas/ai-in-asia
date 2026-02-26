import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TOKENS } from "@/constants/categoryTokens";
import type React from "react";

interface CategoryNewsletterProps {
  cfg: { accent: string; label: string };
  revealProps: {
    ref: React.Ref<HTMLDivElement>;
    style: React.CSSProperties;
  };
}

export function CategoryNewsletter({ cfg, revealProps }: CategoryNewsletterProps) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: trimmed, signup_source: "category_page" });

      if (error) {
        if (error.code === "23505") {
          toast.info("You're already subscribed!");
        } else {
          throw error;
        }
      } else {
        toast.success("Welcome! You're now subscribed.");
        setEmail("");
        localStorage.setItem("newsletter-subscribed", "true");
      }
    } catch (err: any) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section ref={revealProps.ref} style={{ marginBottom: 24, ...revealProps.style }}>
      <div
        style={{
          borderRadius: 20,
          padding: "48px 40px",
          background: `linear-gradient(135deg, ${cfg.accent}20, ${TOKENS.BRAND}20)`,
          border: `1px solid ${TOKENS.BORDER}`,
          textAlign: "center",
        }}
      >
        <h2 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 900, fontSize: 28, color: "#fff", margin: "0 0 8px 0" }}>
          Never Miss an AI Breakthrough
        </h2>
        <p style={{ fontSize: 14, color: "#9ca3af", fontFamily: "Nunito, sans-serif", margin: "0 0 24px 0" }}>
          Get the best of {cfg.label} delivered to your inbox every week.
        </p>
        <form onSubmit={handleSubscribe} className="flex flex-col min-[480px]:flex-row justify-center gap-2 max-w-[440px] mx-auto">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 12,
              border: `1px solid ${TOKENS.BORDER}`,
              background: TOKENS.CARD_BG,
              color: "#fff",
              fontFamily: "Nunito, sans-serif",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "12px 28px",
              borderRadius: 12,
              background: submitting ? `${cfg.accent}80` : cfg.accent,
              color: "#000",
              fontFamily: "Poppins, sans-serif",
              fontWeight: 800,
              fontSize: 13,
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Subscribing..." : "Subscribe"}
          </button>
        </form>
      </div>
    </section>
  );
}
