import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface PolicySection {
  heading: string;
  body: string;
}

interface ComparisonTable {
  title: string;
  columnHeaders: string[];
  rows: {
    aspect: string;
    values: string[];
  }[];
}

interface LocalResource {
  title: string;
  url: string;
}

interface PolicyArticleEditorProps {
  region: string;
  country: string;
  governanceMaturity: string;
  policySections: PolicySection[];
  comparisonTables: ComparisonTable[];
  localResources: LocalResource[];
  topicTags: string[];
  policyStatus: string;
  policyEffectiveDate: string;
  policyAppliesTo: string;
  policyRegulatoryImpact: string;
  lastEditorialReview: string;
  onRegionChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onGovernanceMaturityChange: (value: string) => void;
  onPolicySectionsChange: (value: PolicySection[]) => void;
  onComparisonTablesChange: (value: ComparisonTable[]) => void;
  onLocalResourcesChange: (value: LocalResource[]) => void;
  onTopicTagsChange: (value: string[]) => void;
  onPolicyStatusChange: (value: string) => void;
  onPolicyEffectiveDateChange: (value: string) => void;
  onPolicyAppliesToChange: (value: string) => void;
  onPolicyRegulatoryImpactChange: (value: string) => void;
  onLastEditorialReviewChange: (value: string) => void;
  availableRegions: string[];
  availableTopicTags: string[];
}

const DEFAULT_SECTIONS = [
  { heading: "Quick Overview", body: "" },
  { heading: "What's Changing", body: "- [Add key change]\n- [Add key change]\n- [Add key change]" },
  { heading: "Who's Affected", body: "- [Add affected group]\n- [Add affected group]\n- [Add affected group]" },
  { heading: "Core Principles", body: "1. [Add principle]\n2. [Add principle]\n3. [Add principle]" },
  { heading: "What It Means for Business", body: "" },
  { heading: "How It Compares", body: "" },
  { heading: "What to Watch Next", body: "- [Add point to watch]\n- [Add point to watch]\n- [Add point to watch]" },
];

export const PolicyArticleEditor = ({
  region,
  country,
  governanceMaturity,
  policySections,
  comparisonTables,
  localResources,
  topicTags,
  policyStatus,
  policyEffectiveDate,
  policyAppliesTo,
  policyRegulatoryImpact,
  lastEditorialReview,
  onRegionChange,
  onCountryChange,
  onGovernanceMaturityChange,
  onPolicySectionsChange,
  onComparisonTablesChange,
  onLocalResourcesChange,
  onTopicTagsChange,
  onPolicyStatusChange,
  onPolicyEffectiveDateChange,
  onPolicyAppliesToChange,
  onPolicyRegulatoryImpactChange,
  onLastEditorialReviewChange,
  availableRegions,
  availableTopicTags,
}: PolicyArticleEditorProps) => {
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);

  const handleAddSection = () => {
    onPolicySectionsChange([...policySections, { heading: "", body: "" }]);
  };

  const handleRemoveSection = (index: number) => {
    onPolicySectionsChange(policySections.filter((_, i) => i !== index));
  };

  const handleSectionChange = (index: number, field: 'heading' | 'body', value: string) => {
    const newSections = [...policySections];
    newSections[index][field] = value;
    onPolicySectionsChange(newSections);
  };

  const handleLoadDefaultSections = () => {
    onPolicySectionsChange(DEFAULT_SECTIONS);
  };

  const handleAddComparisonTable = () => {
    onComparisonTablesChange([
      ...comparisonTables,
      {
        title: "",
        columnHeaders: ["Country 1", "Country 2", "Country 3"],
        rows: [{ aspect: "", values: ["", "", ""] }],
      },
    ]);
  };

  const handleRemoveComparisonTable = (tableIndex: number) => {
    onComparisonTablesChange(comparisonTables.filter((_, i) => i !== tableIndex));
  };

  const handleComparisonTableTitleChange = (tableIndex: number, value: string) => {
    const newTables = [...comparisonTables];
    newTables[tableIndex].title = value;
    onComparisonTablesChange(newTables);
  };

  const handleAddComparisonRow = (tableIndex: number) => {
    const newTables = [...comparisonTables];
    const columnCount = newTables[tableIndex].columnHeaders.length;
    newTables[tableIndex].rows.push({ 
      aspect: "", 
      values: Array(columnCount).fill("") 
    });
    onComparisonTablesChange(newTables);
  };

  const handleRemoveComparisonRow = (tableIndex: number, rowIndex: number) => {
    const newTables = [...comparisonTables];
    newTables[tableIndex].rows = newTables[tableIndex].rows.filter((_, i) => i !== rowIndex);
    onComparisonTablesChange(newTables);
  };

  const handleAddResource = () => {
    onLocalResourcesChange([...localResources, { title: "", url: "" }]);
  };

  const handleRemoveResource = (index: number) => {
    onLocalResourcesChange(localResources.filter((_, i) => i !== index));
  };

  const handleResourceChange = (index: number, field: 'title' | 'url', value: string) => {
    const newResources = [...localResources];
    newResources[index][field] = value;
    onLocalResourcesChange(newResources);
  };

  const handleTopicTagToggle = (tag: string) => {
    if (topicTags.includes(tag)) {
      onTopicTagsChange(topicTags.filter((t) => t !== tag));
    } else {
      onTopicTagsChange([...topicTags, tag]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Policy Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Policy Metadata</CardTitle>
          <CardDescription>Geographic and governance classification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="region">Region</Label>
            <Select value={region} onValueChange={onRegionChange}>
              <SelectTrigger id="region">
                <SelectValue placeholder="Select region..." />
              </SelectTrigger>
              <SelectContent>
                {availableRegions && Array.isArray(availableRegions) && availableRegions.length > 0 ? (
                  availableRegions.map((r) => {
                    if (typeof r !== 'string') return null;
                    return (
                      <SelectItem key={r} value={r}>
                        {r.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </SelectItem>
                    );
                  })
                ) : (
                  <SelectItem value="" disabled>Loading regions...</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={country}
              onChange={(e) => onCountryChange(e.target.value)}
              placeholder="e.g., Singapore, Japan, Australia"
            />
          </div>

          <div>
            <Label htmlFor="governance-maturity">Governance Maturity Level</Label>
            <Select value={governanceMaturity} onValueChange={onGovernanceMaturityChange}>
              <SelectTrigger id="governance-maturity">
                <SelectValue placeholder="Select maturity level..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="binding_law">Binding Law Enforced</SelectItem>
                <SelectItem value="legislative_draft">Legislative Draft</SelectItem>
                <SelectItem value="voluntary_framework">Voluntary Framework</SelectItem>
                <SelectItem value="emerging">Emerging</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              This controls the color coding on the interactive map
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Policy Status Panel Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Policy Status Panel</CardTitle>
          <CardDescription>Displayed at the top of the policy article page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="policy-status">Policy Status</Label>
              <Select value={policyStatus} onValueChange={onPolicyStatusChange}>
                <SelectTrigger id="policy-status">
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="proposed">Proposed</SelectItem>
                  <SelectItem value="enacted">Enacted</SelectItem>
                  <SelectItem value="in_force">In force</SelectItem>
                  <SelectItem value="under_review">Under review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="policy-effective-date">Effective Date</Label>
              <Input
                id="policy-effective-date"
                value={policyEffectiveDate}
                onChange={(e) => onPolicyEffectiveDateChange(e.target.value)}
                placeholder="e.g., January 2025 or TBC"
              />
            </div>

            <div>
              <Label htmlFor="policy-applies-to">Applies To</Label>
              <Select value={policyAppliesTo} onValueChange={onPolicyAppliesToChange}>
                <SelectTrigger id="policy-applies-to">
                  <SelectValue placeholder="Select scope..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commercial_ai">Commercial AI</SelectItem>
                  <SelectItem value="public_sector_ai">Public sector AI</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="policy-regulatory-impact">Regulatory Impact</Label>
              <Select value={policyRegulatoryImpact} onValueChange={onPolicyRegulatoryImpactChange}>
                <SelectTrigger id="policy-regulatory-impact">
                  <SelectValue placeholder="Select impact level..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="last-editorial-review">Last Editorial Review</Label>
            <Input
              id="last-editorial-review"
              type="date"
              value={lastEditorialReview}
              onChange={(e) => onLastEditorialReviewChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Date of last editorial review, displayed at the bottom of the page
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Topic Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Topic Tags</CardTitle>
          <CardDescription>Select relevant policy topics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {availableTopicTags && Array.isArray(availableTopicTags) && availableTopicTags.length > 0 ? (
              availableTopicTags.map((tag) => {
                if (typeof tag !== 'string') return null;
                return (
                  <Button
                    key={tag}
                    type="button"
                    variant={topicTags.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTopicTagToggle(tag)}
                  >
                    {tag}
                  </Button>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">Loading topic tags...</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Policy Sections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Content Sections</CardTitle>
              <CardDescription>Flexible, reorderable sections for policy content</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleLoadDefaultSections}>
              Load Default Sections
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {policySections.map((section, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="cursor-move mt-2"
                >
                  <GripVertical className="h-4 w-4" />
                </Button>
                <div className="flex-1 space-y-3">
                  <Input
                    value={section.heading}
                    onChange={(e) => handleSectionChange(index, 'heading', e.target.value)}
                    placeholder="Section heading..."
                  />
                  <Textarea
                    value={section.body}
                    onChange={(e) => handleSectionChange(index, 'body', e.target.value)}
                    placeholder="Section content (supports markdown)..."
                    rows={4}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveSection(index)}
                  className="mt-2"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={handleAddSection} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </CardContent>
      </Card>

      {/* Comparison Tables */}
      <Card>
        <CardHeader>
          <CardTitle>Comparison Tables</CardTitle>
          <CardDescription>Add multiple columns to compare countries/regions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {comparisonTables.map((table, tableIndex) => {
            // Ensure table has proper structure
            if (!table || typeof table !== 'object') return null;
            const columnHeaders = Array.isArray(table.columnHeaders) ? table.columnHeaders : [];
            const rows = Array.isArray(table.rows) ? table.rows : [];
            
            return (
            <div key={tableIndex} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Input
                  value={table.title}
                  onChange={(e) => handleComparisonTableTitleChange(tableIndex, e.target.value)}
                  placeholder="Comparison table title..."
                  className="flex-1 mr-2"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveComparisonTable(tableIndex)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              {/* Column Headers */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Column Headers</Label>
                <div className="flex gap-2 items-center flex-wrap">
                  {columnHeaders.map((header, colIndex) => (
                    <div key={colIndex} className="flex items-center gap-1">
                      <Input
                        value={header}
                        onChange={(e) => {
                          const newTables = [...comparisonTables];
                          newTables[tableIndex].columnHeaders[colIndex] = e.target.value;
                          onComparisonTablesChange(newTables);
                        }}
                        placeholder={`Column ${colIndex + 1}`}
                        className="w-32"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newTables = [...comparisonTables];
                          newTables[tableIndex].columnHeaders.splice(colIndex, 1);
                          newTables[tableIndex].rows.forEach(row => {
                            row.values.splice(colIndex, 1);
                          });
                          onComparisonTablesChange(newTables);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newTables = [...comparisonTables];
                      newTables[tableIndex].columnHeaders.push('');
                      newTables[tableIndex].rows.forEach(row => {
                        row.values.push('');
                      });
                      onComparisonTablesChange(newTables);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Data Rows */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Comparison Data</Label>
                <div className="space-y-2">
                  <div className={`grid gap-2 text-xs font-medium text-muted-foreground`} style={{ gridTemplateColumns: `150px repeat(${columnHeaders.length}, 1fr)` }}>
                    <div>Aspect</div>
                    {columnHeaders.map((header, idx) => (
                      <div key={idx}>{header || `Column ${idx + 1}`}</div>
                    ))}
                  </div>

                  {rows.map((row, rowIndex) => {
                    if (!row || typeof row !== 'object') return null;
                    const rowValues = Array.isArray(row.values) ? row.values : [];
                    
                    return (
                    <div key={rowIndex} className="flex items-start gap-2">
                      <div className={`grid gap-2 flex-1`} style={{ gridTemplateColumns: `150px repeat(${columnHeaders.length}, 1fr)` }}>
                        <Input
                          value={row.aspect || ''}
                          onChange={(e) => {
                            const newTables = [...comparisonTables];
                            newTables[tableIndex].rows[rowIndex].aspect = e.target.value;
                            onComparisonTablesChange(newTables);
                          }}
                          placeholder="Aspect..."
                        />
                        {rowValues.map((value, colIndex) => (
                          <Input
                            key={colIndex}
                            value={value}
                            onChange={(e) => {
                              const newTables = [...comparisonTables];
                              newTables[tableIndex].rows[rowIndex].values[colIndex] = e.target.value;
                              onComparisonTablesChange(newTables);
                            }}
                            placeholder="Value..."
                          />
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveComparisonRow(tableIndex, rowIndex)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddComparisonRow(tableIndex)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Row
                  </Button>
                </div>
              </div>
            </div>
            );
          })}

          <Button type="button" variant="outline" onClick={handleAddComparisonTable} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Comparison Table
          </Button>
        </CardContent>
      </Card>

      {/* Local Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Local Resources</CardTitle>
          <CardDescription>Links to official documents and resources</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {localResources.map((resource, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="grid grid-cols-2 gap-2 flex-1">
                <Input
                  value={resource.title}
                  onChange={(e) => handleResourceChange(index, 'title', e.target.value)}
                  placeholder="Resource title..."
                />
                <Input
                  value={resource.url}
                  onChange={(e) => handleResourceChange(index, 'url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveResource(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={handleAddResource} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Resource
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
