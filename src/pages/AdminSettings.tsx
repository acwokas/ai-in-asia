import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  BarChart3,
  Mail,
  Users,
  Megaphone,
  ExternalLink,
  Settings,
  Save,
} from "lucide-react";

export default function AdminSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Google Ads state
  const [googleAds, setGoogleAds] = useState({ enabled: true, client_id: "" });
  const [savingAds, setSavingAds] = useState(false);

  // Newsletter Popup state
  const [newsletter, setNewsletter] = useState({ enabled: true, delay: 5000, frequency: "once_per_session" });
  const [savingNewsletter, setSavingNewsletter] = useState(false);

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*");
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      const ga = settings.find((s: any) => s.setting_key === "google_ads");
      const nl = settings.find((s: any) => s.setting_key === "newsletter_popup");
      if (ga?.setting_value) {
        const v = ga.setting_value as any;
        setGoogleAds({ enabled: v.enabled ?? true, client_id: v.client_id ?? "" });
      }
      if (nl?.setting_value) {
        const v = nl.setting_value as any;
        setNewsletter({ enabled: v.enabled ?? true, delay: v.delay ?? 5000, frequency: v.frequency ?? "once_per_session" });
      }
    }
  }, [settings]);

  const handleSaveGoogleAds = async () => {
    setSavingAds(true);
    try {
      const { error } = await supabase.from("site_settings").upsert(
        { setting_key: "google_ads", setting_value: googleAds as any, updated_by: user?.id },
        { onConflict: "setting_key" }
      );
      if (error) throw error;
      toast("Google Ads settings saved");
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    } catch (error: any) {
      toast.error("Error", { description: error.message });
    } finally {
      setSavingAds(false);
    }
  };

  const handleSaveNewsletter = async () => {
    setSavingNewsletter(true);
    try {
      const { error } = await supabase.from("site_settings").upsert(
        { setting_key: "newsletter_popup", setting_value: newsletter as any, updated_by: user?.id },
        { onConflict: "setting_key" }
      );
      if (error) throw error;
      toast("Newsletter popup settings saved");
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    } catch (error: any) {
      toast.error("Error", { description: error.message });
    } finally {
      setSavingNewsletter(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6" /> Settings</h1>
        <p className="text-sm text-muted-foreground">Manage site-wide configuration</p>
      </div>

      {/* Google Ads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><BarChart3 className="h-5 w-5" /> Google Ads</CardTitle>
          <CardDescription>Configure Google AdSense integration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="ads-toggle">Enable Google Ads</Label>
            <Switch id="ads-toggle" checked={googleAds.enabled} onCheckedChange={v => setGoogleAds(prev => ({ ...prev, enabled: v }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ads-client">Client ID</Label>
            <Input id="ads-client" placeholder="ca-pub-XXXXXXXXXX" value={googleAds.client_id} onChange={e => setGoogleAds(prev => ({ ...prev, client_id: e.target.value }))} />
          </div>
          <Button onClick={handleSaveGoogleAds} disabled={savingAds} size="sm">
            {savingAds ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Save
          </Button>
        </CardContent>
      </Card>

      {/* Newsletter Popup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Mail className="h-5 w-5" /> Newsletter Popup</CardTitle>
          <CardDescription>Control the newsletter signup popup behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="nl-toggle">Enable Popup</Label>
            <Switch id="nl-toggle" checked={newsletter.enabled} onCheckedChange={v => setNewsletter(prev => ({ ...prev, enabled: v }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nl-delay">Delay (ms)</Label>
            <Input id="nl-delay" type="number" min={0} step={1000} value={newsletter.delay} onChange={e => setNewsletter(prev => ({ ...prev, delay: parseInt(e.target.value) || 0 }))} />
            <p className="text-xs text-muted-foreground">Time in milliseconds before the popup appears (e.g. 5000 = 5 seconds)</p>
          </div>
          <div className="space-y-1.5">
            <Label>Frequency</Label>
            <Select value={newsletter.frequency} onValueChange={v => setNewsletter(prev => ({ ...prev, frequency: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once_per_session">Once per session</SelectItem>
                <SelectItem value="once_per_day">Once per day</SelectItem>
                <SelectItem value="once_per_week">Once per week</SelectItem>
                <SelectItem value="always">Every visit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSaveNewsletter} disabled={savingNewsletter} size="sm">
            {savingNewsletter ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Save
          </Button>
        </CardContent>
      </Card>

      {/* Author Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" /> Author Management</CardTitle>
          <CardDescription>Manage article authors and their profiles</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link to="/admin/author-management">
              Open Author Management <ExternalLink className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Category Sponsors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Megaphone className="h-5 w-5" /> Category Sponsors</CardTitle>
          <CardDescription>Manage sponsor placements on category pages</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link to="/admin/category-sponsors">
              Open Sponsor Manager <ExternalLink className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Redirects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><ExternalLink className="h-5 w-5" /> Redirects</CardTitle>
          <CardDescription>Manage URL redirects for moved or renamed content</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link to="/redirects">
              Open Redirects Manager <ExternalLink className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
