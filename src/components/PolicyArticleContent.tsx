import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Shield, Globe, TrendingUp, BookOpen } from "lucide-react";

interface PolicyArticleContentProps {
  article: any; // Using any due to complex Json types from Supabase
}

const PolicyArticleContent = ({ article }: PolicyArticleContentProps) => {
  const policySections = Array.isArray(article.policy_sections) ? article.policy_sections : [];
  const comparisonTables = Array.isArray(article.comparison_tables) ? article.comparison_tables : [];
  const localResources = Array.isArray(article.local_resources) ? article.local_resources : [];

  return (
    <div className="space-y-12">
      {/* Metadata Section - Enhanced */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 p-8 border border-primary/20">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative flex flex-wrap items-center gap-4">
          <Shield className="h-8 w-8 text-primary" />
          <div className="flex flex-wrap gap-3">
            {article.region && (
              <Badge className="text-base px-4 py-2 bg-primary/90 hover:bg-primary shadow-lg" variant="default">
                <Globe className="h-4 w-4 mr-2" />
                {article.region}
              </Badge>
            )}
            {article.country && (
              <Badge className="text-base px-4 py-2 border-2 border-primary/30 bg-background/50 backdrop-blur shadow-md" variant="outline">
                {article.country}
              </Badge>
            )}
            {article.governance_maturity && (
              <Badge className="text-base px-4 py-2 bg-secondary hover:bg-secondary/90 shadow-lg">
                <TrendingUp className="h-4 w-4 mr-2" />
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
                  <CardTitle className="text-3xl font-bold flex items-center gap-3">
                    <BookOpen className="h-7 w-7 text-primary" />
                    {section.heading}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative pt-6 pb-8 px-8">
                  <div className="prose prose-lg max-w-none">
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
                  <CardTitle className="text-3xl font-bold text-primary">{table.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gradient-to-r from-muted to-muted/50">
                          <th className="text-left p-4 font-bold text-lg border-b-2 border-primary/30">Aspect</th>
                          {columnHeaders.map((header: string, colIdx: number) => (
                            <th key={colIdx} className="text-left p-4 font-bold text-lg border-b-2 border-primary/30">
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
                              <td className="p-4 font-semibold text-foreground">{row.aspect || ''}</td>
                              {values.map((value: string, colIdx: number) => (
                                <td key={colIdx} className="p-4 text-foreground/90">{value || '-'}</td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
            <CardTitle className="text-3xl font-bold flex items-center gap-3 text-foreground">
              <ExternalLink className="h-7 w-7 text-accent" />
              Local Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4">
              {localResources.map((resource: any, index: number) => (
                <a
                  key={index}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 p-5 rounded-xl border-2 border-border/50 bg-card/50 backdrop-blur hover:bg-accent/10 hover:border-accent/50 transition-all duration-300 group hover:shadow-lg hover:scale-[1.02]"
                >
                  <div className="p-3 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                    <ExternalLink className="h-6 w-6 text-accent group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg group-hover:text-accent transition-colors mb-1">{resource.title}</h4>
                    {resource.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{resource.description}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PolicyArticleContent;
