import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, Calendar, Zap } from "lucide-react";
import { format } from "date-fns";

export const AutomationStatus = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["automation-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_automation_log")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "running":
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "running":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 border-l-4 border-l-primary">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Daily News Scraping</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Runs daily at 9:00 AM UTC
              </p>
              <Badge variant="outline" className="text-xs">
                Cron: 0 9 * * *
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-accent">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Zap className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Weekly Newsletter Generation</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Runs every Friday at 10:00 AM UTC
              </p>
              <Badge variant="outline" className="text-xs">
                Cron: 0 10 * * 5
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Recent Automation Runs</h3>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading automation logs...
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No automation runs recorded yet
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(log.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{log.job_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.started_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={getStatusColor(log.status)}>
                    {log.status}
                  </Badge>
                  {log.completed_at && (
                    <p className="text-xs text-muted-foreground">
                      {Math.round(
                        (new Date(log.completed_at).getTime() -
                          new Date(log.started_at).getTime()) /
                          1000
                      )}s
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold mb-2">Automation is Active</h4>
            <p className="text-sm text-muted-foreground">
              The newsletter system automatically scrapes news daily and generates 
              newsletters every Friday. You can still manually trigger these operations 
              from the respective tabs if needed.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};