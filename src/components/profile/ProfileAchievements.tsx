import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Achievement {
  id: string;
  name: string;
  description: string;
  badge_icon: string;
  earned_at?: string;
  category?: string | null;
  points_required?: number | null;
}

interface ProfileAchievementsProps {
  achievements: Achievement[];
  totalPoints?: number;
  memberSince?: string;
}

const CATEGORIES: { key: string; label: string; icon: string; names: string[] }[] = [
  { key: 'reading', label: 'Reading', icon: '📚', names: ['First Steps', 'Knowledge Seeker', 'Dedicated Reader', 'AI Scholar', 'AI Pioneer', 'News Hound', 'Tool Explorer'] },
  { key: 'streaks', label: 'Streaks', icon: '🔥', names: ['Week Warrior', 'Month Master', 'Early Adopter'] },
  { key: 'community', label: 'Community', icon: '💬', names: ['Conversationalist', 'Comment Champion', 'Conversation Master'] },
  { key: 'engagement', label: 'Engagement', icon: '🔖', names: ['First Bookmark', 'Bookmark Collector', 'Social Sharer', 'Social Butterfly'] },
  { key: 'profile', label: 'Profile', icon: '✨', names: ['Digital Pioneer', 'Profile Master'] },
  { key: 'levels', label: 'Levels', icon: '⚡', names: ['Explorer', 'Enthusiast', 'Expert', 'Thought Leader'] },
  { key: 'special', label: 'Special', icon: '🌏', names: ['Newsletter Insider', 'Asia Expert'] },
];

const HINT_MESSAGES: Record<string, string> = {
  'First Steps': 'Read your first article',
  'Knowledge Seeker': 'Read 10 articles',
  'Dedicated Reader': 'Read 25 articles',
  'AI Scholar': 'Read 50 articles',
  'AI Pioneer': 'Read 100 articles',
  'News Hound': 'Read 20 news articles',
  'Tool Explorer': 'Read 10 tool-related articles',
  'Week Warrior': 'Maintain a 7-day reading streak',
  'Month Master': 'Maintain a 30-day reading streak',
  'Early Adopter': 'Join in the first month',
  'Conversationalist': 'Post your first comment',
  'Comment Champion': 'Post 10 comments',
  'Conversation Master': 'Post 25 comments',
  'First Bookmark': 'Bookmark your first article',
  'Bookmark Collector': 'Bookmark 10 articles',
  'Social Sharer': 'Share your first article',
  'Social Butterfly': 'Share 10 articles',
  'Digital Pioneer': 'Complete your profile',
  'Profile Master': 'Fill in all profile fields',
  'Explorer': 'Reach 0 points',
  'Enthusiast': 'Reach 50 points',
  'Expert': 'Reach 200 points',
  'Thought Leader': 'Reach 500 points',
  'Newsletter Insider': 'Subscribe to the newsletter',
  'Asia Expert': 'Read articles from all regions',
};

const ProfileAchievements = ({ achievements, totalPoints = 0, memberSince }: ProfileAchievementsProps) => {
  const earnedCount = achievements.filter(a => a.earned_at).length;
  const totalCount = achievements.length;
  const progressPercent = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  const earnedRecent = achievements
    .filter(a => a.earned_at)
    .sort((a, b) => new Date(b.earned_at!).getTime() - new Date(a.earned_at!).getTime())
    .slice(0, 5);

  const handleLockedClick = (name: string) => {
    const hint = HINT_MESSAGES[name] || 'Keep exploring to unlock this achievement';
    toast('How to earn this', { description: hint });
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="p-6">
        <div className="flex items-center gap-6">
          <div className="relative h-20 w-20 flex-shrink-0">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                strokeDasharray={`${progressPercent}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold">{earnedCount}</span>
              <span className="text-[10px] text-muted-foreground">/{totalCount}</span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">{earnedCount} of {totalCount} Unlocked</h3>
            <p className="text-sm text-muted-foreground">⚡ {totalPoints} total points earned</p>
            {memberSince && (
              <p className="text-sm text-muted-foreground">Member since {format(new Date(memberSince), 'MMM yyyy')}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Recently Earned */}
      {earnedRecent.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">Recently Earned</h3>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {earnedRecent.map((a) => (
              <div
                key={a.id}
                className="flex-shrink-0 w-28 rounded-lg border border-primary/30 bg-primary/5 p-3 text-center"
              >
                <div className="text-3xl mb-1">{a.badge_icon}</div>
                <p className="text-xs font-medium line-clamp-1">{a.name}</p>
                <p className="text-[10px] text-primary">
                  {format(new Date(a.earned_at!), 'MMM d')}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Categories */}
      <div className="space-y-2">
        {CATEGORIES.map((cat) => {
          const catAchievements = cat.names
            .map(name => achievements.find(a => a.name === name))
            .filter(Boolean) as Achievement[];

          if (catAchievements.length === 0) return null;

          const catEarned = catAchievements.filter(a => a.earned_at).length;

          return (
            <CategorySection
              key={cat.key}
              label={cat.label}
              icon={cat.icon}
              earned={catEarned}
              total={catAchievements.length}
              achievements={catAchievements}
              onLockedClick={handleLockedClick}
            />
          );
        })}
      </div>
    </div>
  );
};

function CategorySection({
  label,
  icon,
  earned,
  total,
  achievements,
  onLockedClick,
}: {
  label: string;
  icon: string;
  earned: number;
  total: number;
  achievements: Achievement[];
  onLockedClick: (name: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-card border hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="font-semibold text-sm">{label}</span>
          <Badge variant="secondary" className="text-xs">{earned}/{total}</Badge>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-2 pt-3">
          {achievements.map((a) => {
            const isEarned = !!a.earned_at;
            return (
              <div
                key={a.id}
                role={!isEarned ? 'button' : undefined}
                tabIndex={!isEarned ? 0 : undefined}
                className={`rounded-lg border p-4 transition-all ${
                  isEarned
                    ? 'border-primary/30 bg-primary/5'
                    : 'opacity-50 grayscale border-dashed cursor-pointer hover:opacity-70'
                }`}
                onClick={() => !isEarned && onLockedClick(a.name)}
                onKeyDown={(e) => {
                  if (!isEarned && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onLockedClick(a.name);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-2xl ${!isEarned && 'opacity-40'}`}>{a.badge_icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${!isEarned && 'text-muted-foreground'}`}>{a.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{a.description}</p>
                    {isEarned ? (
                      <p className="text-[10px] text-primary mt-0.5">✓ Earned {format(new Date(a.earned_at!), 'MMM d, yyyy')}</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground mt-0.5 italic">{HINT_MESSAGES[a.name] || 'Keep exploring'}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default ProfileAchievements;
