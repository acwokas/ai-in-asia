import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingUp, BookMarked, Award, Zap, User as UserIcon, Upload, Save } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { compressImage } from '@/lib/imageCompression';
import { useToast } from '@/hooks/use-toast';

const INTEREST_OPTIONS = [
  "Artificial Intelligence",
  "Machine Learning",
  "Deep Learning",
  "Robotics",
  "Computer Vision",
  "Natural Language Processing",
  "AI Ethics",
  "AI Research",
  "Business AI",
  "Healthcare AI"
];

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

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("bookmarks");
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
    if (!user) {
      navigate('/auth');
      return;
    }

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
      
      // Clear the pending data first
      sessionStorage.removeItem('pendingProfileData');

      // Wait a moment to ensure session is ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Upload avatar if provided
      let avatarUrl = null;
      if (data.avatarData) {
        try {
          // Convert base64 to blob
          const response = await fetch(data.avatarData);
          const blob = await response.blob();
          
          const compressed = await compressImage(blob as File, {
            maxWidth: 400,
            maxHeight: 400,
            quality: 0.8,
            maxSizeMB: 0.5,
          });

          const fileExt = 'jpg';
          const fileName = `${user.id}-${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('article-images')
            .upload(fileName, compressed, {
              cacheControl: '3600',
              upsert: false
            });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('article-images')
              .getPublicUrl(fileName);
            avatarUrl = publicUrl;
          } else {
            console.error('Avatar upload error:', uploadError);
          }
        } catch (err) {
          console.error('Avatar processing error:', err);
        }
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName,
          last_name: data.lastName || null,
          username: data.firstName || data.email?.split('@')[0],
          company: data.company || null,
          job_title: data.jobTitle || null,
          country: data.country || null,
          interests: data.interests?.length > 0 ? data.interests : null,
          newsletter_subscribed: data.newsletterOptIn,
          ...(avatarUrl && { avatar_url: avatarUrl })
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Profile completion error:', profileError);
        toast({
          title: "Warning",
          description: "Failed to complete profile setup. You can update it manually.",
          variant: "destructive",
        });
        return;
      }

      // Add to newsletter if opted in
      if (data.newsletterOptIn) {
        await supabase
          .from('newsletter_subscribers')
          .insert({ email: data.email, confirmed: true })
          .select();
      }

      // Calculate and award points
      let points = 20; // Base signup points
      if (data.newsletterOptIn) points += 5;
      if (avatarUrl) points += 5;
      if (data.lastName) points += 3;
      if (data.company) points += 5;
      if (data.jobTitle) points += 5;
      if (data.country) points += 3;
      points += (data.interests?.length || 0) * 2;

      await supabase.rpc('award_points', {
        _user_id: user.id,
        _points: points
      });

      // Award achievements
      const { data: digitalPioneer } = await supabase
        .from('achievements')
        .select('id')
        .eq('name', 'Digital Pioneer')
        .single();

      if (digitalPioneer?.id) {
        await supabase
          .from('user_achievements')
          .insert({
            user_id: user.id,
            achievement_id: digitalPioneer.id
          });
      }

      if (points >= 45) {
        const { data: profileMaster } = await supabase
          .from('achievements')
          .select('id')
          .eq('name', 'Profile Master')
          .single();

        if (profileMaster?.id) {
          await supabase
            .from('user_achievements')
            .insert({
              user_id: user.id,
              achievement_id: profileMaster.id
            });
        }
      }

      await supabase.rpc('check_and_award_achievements', {
        _user_id: user.id
      });

      toast({
        title: "Profile Complete! 🎉",
        description: `You earned ${points} points!`,
      });

      // Refresh data
      fetchUserData();
    } catch (error) {
      console.error('Profile completion error:', error);
      sessionStorage.removeItem('pendingProfileData');
    }
  };

  const fetchUserData = async () => {
    if (!user) return;
    
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      setProfile(profileData);
      
      // Set edit state
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

      // Fetch stats
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setStats(statsData);

      // Fetch ALL achievements
      const { data: allAchievementsData } = await supabase
        .from('achievements')
        .select('*')
        .order('points_required', { ascending: true });

      // Fetch user's earned achievements
      const { data: earnedAchievementsData } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', user.id);

      // Map all achievements with earned status
      const earnedMap = new Map(
        earnedAchievementsData?.map(ea => [ea.achievement_id, ea.earned_at]) || []
      );

      setAchievements(allAchievementsData?.map(achievement => ({
        ...achievement,
        earned_at: earnedMap.get(achievement.id)
      })) || []);

      // Fetch bookmarks with article details
      const { data: bookmarksData } = await supabase
        .from('bookmarks')
        .select('*, articles(title, slug, excerpt, featured_image_url, categories:primary_category_id(slug))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      setBookmarks(bookmarksData || []);

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelInfo = (level: string) => {
    const levels = {
      explorer: { name: 'Explorer', color: 'bg-blue-500', next: 'Enthusiast', pointsNeeded: 100 },
      enthusiast: { name: 'Enthusiast', color: 'bg-purple-500', next: 'Expert', pointsNeeded: 500 },
      expert: { name: 'Expert', color: 'bg-orange-500', next: 'Thought Leader', pointsNeeded: 1000 },
      thought_leader: { name: 'Thought Leader', color: 'bg-red-500', next: null, pointsNeeded: null }
    };
    return levels[level as keyof typeof levels] || levels.explorer;
  };

  const handleAchievementClick = (achievement: Achievement) => {
    if (achievement.earned_at) return; // Already earned, do nothing
    
    // Show helpful toast based on achievement type without navigating
    switch (achievement.name) {
      // Reading achievements
      case 'First Steps':
      case 'Knowledge Seeker':
      case 'Dedicated Reader':
      case 'AI Scholar':
      case 'AI Pioneer':
      case 'News Hound':
      case 'Tool Explorer':
        toast({
          title: "Start Reading! 📚",
          description: "Browse our latest AI articles on the homepage to earn this achievement",
        });
        break;
      
      // Streak achievements
      case 'Week Warrior':
      case 'Month Master':
      case 'Early Adopter':
        toast({
          title: "Build Your Streak! 🔥",
          description: "Read articles daily to maintain your reading streak and unlock this badge",
        });
        break;
      
      // Comment achievements
      case 'Conversationalist':
      case 'Comment Champion':
      case 'Conversation Master':
        toast({
          title: "Join the Discussion! 💬",
          description: "Comment on articles to earn this achievement and engage with the community",
        });
        break;
      
      // Bookmark achievements
      case 'First Bookmark':
      case 'Bookmark Collector':
        toast({
          title: "Start Bookmarking! 🔖",
          description: "Save articles you love to your bookmarks to earn this achievement",
        });
        break;
      
      // Sharing achievements
      case 'Social Sharer':
      case 'Social Butterfly':
        toast({
          title: "Share the Knowledge! 📢",
          description: "Share articles on social media to earn this achievement",
        });
        break;
      
      // Profile completion achievements
      case 'Digital Pioneer':
      case 'Profile Master':
        toast({
          title: "Complete Your Profile! ✨",
          description: "Fill in all profile information in Account Settings to earn this badge",
        });
        break;
      
      // Level achievements
      case 'Explorer':
      case 'Enthusiast':
      case 'Expert':
      case 'Thought Leader':
        toast({
          title: "Keep Earning Points! ⚡",
          description: "Read articles and engage with content to level up and unlock this badge",
        });
        break;
      
      // Newsletter achievement
      case 'Newsletter Insider':
        toast({
          title: "Subscribe to Newsletter! 📧",
          description: "Enable newsletter subscription in Account Settings to earn this badge",
        });
        break;
      
      // Regional achievements
      case 'Asia Expert':
        toast({
          title: "Explore All Regions! 🌏",
          description: "Read articles from different Asian countries to earn this achievement",
        });
        break;
      
      default:
        toast({
          title: "Keep Exploring! 🚀",
          description: "Continue using the platform to unlock this achievement",
        });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      // Compress image
      const compressed = await compressImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.8,
        maxSizeMB: 0.5,
      });

      const fileExt = 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(fileName, compressed, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('article-images')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);

      toast({
        title: "Success",
        description: "Avatar updated successfully",
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setEditInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editFirstName,
          last_name: editLastName,
          username: editUsername,
          company: editCompany,
          job_title: editJobTitle,
          country: editCountry,
          interests: editInterests.length > 0 ? editInterests : null,
          newsletter_subscribed: editNewsletter
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        first_name: editFirstName,
        last_name: editLastName,
        username: editUsername,
        company: editCompany,
        job_title: editJobTitle,
        country: editCountry,
        interests: editInterests,
        newsletter_subscribed: editNewsletter
      } : null);

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

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
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Stats Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile?.avatar_url || ''} alt={profile?.username || 'User'} />
                  <AvatarFallback>
                    <UserIcon className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <label 
                  htmlFor="avatar-upload-profile" 
                  className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:bg-primary/90 transition-colors"
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
                    onChange={handleAvatarChange}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">{profile?.first_name || profile?.username || 'User'}</h1>
                <Badge className={`${levelInfo.color} text-white`}>
                  {levelInfo.name}
                </Badge>
              </div>
            </div>
            <Button onClick={handleSignOut} variant="outline">
              Sign Out
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
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
              onClick={() => {
                setActiveTab("achievements");
                setTimeout(() => {
                  tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveTab("achievements");
                  setTimeout(() => {
                    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }
              }}
            >
              <div className="flex items-center gap-3">
                <Award className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-sm text-muted-foreground">Achievements</p>
                  <p className="text-2xl font-bold">
                    {achievements.filter(a => a.earned_at).length}/{achievements.length}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <div ref={tabsRef}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="w-full h-auto flex-wrap md:flex-nowrap justify-start gap-1 overflow-x-auto">
              <TabsTrigger value="bookmarks" className="flex-shrink-0">Bookmarks</TabsTrigger>
              <TabsTrigger value="achievements" className="flex-shrink-0">Achievements</TabsTrigger>
              <TabsTrigger value="stats" className="flex-shrink-0">Reading Stats</TabsTrigger>
              <TabsTrigger value="account" className="flex-shrink-0">Account Settings</TabsTrigger>
            </TabsList>

          <TabsContent value="bookmarks" className="space-y-4">
            {bookmarks.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No bookmarks yet. Start saving articles!</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookmarks.map((bookmark) => {
                  const categorySlug = (bookmark.articles.categories as any)?.slug || 'uncategorized';
                  return (
                  <Card key={bookmark.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <a href={`/${categorySlug}/${bookmark.articles.slug}`}>
                      {bookmark.articles.featured_image_url && (
                        <img 
                          src={bookmark.articles.featured_image_url} 
                          alt={bookmark.articles.title}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold mb-2 line-clamp-2">{bookmark.articles.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{bookmark.articles.excerpt}</p>
                      </div>
                    </a>
                  </Card>
                );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              💡 Click on any locked badge to see how to earn it!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((achievement) => {
                const isEarned = !!achievement.earned_at;
                return (
                  <Card 
                    key={achievement.id} 
                    role={!isEarned ? "button" : undefined}
                    tabIndex={!isEarned ? 0 : undefined}
                    className={`p-6 transition-all ${
                      isEarned 
                        ? 'border-primary/50 shadow-md' 
                        : 'opacity-50 grayscale border-dashed cursor-pointer hover:opacity-70 hover:scale-105 hover:border-primary/30'
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
                        ✓ Earned {new Date(achievement.earned_at).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-xs text-primary font-medium italic">
                        👆 Click to start earning
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="account" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Personal Information</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-firstname">First Name</Label>
                    <Input
                      id="edit-firstname"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-lastname">Last Name</Label>
                    <Input
                      id="edit-lastname"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-email">Email (cannot be changed)</Label>
                  <Input
                    id="edit-email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Professional Information</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-company">Company</Label>
                    <Input
                      id="edit-company"
                      value={editCompany}
                      onChange={(e) => setEditCompany(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-jobtitle">Job Title</Label>
                    <Input
                      id="edit-jobtitle"
                      value={editJobTitle}
                      onChange={(e) => setEditJobTitle(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-country">Country</Label>
                  <Input
                    id="edit-country"
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Content Preferences</h3>
              <div className="space-y-4">
                <div>
                  <Label className="mb-3 block">Interests (Customize your feed)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-md max-h-64 overflow-y-auto">
                    {INTEREST_OPTIONS.map((interest) => (
                      <div key={interest} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-${interest}`}
                          checked={editInterests.includes(interest)}
                          onCheckedChange={() => toggleInterest(interest)}
                        />
                        <label
                          htmlFor={`edit-${interest}`}
                          className="text-sm leading-none cursor-pointer"
                        >
                          {interest}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-4 border-t">
                  <Checkbox
                    id="edit-newsletter"
                    checked={editNewsletter}
                    onCheckedChange={(checked) => setEditNewsletter(checked as boolean)}
                  />
                  <label
                    htmlFor="edit-newsletter"
                    className="text-sm cursor-pointer"
                  >
                    <Link to="/newsletter" className="text-primary hover:underline">Subscribe</Link> to weekly newsletter
                  </label>
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
