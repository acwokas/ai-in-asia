/**
 * Client-side island for below-fold homepage sections.
 * Renders: Most Discussed, For You (auth), Recommended Articles,
 * Recommended Guides, Upcoming Events, Newsletter CTA.
 */
import { lazy, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Providers } from './Providers';

const MostDiscussedSection = lazy(() => import('@/components/MostDiscussedSection'));
const ForYouSection = lazy(() => import('@/components/ForYouSection'));
const RecommendedArticles = lazy(() => import('@/components/RecommendedArticles'));
const RecommendedGuides = lazy(() => import('@/components/RecommendedGuides'));
const UpcomingEvents = lazy(() => import('@/components/UpcomingEvents'));

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { isNewsletterSubscribed as checkSubscribed, markNewsletterSubscribed, awardNewsletterPoints } from '@/lib/newsletterUtils';

function HomeContent() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(checkSubscribed());

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const trimmed = email.trim();
      if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
      const { data: existing } = await supabase.from('newsletter_subscribers').select('id').eq('email', trimmed).maybeSingle();
      if (existing) {
        setSubscribed(true);
        return;
      }
      const { error } = await supabase.from('newsletter_subscribers').insert({ email: trimmed });
      if (!error) {
        setSubscribed(true);
        markNewsletterSubscribed();
        await awardNewsletterPoints(user?.id ?? null, supabase);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="border-t border-border/30" />

      {/* Most Discussed This Week */}
      <div className="py-10 md:py-14 bg-muted/10">
        <Suspense fallback={null}>
          <MostDiscussedSection excludeIds={[]} />
        </Suspense>
      </div>

      <div className="border-t border-border/30" />

      {/* For You - logged-in only */}
      {user && (
        <>
          <div className="py-14 md:py-20">
            <Suspense fallback={null}>
              <ForYouSection excludeIds={[]} />
            </Suspense>
          </div>
          <div className="border-t border-border/30" />
        </>
      )}

      {/* Recommended Articles */}
      <div className="py-14 md:py-20">
        <Suspense fallback={null}>
          <RecommendedArticles excludeIds={[]} />
        </Suspense>
      </div>

      <div className="border-t border-border/30" />

      {/* Recommended Guides */}
      <div className="py-14 md:py-20 bg-muted/10">
        <Suspense fallback={null}>
          <RecommendedGuides />
        </Suspense>
      </div>

      <div className="border-t border-border/30" />

      {/* Upcoming Events */}
      <div className="py-14 md:py-20">
        <Suspense fallback={null}>
          <UpcomingEvents />
        </Suspense>
      </div>

      {/* Newsletter CTA */}
      <section id="newsletter" className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-4xl font-bold mb-4">Never Miss an AI Breakthrough</h2>
          <p className="text-lg mb-8 opacity-90">Join thousands of professionals getting the AI in Asia Brief every week.</p>
          {!subscribed ? (
            <form onSubmit={handleSubscribe} className="max-w-md mx-auto">
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm bg-background text-foreground border border-border/40 outline-none"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-background/20 hover:bg-background/30 border border-white/20 transition-colors disabled:opacity-60"
                >
                  {submitting ? '...' : 'Subscribe'}
                </button>
              </div>
              <p className="text-xs opacity-75 mt-2">No spam. Unsubscribe anytime.</p>
            </form>
          ) : (
            <div className="bg-background/10 border border-primary-foreground/20 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-lg font-semibold">You're all set!</p>
              <p className="text-sm opacity-90 mt-2">Check your inbox for our latest insights.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function HomeSectionsIsland() {
  return (
    <Providers>
      <BrowserRouter>
        <HomeContent />
      </BrowserRouter>
    </Providers>
  );
}
