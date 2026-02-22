export const isNewsletterSubscribed = () =>
  localStorage.getItem('newsletter-subscribed') === 'true';

export const markNewsletterSubscribed = () =>
  localStorage.setItem('newsletter-subscribed', 'true');

export const NEWSLETTER_POINTS = 25;

export async function awardNewsletterPoints(userId: string | null, supabase: any) {
  if (!userId) return;
  try {
    const { awardPoints } = await import('@/lib/gamification');
    await awardPoints(userId, NEWSLETTER_POINTS, "newsletter signup");

    const { data: achievement } = await supabase
      .from('achievements')
      .select('id')
      .eq('name', 'Newsletter Insider')
      .maybeSingle();

    if (achievement) {
      await supabase.from('user_achievements')
        .upsert({ user_id: userId, achievement_id: achievement.id });
    }
  } catch (e) {
    /* fail silently */
  }
}
