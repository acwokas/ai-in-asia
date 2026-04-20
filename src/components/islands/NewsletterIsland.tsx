import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Props {
  supabaseUrl: string;
  supabaseAnonKey: string;
  variant?: 'compact' | 'default';
}

export default function NewsletterIsland({ supabaseUrl, supabaseAnonKey, variant = 'default' }: Props) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { error: dbErr } = await supabase
        .from('newsletter_subscribers')
        .upsert({ email: trimmed, status: 'subscribed' }, { onConflict: 'email' });
      if (dbErr) throw dbErr;
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className={`rounded-xl border border-border/50 bg-muted/20 p-4 ${variant === 'compact' ? 'p-3' : 'p-6'}`}>
        <p className="text-sm font-semibold text-primary">You're subscribed!</p>
        <p className="text-xs text-muted-foreground mt-1">Thanks for joining the AI in Asia community.</p>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Newsletter</p>
        <p className="text-sm font-semibold mb-3">Get 3 Before 9 in your inbox</p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 px-3 py-1.5 rounded-lg border border-border/50 bg-card text-sm outline-none focus:border-primary transition-colors"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
          >
            {submitting ? '...' : 'Subscribe'}
          </button>
        </form>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-muted/10 p-6 md:p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Free Newsletter</p>
      <h3 className="text-xl font-bold mb-2">3 AI stories before your morning coffee</h3>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        The 3 Before 9 briefing lands in your inbox every weekday morning. Stay ahead of AI developments across Asia.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Your email address"
          className="flex-1 px-4 py-2.5 rounded-lg border border-border/50 bg-card text-sm outline-none focus:border-primary transition-colors"
        />
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
        >
          {submitting ? 'Subscribing...' : 'Subscribe free'}
        </button>
      </form>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      <p className="text-xs text-muted-foreground mt-3">No spam. Unsubscribe at any time.</p>
    </div>
  );
}
