import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface Achievement {
  id: string;
  name: string;
  description: string;
  badge_icon: string;
  earned_at?: string;
}

interface ProfileAchievementsProps {
  achievements: Achievement[];
}

const handleAchievementClick = (achievement: Achievement) => {
  if (achievement.earned_at) return;

  const messages: Record<string, { title: string; description: string }> = {
    'First Steps': { title: "Start Reading! 📚", description: "Browse our latest AI articles on the homepage to earn this achievement" },
    'Knowledge Seeker': { title: "Start Reading! 📚", description: "Browse our latest AI articles on the homepage to earn this achievement" },
    'Dedicated Reader': { title: "Start Reading! 📚", description: "Browse our latest AI articles on the homepage to earn this achievement" },
    'AI Scholar': { title: "Start Reading! 📚", description: "Browse our latest AI articles on the homepage to earn this achievement" },
    'AI Pioneer': { title: "Start Reading! 📚", description: "Browse our latest AI articles on the homepage to earn this achievement" },
    'News Hound': { title: "Start Reading! 📚", description: "Browse our latest AI articles on the homepage to earn this achievement" },
    'Tool Explorer': { title: "Start Reading! 📚", description: "Browse our latest AI articles on the homepage to earn this achievement" },
    'Week Warrior': { title: "Build Your Streak! 🔥", description: "Read articles daily to maintain your reading streak and unlock this badge" },
    'Month Master': { title: "Build Your Streak! 🔥", description: "Read articles daily to maintain your reading streak and unlock this badge" },
    'Early Adopter': { title: "Build Your Streak! 🔥", description: "Read articles daily to maintain your reading streak and unlock this badge" },
    'Conversationalist': { title: "Join the Discussion! 💬", description: "Comment on articles to earn this achievement and engage with the community" },
    'Comment Champion': { title: "Join the Discussion! 💬", description: "Comment on articles to earn this achievement and engage with the community" },
    'Conversation Master': { title: "Join the Discussion! 💬", description: "Comment on articles to earn this achievement and engage with the community" },
    'First Bookmark': { title: "Start Bookmarking! 🔖", description: "Save articles you love to your bookmarks to earn this achievement" },
    'Bookmark Collector': { title: "Start Bookmarking! 🔖", description: "Save articles you love to your bookmarks to earn this achievement" },
    'Social Sharer': { title: "Share the Knowledge! 📢", description: "Share articles on social media to earn this achievement" },
    'Social Butterfly': { title: "Share the Knowledge! 📢", description: "Share articles on social media to earn this achievement" },
    'Digital Pioneer': { title: "Complete Your Profile! ✨", description: "Fill in all profile information in Account Settings to earn this badge" },
    'Profile Master': { title: "Complete Your Profile! ✨", description: "Fill in all profile information in Account Settings to earn this badge" },
    'Explorer': { title: "Keep Earning Points! ⚡", description: "Read articles and engage with content to level up and unlock this badge" },
    'Enthusiast': { title: "Keep Earning Points! ⚡", description: "Read articles and engage with content to level up and unlock this badge" },
    'Expert': { title: "Keep Earning Points! ⚡", description: "Read articles and engage with content to level up and unlock this badge" },
    'Thought Leader': { title: "Keep Earning Points! ⚡", description: "Read articles and engage with content to level up and unlock this badge" },
    'Newsletter Insider': { title: "Subscribe to Newsletter! 📧", description: "Enable newsletter subscription in Account Settings to earn this badge" },
    'Asia Expert': { title: "Explore All Regions! 🌏", description: "Read articles from different Asian countries to earn this achievement" },
  };

  const msg = messages[achievement.name] || { title: "Keep Exploring! 🚀", description: "Continue using the platform to unlock this achievement" };
  toast(msg.title, { description: msg.description });
};

const ProfileAchievements = ({ achievements }: ProfileAchievementsProps) => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-4">
        💡 Click on any locked badge to see how to earn it!
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {achievements.map((achievement) => {
          const isEarned = !!achievement.earned_at;
          return (
            <div
              key={achievement.id}
              role={!isEarned ? "button" : undefined}
              tabIndex={!isEarned ? 0 : undefined}
              className={`rounded-lg border p-6 transition-all ${
                isEarned
                  ? 'border-primary/50 shadow-md bg-card'
                  : 'opacity-50 grayscale border-dashed cursor-pointer hover:opacity-70 hover:scale-105 hover:border-primary/30 bg-card'
              }`}
              onClick={() => !isEarned && handleAchievementClick(achievement)}
              onKeyDown={(e) => {
                if (!isEarned && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleAchievementClick(achievement);
                }
              }}
            >
              <div className={`text-4xl mb-3 ${!isEarned && 'opacity-40'}`}>
                {achievement.badge_icon}
              </div>
              <h3 className={`font-semibold text-lg mb-2 ${!isEarned && 'text-muted-foreground'}`}>
                {achievement.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {achievement.description}
              </p>
              {isEarned ? (
                <p className="text-xs text-primary font-medium">
                  ✓ Earned {new Date(achievement.earned_at!).toLocaleDateString()}
                </p>
              ) : (
                <p className="text-xs text-primary font-medium italic">
                  👆 Click to start earning
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileAchievements;
