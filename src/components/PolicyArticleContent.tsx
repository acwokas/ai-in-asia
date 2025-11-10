import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

interface PolicyArticleContentProps {
  article: any; // Using any due to complex Json types from Supabase
}

const PolicyArticleContent = ({ article }: PolicyArticleContentProps) => {
  const policySections = Array.isArray(article.policy_sections) ? article.policy_sections : [];
  const comparisonTables = Array.isArray(article.comparison_tables) ? article.comparison_tables : [];
  const localResources = Array.isArray(article.local_resources) ? article.local_resources : [];

  return (
    <div className="space-y-8">
      {/* Metadata Section */}
      <div className="flex flex-wrap gap-3">
        {article.region && (
          <Badge variant="secondary">{article.region}</Badge>
        )}
        {article.country && (
          <Badge variant="outline">{article.country}</Badge>
        )}
        {article.governance_maturity && (
          <Badge>
            {String(article.governance_maturity).replace(/_/g, ' ')}
          </Badge>
        )}
      </div>

      {/* Policy Sections */}
      {policySections.length > 0 && (
        <div className="space-y-6">
          {policySections.map((section: any, index: number) => {
            const lines = String(section.body).split('\n').filter(line => line.trim());
            const content: JSX.Element[] = [];
            let currentList: { type: 'ul' | 'ol', items: string[] } | null = null;

            const renderList = (list: { type: 'ul' | 'ol', items: string[] }, key: string) => {
              return list.type === 'ul' 
                ? <ul key={key} className="list-disc pl-6 mb-4 space-y-2">{list.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
                : <ol key={key} className="list-decimal pl-6 mb-4 space-y-2">{list.items.map((it, i) => <li key={i}>{it}</li>)}</ol>;
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
                content.push(<p key={`p-${content.length}`} className="mb-4">{trimmedLine}</p>);
              }
            });

            // Don't forget any remaining list
            if (currentList) {
              content.push(renderList(currentList, `list-${content.length}`));
            }

            return (
              <div key={index}>
                <h2 className="text-2xl font-bold mb-4">{section.heading}</h2>
                <div className="prose prose-lg max-w-none">
                  {content}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparison Tables */}
      {comparisonTables.length > 0 && (
        <div className="space-y-6">
          {comparisonTables.map((table: any, index: number) => {
            const columnHeaders = Array.isArray(table.columnHeaders) ? table.columnHeaders : [];
            const rows = Array.isArray(table.rows) ? table.rows : [];
            
            return (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{table.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 bg-muted font-semibold">Aspect</th>
                          {columnHeaders.map((header: string, colIdx: number) => (
                            <th key={colIdx} className="text-left p-3 bg-muted font-semibold">
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
                            <tr key={rowIdx} className="border-b">
                              <td className="p-3 font-medium">{row.aspect || ''}</td>
                              {values.map((value: string, colIdx: number) => (
                                <td key={colIdx} className="p-3">{value || '-'}</td>
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

      {/* Local Resources */}
      {localResources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Local Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {localResources.map((resource: any, index: number) => (
                <a
                  key={index}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 p-3 rounded-lg hover:bg-muted transition-colors group"
                >
                  <ExternalLink className="h-4 w-4 mt-1 text-muted-foreground group-hover:text-primary" />
                  <div>
                    <h4 className="font-medium group-hover:text-primary">{resource.title}</h4>
                    {resource.description && (
                      <p className="text-sm text-muted-foreground">{resource.description}</p>
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
