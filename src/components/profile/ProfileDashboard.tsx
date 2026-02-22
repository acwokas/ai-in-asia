import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, MessageSquare, Share2, Bookmark, Flame } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface Achievement {
  id: string;
  name: string;
  description: string;
  badge_icon: string;
  earned_at?: string;
  points_required?: number | null;
}

interface UserStats {
  points: number;
  level: string;
  streak_days: number;
  articles_read: number;
  comments_made: number;
  shares_made: number;
}

interface ProfileDashboardProps {
  stats: UserStats | null;
  achievements: Achievement[];
  onSwitchToAchievements: () => void;
}

const LEVELS = [
  { name: 'Explorer', min: 0, max: 49, color: 'bg-blue-500' },
  { name: 'Enthusiast', min: 50, max: 199, color: 'bg-purple-500' },
  { name: 'Expert', min: 200, max: 499, color: 'bg-orange-500' },
  { name: 'Thought Leader', min: 500, max: Infinity, color: 'bg-red-500' },
];

const ProfileDashboard = ({ stats, achievements, onSwitchToAchievements }: ProfileDashboardProps) => {
  const { user } = useAuth();
  const pts = stats?.points || 0;
  const current = LEVELS.find(l => pts >= l.min && pts <= l.max) || LEVELS[0];
  const next = LEVELS[LEVELS.indexOf(current) + 1];
  const progress = next ? Math.min(100, ((pts - current.min) / (next.min - current.min)) * 100) : 100;

  const earned = achievements.filter(a => a.earned_at).sort((a, b) => new Date(b.earned_at!).getTime() - new Date(a.earned_at!).getTime());
  const unearned = achievements.filter(a => !a.earned_at).sort((a, b) => (a.points_required || 0) - (b.points_required || 0));

  // Fill to 4 slots: earned first, then closest unearned
  const recentSlots = [...earned.slice(0, 4)];
  if (recentSlots.length < 4) {
    recentSlots.push(...unearned.slice(0, 4 - recentSlots.length));
  }

  const { data: readingHistory } = useQuery({
    queryKey: ['dashboard-reading-history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reading_history')
        .select('id, read_at, completed, article_id, articles(title, slug, featured_image_url, primary_category_id, categories:primary_category_id(name, slug))')
        .eq('user_id', user!.id)
        .order('read_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: bookmarkCount } = useQuery({
    queryKey: ['dashboard-bookmark-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('bookmarks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      {/* Level Progress */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-3">Level Progress</h3>
        <div className="flex items-center gap-3 mb-2">
          <Badge className={`${current.color} text-white`}>{current.name}</Badge>
          {next ? (
            <span className="text-sm text-muted-foreground">
              {pts}/{next.min} points to <span className="font-medium text-foreground">{next.name}</span>
            </span>
          ) : (
            <span className="text-sm text-primary font-medium">✨ Max level reached!</span>
          )}
        </div>
        <Progress value={progress} className="h-2" />
      </Card>

      {/* Recent Achievements */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Recent Achievements</h3>
          <button onClick={onSwitchToAchievements} className="text-sm text-primary hover:underline">
            View all achievements →
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {recentSlots.map((a) => {
            const isEarned = !!a.earned_at;
            return (
              <div
                key={a.id}
                className={`rounded-lg border p-3 text-center ${isEarned ? 'border-primary/30 bg-primary/5' : 'opacity-50 grayscale border-dashed'}`}
              >
                <div className="text-2xl mb-1">{a.badge_icon}</div>
                <p className="text-xs font-medium line-clamp-1">{a.name}</p>
                {isEarned ? (
                  <p className="text-[10px] text-primary mt-0.5">
                    ✓ {format(new Date(a.earned_at!), 'MMM d')}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {a.points_required ? `${a.points_required - pts} pts away` : 'Locked'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Continue Reading */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Continue Reading</h3>
          <Link to="/saved" className="text-sm text-primary hover:underline">View full history →</Link>
        </div>
        {(!readingHistory || readingHistory.length === 0) ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No reading history yet. Start exploring!</p>
        ) : (
          <div className="divide-y divide-border">
            {readingHistory.map((item: any) => {
              const article = item.articles as any;
              const category = article?.categories as any;
              return (
                <Link
                  key={item.id}
                  to={`/${category?.slug || 'article'}/${article?.slug}`}
                  className="flex gap-3 py-2.5 hover:bg-muted/30 rounded transition-colors"
                >
                  {article?.featured_image_url ? (
                    <img src={article.featured_image_url} alt="" className="w-12 h-9 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-9 rounded bg-muted flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{article?.title || 'Untitled'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {category?.name && <Badge variant="secondary" className="text-[10px] py-0">{category.name}</Badge>}
                      <span className="text-[10px] text-muted-foreground">{format(new Date(item.read_at), 'MMM d')}</span>
                    </div>
                  </div>
                  {item.completed ? (
                    <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-1" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-1" />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      {/* Your Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-3">Your Activity</h3>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" />
            {stats?.comments_made || 0} comments
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Share2 className="h-4 w-4" />
            {stats?.shares_made || 0} shares
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Bookmark className="h-4 w-4" />
            {bookmarkCount || 0} bookmarks
          </span>
        </div>
        {(stats?.streak_days || 0) > 0 ? (
          <p className="text-sm mt-3">
            <Flame className="h-4 w-4 inline text-orange-500 mr-1" />
            {stats!.streak_days} day streak — keep it going!
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-3">Start a new streak by reading today</p>
        )}
      </Card>
    </div>
  );
};

export default ProfileDashboard;
