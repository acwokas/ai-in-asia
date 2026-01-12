import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ExternalLink, Link2, Loader2, RefreshCw, Sparkles, ArrowRight, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SuggestedFix {
  alternativeUrl: string;
  alternativeSource: string;
  rewrittenText: string;
  originalContext: string;
}

interface LinkResult {
  url: string;
  anchorText: string;
  isValid: boolean;
  status?: number;
  error?: string;
  type: 'internal' | 'external';
  suggestedFix?: SuggestedFix;
}

interface ValidationResponse {
  success: boolean;
  summary: {
    totalLinks: number;
    externalLinks: number;
    internalLinks: number;
    validLinks: number;
    invalidLinks: number;
    fixableLinks: number;
    suggestedFixes?: boolean;
  };
  results: LinkResult[];
  brokenLinks: LinkResult[];
  fixableLinks: LinkResult[];
}

interface LinkValidatorProps {
  content: string | object | any[];
  onValidationComplete?: (hasErrors: boolean, brokenLinks: LinkResult[]) => void;
  onApplyFix?: (originalUrl: string, newUrl: string, newText: string) => void;
}

export function LinkValidator({ content, onValidationComplete, onApplyFix }: LinkValidatorProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [results, setResults] = useState<ValidationResponse | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleValidate = async (suggestFixes = false) => {
    setIsValidating(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-article-links', {
        body: { content, checkExternal: true, checkInternal: false, suggestFixes }
      });

      if (error) throw error;

      setResults(data);
      
      const hasErrors = data.brokenLinks?.length > 0;
      onValidationComplete?.(hasErrors, data.brokenLinks || []);

      if (hasErrors) {
        if (suggestFixes && data.fixableLinks?.length > 0) {
          toast({
            title: "Fixes Found",
            description: `Found ${data.fixableLinks.length} alternative source(s) for broken links`,
          });
        } else {
          toast({
            title: "Broken Links Found",
            description: `${data.brokenLinks.length} external link(s) are not accessible`,
            variant: "destructive"
          });
        }
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

  const handleCopyFix = async (link: LinkResult) => {
    if (!link.suggestedFix) return;
    
    const markdownLink = `[${link.suggestedFix.rewrittenText}](${link.suggestedFix.alternativeUrl})`;
    await navigator.clipboard.writeText(markdownLink);
    setCopiedUrl(link.url);
    
    toast({
      title: "Copied!",
      description: "New link copied to clipboard"
    });
    
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleApplyFix = (link: LinkResult) => {
    if (!link.suggestedFix || !onApplyFix) return;
    onApplyFix(link.url, link.suggestedFix.alternativeUrl, link.suggestedFix.rewrittenText);
    
    toast({
      title: "Fix Applied",
      description: `Replaced with ${link.suggestedFix.alternativeSource} link`
    });
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
              Check external links & get AI-suggested fixes
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => handleValidate(false)} 
              disabled={isValidating}
              size="sm"
              variant="outline"
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Quick Check
                </>
              )}
            </Button>
            <Button 
              onClick={() => handleValidate(true)} 
              disabled={isValidating}
              size="sm"
              variant={results?.brokenLinks?.length ? "destructive" : "default"}
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finding fixes...
                </>
              ) : results ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-check + Fix
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Validate & Fix
                </>
              )}
            </Button>
          </div>
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
            {results.summary.fixableLinks > 0 && (
              <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                <Sparkles className="h-3 w-3 mr-1" />
                {results.summary.fixableLinks} fixable
              </Badge>
            )}
          </div>

          {/* Broken Links with Fixes */}
          {results.brokenLinks.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">Broken Links:</p>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-3 pr-4">
                  {results.brokenLinks.map((link, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded-md border ${
                        link.suggestedFix 
                          ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800' 
                          : 'bg-destructive/10 border-destructive/20'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${link.suggestedFix ? 'text-amber-600' : 'text-destructive'}`} />
                        <div className="min-w-0 flex-1 space-y-2">
                          {/* Original broken link */}
                          <div>
                            <p className="font-medium text-sm text-foreground">
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

                          {/* Suggested fix */}
                          {link.suggestedFix && (
                            <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                              <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 mb-1">
                                <Sparkles className="h-3 w-3" />
                                <span className="font-medium">Suggested fix from {link.suggestedFix.alternativeSource}</span>
                              </div>
                              <p className="text-sm font-medium text-foreground">
                                {link.suggestedFix.rewrittenText}
                              </p>
                              <p className="text-xs text-muted-foreground truncate mb-2">
                                {link.suggestedFix.alternativeUrl}
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => handleCopyFix(link)}
                                >
                                  {copiedUrl === link.url ? (
                                    <>
                                      <Check className="h-3 w-3 mr-1" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3 mr-1" />
                                      Copy Link
                                    </>
                                  )}
                                </Button>
                                {onApplyFix && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs bg-amber-600 hover:bg-amber-700"
                                    onClick={() => handleApplyFix(link)}
                                  >
                                    <ArrowRight className="h-3 w-3 mr-1" />
                                    Apply Fix
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  asChild
                                >
                                  <a 
                                    href={link.suggestedFix.alternativeUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Preview
                                  </a>
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* No fix available */}
                          {!link.suggestedFix && results.summary.suggestedFixes && (
                            <p className="text-xs text-muted-foreground italic">
                              No suitable tier-1 alternative found
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
