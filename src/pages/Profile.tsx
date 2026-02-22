import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Bookmark } from 'lucide-react';
import { useAdminRole } from '@/hooks/useAdminRole';
import { compressImage } from '@/lib/imageCompression';
import SEOHead from '@/components/SEOHead';
import { toast } from 'sonner';
import { awardPoints } from '@/lib/gamification';
import ProfileHeader from '@/components/profile/ProfileHeader';

import ProfileAchievements from '@/components/profile/ProfileAchievements';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileSettings from '@/components/profile/ProfileSettings';
import ProfileAccount from '@/components/profile/ProfileAccount';
import ProfileReadingHistory from '@/components/profile/ProfileReadingHistory';
import ProfileNotifications from '@/components/profile/ProfileNotifications';

interface UserStats {
  points: number;
  level: string;
  streak_days: number;
  articles_read: number;
  comments_made: number;
  shares_made: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  badge_icon: string;
  earned_at?: string;
}

interface ProfileData {
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

const getLevelInfo = (level: string) => {
  const levels = {
    explorer: { name: 'Explorer', color: 'bg-blue-500', next: 'Enthusiast', pointsNeeded: 100 },
    enthusiast: { name: 'Enthusiast', color: 'bg-purple-500', next: 'Expert', pointsNeeded: 500 },
    expert: { name: 'Expert', color: 'bg-orange-500', next: 'Thought Leader', pointsNeeded: 1000 },
    thought_leader: { name: 'Thought Leader', color: 'bg-red-500', next: null, pointsNeeded: null },
  };
  return levels[level as keyof typeof levels] || levels.explorer;
};

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useAdminRole();

  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("reading");
  const tabsRef = useRef<HTMLDivElement>(null);

  // Edit state
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [editNewsletter, setEditNewsletter] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    const loadData = async () => {
      await fetchUserData();
      await completePendingProfile();
    };
    loadData();
  }, [user, navigate]);

  const completePendingProfile = async () => {
    const pendingData = sessionStorage.getItem('pendingProfileData');
    if (!pendingData || !user) return;
    try {
      const data = JSON.parse(pendingData);
      sessionStorage.removeItem('pendingProfileData');
      await new Promise(resolve => setTimeout(resolve, 1000));

      let avatarUrl = null;
      if (data.avatarData) {
        try {
          const response = await fetch(data.avatarData);
          const blob = await response.blob();
          const compressed = await compressImage(blob as File, { maxWidth: 400, maxHeight: 400, quality: 0.8, maxSizeMB: 0.5 });
          const fileName = `${user.id}-${Date.now()}.jpg`;
          const { error: uploadError } = await supabase.storage.from('article-images').upload(fileName, compressed, { cacheControl: '3600', upsert: false });
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('article-images').getPublicUrl(fileName);
            avatarUrl = publicUrl;
          }
        } catch (err) { console.error('Avatar processing error:', err); }
      }

      await supabase.from('profiles').update({
        first_name: data.firstName, last_name: data.lastName || null,
        username: data.firstName || data.email?.split('@')[0],
        company: data.company || null, job_title: data.jobTitle || null,
        country: data.country || null,
        interests: data.interests?.length > 0 ? data.interests : null,
        newsletter_subscribed: data.newsletterOptIn,
        ...(avatarUrl && { avatar_url: avatarUrl })
      }).eq('id', user.id);

      if (data.newsletterOptIn) {
        await supabase.from('newsletter_subscribers').insert({ email: data.email, confirmed: true }).select();
      }

      let points = 20;
      if (data.newsletterOptIn) points += 5;
      if (avatarUrl) points += 5;
      if (data.lastName) points += 3;
      if (data.company) points += 5;
      if (data.jobTitle) points += 5;
      if (data.country) points += 3;
      points += (data.interests?.length || 0) * 2;

      await awardPoints(user.id, points, "profile completion");

      const { data: digitalPioneer } = await supabase.from('achievements').select('id').eq('name', 'Digital Pioneer').single();
      if (digitalPioneer?.id) await supabase.from('user_achievements').insert({ user_id: user.id, achievement_id: digitalPioneer.id });

      if (points >= 45) {
        const { data: profileMaster } = await supabase.from('achievements').select('id').eq('name', 'Profile Master').single();
        if (profileMaster?.id) await supabase.from('user_achievements').insert({ user_id: user.id, achievement_id: profileMaster.id });
      }
      toast("Profile Complete! 🎉", { description: `You earned ${points} points!` });
      fetchUserData();
    } catch (error) {
      console.error('Profile completion error:', error);
      sessionStorage.removeItem('pendingProfileData');
    }
  };

  const fetchUserData = async () => {
    if (!user) return;
    try {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      setProfile(profileData);
      if (profileData) {
        setEditFirstName(profileData.first_name || '');
        setEditLastName(profileData.last_name || '');
        setEditUsername(profileData.username || '');
        setEditCompany(profileData.company || '');
        setEditJobTitle(profileData.job_title || '');
        setEditCountry(profileData.country || '');
        setEditInterests(profileData.interests || []);
        setEditNewsletter(profileData.newsletter_subscribed || false);
      }

      const { data: statsData } = await supabase.from('user_stats').select('*').eq('user_id', user.id).maybeSingle();
      setStats(statsData);

      const { data: allAchievements } = await supabase.from('achievements').select('*').order('points_required', { ascending: true });
      const { data: earnedData } = await supabase.from('user_achievements').select('achievement_id, earned_at').eq('user_id', user.id);
      const earnedMap = new Map(earnedData?.map(ea => [ea.achievement_id, ea.earned_at]) || []);
      setAchievements(allAchievements?.map(a => ({ ...a, earned_at: earnedMap.get(a.id) })) || []);



    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.8, maxSizeMB: 0.5 });
      const fileName = `${user.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('article-images').upload(fileName, compressed, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('article-images').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast("Success", { description: "Avatar updated successfully" });
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error("Error", { description: "Failed to upload avatar" });
    } finally {
      setUploading(false);
    }
  };

  const handleFieldChange = (field: string, value: string | string[] | boolean) => {
    switch (field) {
      case 'firstName': setEditFirstName(value as string); break;
      case 'lastName': setEditLastName(value as string); break;
      case 'username': setEditUsername(value as string); break;
      case 'company': setEditCompany(value as string); break;
      case 'jobTitle': setEditJobTitle(value as string); break;
      case 'country': setEditCountry(value as string); break;
      case 'newsletter': setEditNewsletter(value as boolean); break;
    }
  };

  const handleToggleInterest = (interest: string) => {
    setEditInterests(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        first_name: editFirstName, last_name: editLastName, username: editUsername,
        company: editCompany, job_title: editJobTitle, country: editCountry,
        interests: editInterests.length > 0 ? editInterests : null,
        newsletter_subscribed: editNewsletter,
      }).eq('id', user.id);
      if (error) throw error;
      setProfile(prev => prev ? {
        ...prev, first_name: editFirstName, last_name: editLastName, username: editUsername,
        company: editCompany, job_title: editJobTitle, country: editCountry,
        interests: editInterests, newsletter_subscribed: editNewsletter,
      } : null);
      toast("Success", { description: "Profile updated successfully" });
    } catch (error) {
      console.error('Save error:', error);
      toast.error("Error", { description: "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const levelInfo = getLevelInfo(stats?.level || 'explorer');

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead title="Your Profile" description="Manage your AI in ASIA profile." noIndex={true} />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <ProfileHeader
          profile={profile}
          stats={stats}
          levelInfo={levelInfo}
          isAdmin={isAdmin}
          uploading={uploading}
          achievementCount={{ earned: achievements.filter(a => a.earned_at).length, total: achievements.length }}
          onAvatarChange={handleAvatarChange}
          onSignOut={handleSignOut}
          onAchievementsClick={() => {
            setActiveTab("achievements");
            setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
          }}
        />

        <div className="mb-4">
          <Link to="/saved" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <Bookmark className="h-4 w-4" />
            View your Saved Articles →
          </Link>
        </div>

        <div ref={tabsRef}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="w-full h-auto flex-nowrap justify-start gap-1 overflow-x-auto scrollbar-hide">
              <TabsTrigger value="reading" className="flex-shrink-0">Reading</TabsTrigger>
              <TabsTrigger value="achievements" className="flex-shrink-0">Achievements</TabsTrigger>
              <TabsTrigger value="stats" className="flex-shrink-0">Reading Stats</TabsTrigger>
              <TabsTrigger value="notifications" className="flex-shrink-0">Notifications</TabsTrigger>
              <TabsTrigger value="account" className="flex-shrink-0">Account Settings</TabsTrigger>
              <TabsTrigger value="security" className="flex-shrink-0">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="reading"><ProfileReadingHistory /></TabsContent>
            <TabsContent value="achievements"><ProfileAchievements achievements={achievements} /></TabsContent>
            <TabsContent value="stats"><ProfileStats stats={stats} levelInfo={levelInfo} /></TabsContent>
            <TabsContent value="account">
              <ProfileSettings
                email={user?.email || ''}
                editFirstName={editFirstName}
                editLastName={editLastName}
                editUsername={editUsername}
                editCompany={editCompany}
                editJobTitle={editJobTitle}
                editCountry={editCountry}
                editInterests={editInterests}
                editNewsletter={editNewsletter}
                saving={saving}
                onFieldChange={handleFieldChange}
                onToggleInterest={handleToggleInterest}
                onSave={handleSaveProfile}
              />
            </TabsContent>
            <TabsContent value="notifications"><ProfileNotifications /></TabsContent>
            <TabsContent value="security"><ProfileAccount /></TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
