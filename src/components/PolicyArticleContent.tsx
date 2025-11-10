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
          {policySections.map((section: any, index: number) => (
            <div key={index}>
              <h2 className="text-2xl font-bold mb-4">{section.heading}</h2>
              <div className="prose prose-lg max-w-none">
                {String(section.body).split('\n').map((paragraph: string, pIndex: number) => (
                  paragraph.trim() && <p key={pIndex} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comparison Tables */}
      {comparisonTables.length > 0 && (
        <div className="space-y-6">
          {comparisonTables.map((table: any, index: number) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{table.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        {Array.isArray(table.rows) && table.rows[0] && Object.keys(table.rows[0]).map((key: string, i: number) => (
                          <th key={i} className="text-left p-3 font-semibold">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(table.rows) && table.rows.map((row: any, rowIndex: number) => (
                        <tr key={rowIndex} className="border-b">
                          {Object.values(row).map((value: any, cellIndex: number) => (
                            <td key={cellIndex} className="p-3">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
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
