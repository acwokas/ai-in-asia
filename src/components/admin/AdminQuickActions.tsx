import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Calendar, Loader2, Wrench, Link2, Activity, Clock, MessageSquare, Mail 
} from "lucide-react";

interface AdminQuickActionsProps {
  scrapingEvents: boolean;
  fixingDates: boolean;
  refreshingContent: boolean;
  cleaningMarkup: boolean;
  onScrapeEvents: () => void;
  onFixDates: () => void;
  onRefreshContent: () => void;
  onCleanMarkup: () => void;
}

export const AdminQuickActions = ({
  scrapingEvents,
  fixingDates,
  refreshingContent,
  cleaningMarkup,
  onScrapeEvents,
  onFixDates,
  onRefreshContent,
  onCleanMarkup,
}: AdminQuickActionsProps) => {
  const navigate = useNavigate();

  return (
    <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
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
            <Button onClick={() => navigate("/admin/publish-all")} variant="outline" className="justify-start">
              Publish All Articles
            </Button>
            <Button onClick={() => navigate("/admin/bulk-seo")} variant="outline" className="justify-start">
              Bulk SEO Generation
            </Button>
            <Button onClick={() => navigate("/admin/bulk-tldr")} variant="outline" className="justify-start">
              Bulk TLDR Context
            </Button>
            <Button onClick={() => navigate("/admin/calendar")} variant="outline" className="justify-start bg-blue-500/10 border-blue-500 text-blue-700 hover:bg-blue-500/20">
              <Calendar className="h-4 w-4 mr-2" />
              Content Calendar
            </Button>
            <Button 
              onClick={onRefreshContent} 
              variant="outline" 
              className="justify-start bg-green-500/10 border-green-500 text-green-700 hover:bg-green-500/20"
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
              onClick={onCleanMarkup} 
              variant="outline" 
              className="justify-start"
              disabled={cleaningMarkup}
            >
              {cleaningMarkup ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cleaning...
                </>
              ) : (
                "Clean WordPress Markup"
              )}
            </Button>
            <Button 
              onClick={onScrapeEvents}
              variant="outline" 
              className="justify-start"
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
            <Button 
              onClick={onFixDates} 
              variant="outline" 
              className="justify-start bg-amber-500/10 border-amber-500 text-amber-700 hover:bg-amber-500/20"
              disabled={fixingDates}
            >
              {fixingDates ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fixing Dates...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Fix Article Dates from CSV
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Analytics & Insights */}
        <div>
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Analytics & Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button onClick={() => navigate("/admin/site-analytics")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
              <BarChart className="h-4 w-4 mr-2" />
              Site Analytics
            </Button>
            <Button onClick={() => navigate("/admin/analytics")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
              Content Analytics
            </Button>
            <Button onClick={() => navigate("/admin/seo-tools")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
              SEO Tools
            </Button>
          </div>
        </div>

        {/* Management */}
        <div>
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Content Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button onClick={() => navigate("/newsletter-manager")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
              <Mail className="h-4 w-4 mr-2" />
              Newsletter Manager
            </Button>
            <Button onClick={() => navigate("/admin/author-management")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
              Author Management
            </Button>
            <Button onClick={() => navigate("/admin/editors-picks")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
              Editor's Picks
            </Button>
            <Button onClick={() => navigate("/admin/category-sponsors")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
              Category Sponsors
            </Button>
            <Button onClick={() => navigate("/admin/ai-comments")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
              <MessageSquare className="h-4 w-4 mr-2" />
              AI Comments
            </Button>
            <Button onClick={() => navigate("/admin/knowledge-engine")} variant="outline" className="justify-start bg-purple-500/10 border-purple-500 text-purple-700 hover:bg-purple-500/20">
              <Wrench className="h-4 w-4 mr-2" />
              Knowledge Engine
            </Button>
            <Button onClick={() => navigate("/admin/internal-links")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
              <Link2 className="h-4 w-4 mr-2" />
              Internal Links Manager
            </Button>
            <Button onClick={() => navigate("/admin/fix-broken-links")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
              <Link2 className="h-4 w-4 mr-2" />
              Fix Broken Links
            </Button>
            <Button onClick={() => navigate("/admin/link-health")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
              <Activity className="h-4 w-4 mr-2" />
              Link Health Monitor
            </Button>
            <Button onClick={() => navigate("/admin/content-freshness")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
              <Clock className="h-4 w-4 mr-2" />
              Content Freshness Tracker
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
