import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Bell, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Singapore', 'Asia/Kolkata', 'Australia/Sydney', 'Pacific/Auckland',
];

interface Prefs {
  id: string;
  breaking_news: boolean;
  followed_authors: boolean;
  followed_categories: boolean;
  daily_digest: boolean;
  weekly_roundup: boolean;
  digest_time: string;
  digest_timezone: string;
}

const ProfileNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ['notification-prefs', user?.id],
    queryFn: async () => {
      // Try to fetch existing
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as Prefs;

      // Upsert default row
      const { data: inserted, error: insertError } = await supabase
        .from('notification_preferences')
        .insert({ user_id: user!.id })
        .select()
        .single();
      if (insertError) throw insertError;
      return inserted as Prefs;
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<Prefs>) => {
      const { error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['notification-prefs', user?.id] });
      const previous = queryClient.getQueryData(['notification-prefs', user?.id]);
      queryClient.setQueryData(['notification-prefs', user?.id], (old: Prefs | undefined) =>
        old ? { ...old, ...updates } : old
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['notification-prefs', user?.id], context?.previous);
      toast.error('Failed to save preference');
    },
    onSuccess: () => {
      toast.success('Preference saved');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-prefs', user?.id] });
    },
  });

  if (isLoading || !prefs) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const toggleItems: { key: keyof Pick<Prefs, 'breaking_news' | 'followed_authors' | 'followed_categories' | 'daily_digest' | 'weekly_roundup'>; label: string; description: string }[] = [
    { key: 'breaking_news', label: 'Breaking News', description: 'Get notified about major AI news and developments' },
    { key: 'followed_authors', label: 'Followed Authors', description: 'New articles from authors you follow' },
    { key: 'followed_categories', label: 'Followed Categories', description: 'New articles in categories you follow' },
    { key: 'daily_digest', label: 'Daily Digest', description: 'A daily summary of top stories' },
    { key: 'weekly_roundup', label: 'Weekly Roundup', description: 'A weekly newsletter with highlights' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>Choose what you'd like to be notified about.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {toggleItems.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between gap-4 min-h-[44px]">
            <div>
              <Label htmlFor={key} className="font-medium">{label}</Label>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Switch
              id={key}
              checked={prefs[key]}
              onCheckedChange={(checked) => mutation.mutate({ [key]: checked })}
            />
          </div>
        ))}

        {prefs.daily_digest && (
          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-medium">Digest Schedule</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="digest_time">Delivery Time</Label>
                <Input
                  id="digest_time"
                  type="time"
                  value={prefs.digest_time}
                  onChange={(e) => mutation.mutate({ digest_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="digest_timezone">Timezone</Label>
                <Select
                  value={prefs.digest_timezone}
                  onValueChange={(value) => mutation.mutate({ digest_timezone: value })}
                >
                  <SelectTrigger id="digest_timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz} value={tz}>{tz.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileNotifications;
