import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ExternalLink, Link2, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LinkResult {
  url: string;
  anchorText: string;
  isValid: boolean;
  status?: number;
  error?: string;
  type: 'internal' | 'external';
}

interface ValidationResponse {
  success: boolean;
  summary: {
    totalLinks: number;
    externalLinks: number;
    internalLinks: number;
    validLinks: number;
    invalidLinks: number;
  };
  results: LinkResult[];
  brokenLinks: LinkResult[];
}

interface LinkValidatorProps {
  content: string | object | any[];
  onValidationComplete?: (hasErrors: boolean, brokenLinks: LinkResult[]) => void;
}

export function LinkValidator({ content, onValidationComplete }: LinkValidatorProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [results, setResults] = useState<ValidationResponse | null>(null);
  const { toast } = useToast();

  const handleValidate = async () => {
    setIsValidating(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-article-links', {
        body: { content, checkExternal: true, checkInternal: false }
      });

      if (error) throw error;

      setResults(data);
      
      const hasErrors = data.brokenLinks?.length > 0;
      onValidationComplete?.(hasErrors, data.brokenLinks || []);

      if (hasErrors) {
        toast({
          title: "Broken Links Found",
          description: `${data.brokenLinks.length} external link(s) are not accessible`,
          variant: "destructive"
        });
      } else if (data.summary.externalLinks === 0) {
        toast({
          title: "No External Links",
          description: "No external links found in this article"
        });
      } else {
        toast({
          title: "All Links Valid",
          description: `${data.summary.validLinks} external link(s) verified successfully`
        });
      }
    } catch (error) {
      console.error("Link validation error:", error);
      toast({
        title: "Validation Failed",
        description: error instanceof Error ? error.message : "Failed to validate links",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Link Validator
            </CardTitle>
            <CardDescription className="text-sm">
              Check external links before publishing
            </CardDescription>
          </div>
          <Button 
            onClick={handleValidate} 
            disabled={isValidating}
            size="sm"
            variant={results?.brokenLinks?.length ? "destructive" : "outline"}
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : results ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-check
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Validate Links
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {results && (
        <CardContent className="pt-0">
          {/* Summary */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {results.summary.externalLinks} external
            </Badge>
            {results.summary.validLinks > 0 && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {results.summary.validLinks} valid
              </Badge>
            )}
            {results.summary.invalidLinks > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {results.summary.invalidLinks} broken
              </Badge>
            )}
          </div>

          {/* Broken Links List */}
          {results.brokenLinks.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">Broken Links:</p>
              <ScrollArea className="h-[150px]">
                <div className="space-y-2 pr-4">
                  {results.brokenLinks.map((link, index) => (
                    <div 
                      key={index}
                      className="p-2 rounded-md bg-destructive/10 border border-destructive/20 text-sm"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-destructive truncate">
                            {link.anchorText}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {link.url}
                          </p>
                          {link.error && (
                            <p className="text-xs text-destructive mt-1">
                              Error: {link.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* All Good Message */}
          {results.brokenLinks.length === 0 && results.summary.externalLinks > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              All external links are accessible
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
