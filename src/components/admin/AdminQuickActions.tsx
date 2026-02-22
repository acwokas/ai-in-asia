import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Calendar, Loader2, Wrench, Link2, Activity, Clock, MessageSquare, Mail, TrendingUp 
} from "lucide-react";

interface AdminQuickActionsProps {
  scrapingEvents: boolean;
  refreshingContent: boolean;
  onScrapeEvents: () => void;
  onRefreshContent: () => void;
}

export const AdminQuickActions = ({
  scrapingEvents,
  refreshingContent,
  onScrapeEvents,
  onRefreshContent,
}: AdminQuickActionsProps) => {
  const navigate = useNavigate();

  return (
    <Card className="mb-8 border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="h-5 w-5" />
          Content Tools & Utilities
        </CardTitle>
        <CardDescription>
          Publishing operations, analytics, and content management tools
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Publishing Tools */}
        <div>
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Publishing & Operations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button onClick={() => navigate("/admin/publish-all")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              Publish All Articles
            </Button>
            <Button onClick={() => navigate("/admin/bulk-seo")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              Bulk SEO Generation
            </Button>
            <Button onClick={() => navigate("/admin/calendar")} variant="outline" className="justify-start border-muted-foreground/20 text-foreground hover:bg-muted">
              <Calendar className="h-4 w-4 mr-2" />
              Content Calendar
            </Button>
            <Button onClick={() => navigate("/admin/newsletter-performance")} variant="outline" className="justify-start border-muted-foreground/20 text-foreground hover:bg-muted">
              <TrendingUp className="h-4 w-4 mr-2" />
              Newsletter Analytics
            </Button>
            <Button 
              onClick={onRefreshContent} 
              variant="outline" 
              className="justify-start text-muted-foreground hover:text-foreground"
              disabled={refreshingContent}
            >
              {refreshingContent ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                "Refresh Featured Content"
              )}
            </Button>
            <Button 
              onClick={onScrapeEvents}
              variant="outline" 
              className="justify-start text-muted-foreground hover:text-foreground"
              disabled={scrapingEvents}
            >
              {scrapingEvents ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scraping Events...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Scrape AI Events
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Analytics & Insights */}
        <div>
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Analytics & Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button onClick={() => navigate("/admin/site-analytics")} variant="outline" className="justify-start border-primary/30 text-primary hover:bg-primary/10">
              <BarChart className="h-4 w-4 mr-2" />
              Site Analytics
            </Button>
            <Button onClick={() => navigate("/admin/analytics")} variant="outline" className="justify-start border-primary/30 text-primary hover:bg-primary/10">
              Content Analytics
            </Button>
            <Button onClick={() => navigate("/admin/seo-tools")} variant="outline" className="justify-start border-primary/30 text-primary hover:bg-primary/10">
              SEO Tools
            </Button>
          </div>
        </div>

        {/* Management */}
        <div>
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Content Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button onClick={() => navigate("/admin/newsletter-manager")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              <Mail className="h-4 w-4 mr-2" />
              Newsletter Manager
            </Button>
            <Button onClick={() => navigate("/admin/author-management")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              Author Management
            </Button>
            <Button onClick={() => navigate("/admin/editors-picks")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              Editor's Picks
            </Button>
            <Button onClick={() => navigate("/admin/category-sponsors")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              Category Sponsors
            </Button>
            <Button onClick={() => navigate("/admin/ai-comments")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              <MessageSquare className="h-4 w-4 mr-2" />
              AI Comments
            </Button>
            <Button onClick={() => navigate("/admin/knowledge-engine")} variant="outline" className="justify-start border-muted-foreground/20 text-foreground hover:bg-muted">
              <Wrench className="h-4 w-4 mr-2" />
              Knowledge Engine
            </Button>
            <Button onClick={() => navigate("/admin/guide-editor")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              Create New Guide
            </Button>
            <Button onClick={() => navigate("/admin/guides")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              Manage Guides
            </Button>
            <Button onClick={() => navigate("/admin/internal-links")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              <Link2 className="h-4 w-4 mr-2" />
              Internal Links Manager
            </Button>
            <Button onClick={() => navigate("/admin/fix-broken-links")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              <Link2 className="h-4 w-4 mr-2" />
              Fix Broken Links
            </Button>
            <Button onClick={() => navigate("/admin/link-health")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              <Activity className="h-4 w-4 mr-2" />
              Link Health Monitor
            </Button>
            <Button onClick={() => navigate("/admin/content-freshness")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              <Clock className="h-4 w-4 mr-2" />
              Content Freshness Tracker
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
