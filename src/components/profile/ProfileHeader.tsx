import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, TrendingUp, BookMarked, Award, Zap, User as UserIcon, Upload, Settings } from 'lucide-react';

interface UserStats {
  points: number;
  level: string;
  streak_days: number;
  articles_read: number;
  comments_made: number;
  shares_made: number;
}

interface Profile {
  username: string;
  avatar_url: string;
  first_name: string;
  last_name: string;
  company: string;
  job_title: string;
  country: string;
  interests: string[];
  newsletter_subscribed: boolean;
}

interface LevelInfo {
  name: string;
  color: string;
  next: string | null;
  pointsNeeded: number | null;
}

interface ProfileHeaderProps {
  profile: Profile | null;
  stats: UserStats | null;
  levelInfo: LevelInfo;
  isAdmin: boolean;
  uploading: boolean;
  achievementCount: { earned: number; total: number };
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSignOut: () => void;
  onAchievementsClick: () => void;
}

const ProfileHeader = ({
  profile,
  stats,
  levelInfo,
  isAdmin,
  uploading,
  achievementCount,
  onAvatarChange,
  onSignOut,
  onAchievementsClick,
}: ProfileHeaderProps) => {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url || ''} alt={profile?.username || 'User'} />
              <AvatarFallback>
                <UserIcon className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <label
              htmlFor="avatar-upload-profile"
              className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer hover:bg-primary/90 transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
              title="Change avatar"
            >
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              <Input
                id="avatar-upload-profile"
                type="file"
                accept="image/*"
                onChange={onAvatarChange}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-4xl font-bold mb-2">{profile?.first_name || profile?.username || 'User'}</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <Badge className={`${levelInfo.color} text-white`}>
                {levelInfo.name}
              </Badge>
              {isAdmin && (
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin">
                    <Settings className="h-4 w-4 mr-1" />
                    Admin
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
        <Button onClick={onSignOut} variant="outline" className="w-full sm:w-auto min-h-[44px]">
          Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Points</p>
              <p className="text-2xl font-bold">{stats?.points || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Streak</p>
              <p className="text-2xl font-bold">{stats?.streak_days || 0} days</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <BookMarked className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Articles Read</p>
              <p className="text-2xl font-bold">{stats?.articles_read || 0}</p>
            </div>
          </div>
        </Card>

        <Card
          className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={onAchievementsClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onAchievementsClick();
            }
          }}
        >
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8 text-accent" />
            <div>
              <p className="text-sm text-muted-foreground">Achievements</p>
              <p className="text-2xl font-bold">
                {achievementCount.earned}/{achievementCount.total}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProfileHeader;
