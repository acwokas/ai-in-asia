import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Shield, Globe, TrendingUp, BookOpen, FileText } from "lucide-react";
import PolicyStatusPanel from "@/components/PolicyStatusPanel";
import PolicyDisclaimer from "@/components/PolicyDisclaimer";

interface PolicyArticleContentProps {
  article: any; // Using any due to complex Json types from Supabase
}

const PolicyArticleContent = ({ article }: PolicyArticleContentProps) => {
  const policySections = Array.isArray(article.policy_sections) ? article.policy_sections : [];
  const comparisonTables = Array.isArray(article.comparison_tables) ? article.comparison_tables : [];
  const localResources = Array.isArray(article.local_resources) ? article.local_resources : [];
  const sources = Array.isArray(article.sources) ? article.sources : [];

  return (
    <div className="space-y-12">
      {/* Policy Status Panel */}
      <PolicyStatusPanel
        policyStatus={article.policy_status}
        effectiveDate={article.policy_effective_date}
        appliesTo={article.policy_applies_to}
        regulatoryImpact={article.policy_regulatory_impact}
      />

      {/* Metadata Section - Enhanced */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 p-4 md:p-8 border border-primary/20">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative flex flex-wrap items-center gap-3 md:gap-4">
          <Shield className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          <div className="flex flex-wrap gap-2 md:gap-3">
            {article.region && (
              <Badge className="text-sm md:text-base px-3 py-1.5 md:px-4 md:py-2 bg-primary/90 hover:bg-primary shadow-lg" variant="default">
                <Globe className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                {article.region}
              </Badge>
            )}
            {article.country && (
              <Badge className="text-sm md:text-base px-3 py-1.5 md:px-4 md:py-2 border-2 border-primary/30 bg-background/50 backdrop-blur shadow-md" variant="outline">
                {article.country}
              </Badge>
            )}
            {article.governance_maturity && (
              <Badge className="text-sm md:text-base px-3 py-1.5 md:px-4 md:py-2 bg-secondary hover:bg-secondary/90 shadow-lg">
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                {String(article.governance_maturity).replace(/_/g, ' ')}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Policy Sections - Enhanced */}
      {policySections.length > 0 && (
        <div className="space-y-8">
          {policySections.map((section: any, index: number) => {
            const lines = String(section.body).split('\n').filter(line => line.trim());
            const content: JSX.Element[] = [];
            let currentList: { type: 'ul' | 'ol', items: string[] } | null = null;

            const renderList = (list: { type: 'ul' | 'ol', items: string[] }, key: string) => {
              return list.type === 'ul' 
                ? <ul key={key} className="list-disc pl-6 mb-4 space-y-3 text-foreground/90">{list.items.map((it, i) => <li key={i} className="leading-relaxed">{it}</li>)}</ul>
                : <ol key={key} className="list-decimal pl-6 mb-4 space-y-3 text-foreground/90">{list.items.map((it, i) => <li key={i} className="leading-relaxed">{it}</li>)}</ol>;
            };

            lines.forEach((line: string) => {
              const trimmedLine = line.trim();
              
              // Check for bullet points
              if (trimmedLine.startsWith('- ')) {
                const item = trimmedLine.substring(2).trim();
                if (currentList?.type === 'ul') {
                  currentList.items.push(item);
                } else {
                  if (currentList) {
                    content.push(renderList(currentList, `list-${content.length}`));
                  }
                  currentList = { type: 'ul', items: [item] };
                }
              }
              // Check for numbered lists
              else if (/^\d+\.\s/.test(trimmedLine)) {
                const item = trimmedLine.replace(/^\d+\.\s/, '').trim();
                if (currentList?.type === 'ol') {
                  currentList.items.push(item);
                } else {
                  if (currentList) {
                    content.push(renderList(currentList, `list-${content.length}`));
                  }
                  currentList = { type: 'ol', items: [item] };
                }
              }
              // Regular paragraph
              else {
                if (currentList) {
                  content.push(renderList(currentList, `list-${content.length}`));
                  currentList = null;
                }
                content.push(<p key={`p-${content.length}`} className="mb-4 leading-relaxed text-foreground/90">{trimmedLine}</p>);
              }
            });

            // Don't forget any remaining list
            if (currentList) {
              content.push(renderList(currentList, `list-${content.length}`));
            }

            return (
              <Card key={index} className="overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardHeader className="relative bg-gradient-to-r from-muted/50 to-muted/30 border-b-2 border-border/50">
                  <CardTitle className="text-xl md:text-3xl font-bold flex items-center gap-2 md:gap-3">
                    <BookOpen className="h-5 w-5 md:h-7 md:w-7 text-primary flex-shrink-0" />
                    <span className="break-words">{section.heading}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative pt-4 pb-6 px-4 md:pt-6 md:pb-8 md:px-8">
                  <div className="prose prose-sm md:prose-lg max-w-none">
                    {content}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Comparison Tables - Enhanced */}
      {comparisonTables.length > 0 && (
        <div className="space-y-8">
          {comparisonTables.map((table: any, index: number) => {
            const columnHeaders = Array.isArray(table.columnHeaders) ? table.columnHeaders : [];
            const rows = Array.isArray(table.rows) ? table.rows : [];
            
            return (
              <Card key={index} className="overflow-hidden border-2 border-primary/20 shadow-2xl">
                <CardHeader className="bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/10 border-b-2 border-primary/30">
                  <CardTitle className="text-xl md:text-3xl font-bold text-primary">{table.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <p className="text-xs text-muted-foreground mb-2 px-4 pt-3 md:hidden">
                    ← Scroll to see full table →
                  </p>
                  <div className="relative">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-gradient-to-r from-muted to-muted/50">
                            <th className="text-left p-2 md:p-4 font-bold text-sm md:text-lg border-b-2 border-primary/30">Aspect</th>
                            {columnHeaders.map((header: string, colIdx: number) => (
                              <th key={colIdx} className="text-left p-2 md:p-4 font-bold text-sm md:text-lg border-b-2 border-primary/30">
                                {header || `Column ${colIdx + 1}`}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row: any, rowIdx: number) => {
                            if (!row || typeof row !== 'object') return null;
                            const values = Array.isArray(row.values) ? row.values : [];
                            
                            return (
                              <tr key={rowIdx} className="border-b hover:bg-muted/30 transition-colors">
                                <td className="p-2 md:p-4 font-semibold text-sm md:text-base text-foreground">{row.aspect || ''}</td>
                                {values.map((value: string, colIdx: number) => (
                                  <td key={colIdx} className="p-2 md:p-4 text-sm md:text-base text-foreground/90">{value || '-'}</td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent pointer-events-none md:hidden" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Local Resources - Enhanced */}
      {localResources.length > 0 && (
        <Card className="overflow-hidden border-2 border-accent/30 shadow-2xl bg-gradient-to-br from-background via-accent/5 to-background">
          <CardHeader className="bg-gradient-to-r from-accent/20 via-accent/10 to-secondary/10 border-b-2 border-accent/30">
            <CardTitle className="text-xl md:text-3xl font-bold flex items-center gap-2 md:gap-3 text-foreground">
              <ExternalLink className="h-5 w-5 md:h-7 md:w-7 text-accent flex-shrink-0" />
              Local Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid gap-3 md:gap-4">
              {localResources.map((resource: any, index: number) => (
                <a
                  key={index}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 md:gap-4 p-4 md:p-5 rounded-xl border-2 border-border/50 bg-card/50 backdrop-blur hover:bg-accent/10 hover:border-accent/50 transition-all duration-300 group hover:shadow-lg hover:scale-[1.02]"
                >
                  <div className="p-2 md:p-3 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors flex-shrink-0">
                    <ExternalLink className="h-5 w-5 md:h-6 md:w-6 text-accent group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-base md:text-lg group-hover:text-accent transition-colors mb-1 break-words">{resource.title}</h4>
                    {resource.description && (
                      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed break-words">{resource.description}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sources & References */}
      {sources.length > 0 && (
        <Card className="overflow-hidden border border-border/50">
          <CardHeader className="bg-muted/30 border-b border-border/50">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              Sources & References
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <ol className="space-y-3 list-decimal list-inside">
              {sources.map((source: any, index: number) => (
                <li key={index} className="text-sm text-muted-foreground leading-relaxed">
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {source.title}
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  ) : (
                    <span className="text-foreground">{source.title}</span>
                  )}
                  {source.description && (
                    <span className="block mt-0.5 text-xs text-muted-foreground/80">{source.description}</span>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Policy Disclaimer and Footer */}
      <PolicyDisclaimer lastEditorialReview={article.last_editorial_review} />
    </div>
  );
};

export default PolicyArticleContent;
