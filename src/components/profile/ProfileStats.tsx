import { Card } from '@/components/ui/card';

interface UserStats {
  points: number;
  level: string;
  streak_days: number;
  articles_read: number;
  comments_made: number;
  shares_made: number;
}

interface LevelInfo {
  name: string;
  color: string;
  next: string | null;
  pointsNeeded: number | null;
}

interface ProfileStatsProps {
  stats: UserStats | null;
  levelInfo: LevelInfo;
}

const ProfileStats = ({ stats, levelInfo }: ProfileStatsProps) => {
  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-4">Your Progress</h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span>Articles Read</span>
            <span className="font-semibold">{stats?.articles_read || 0}</span>
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <span>Comments Made</span>
            <span className="font-semibold">{stats?.comments_made || 0}</span>
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <span>Articles Shared</span>
            <span className="font-semibold">{stats?.shares_made || 0}</span>
          </div>
        </div>
        {levelInfo.next && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Next Level: {levelInfo.next}
            </p>
            <p className="text-sm">
              {levelInfo.pointsNeeded! - (stats?.points || 0)} points to go
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProfileStats;
