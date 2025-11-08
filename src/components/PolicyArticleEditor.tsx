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
  rows: {
    aspect: string;
    country1: string;
    country2: string;
    country3: string;
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
  onRegionChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onGovernanceMaturityChange: (value: string) => void;
  onPolicySectionsChange: (value: PolicySection[]) => void;
  onComparisonTablesChange: (value: ComparisonTable[]) => void;
  onLocalResourcesChange: (value: LocalResource[]) => void;
  onTopicTagsChange: (value: string[]) => void;
  availableRegions: string[];
  availableTopicTags: string[];
}

const DEFAULT_SECTIONS = [
  { heading: "Quick Overview", body: "" },
  { heading: "What's Changing", body: "" },
  { heading: "Who's Affected", body: "" },
  { heading: "Core Principles", body: "" },
  { heading: "What It Means for Business", body: "" },
  { heading: "How It Compares", body: "" },
  { heading: "What to Watch Next", body: "" },
];

export const PolicyArticleEditor = ({
  region,
  country,
  governanceMaturity,
  policySections,
  comparisonTables,
  localResources,
  topicTags,
  onRegionChange,
  onCountryChange,
  onGovernanceMaturityChange,
  onPolicySectionsChange,
  onComparisonTablesChange,
  onLocalResourcesChange,
  onTopicTagsChange,
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
        rows: [{ aspect: "", country1: "", country2: "", country3: "" }],
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
    newTables[tableIndex].rows.push({ aspect: "", country1: "", country2: "", country3: "" });
    onComparisonTablesChange(newTables);
  };

  const handleRemoveComparisonRow = (tableIndex: number, rowIndex: number) => {
    const newTables = [...comparisonTables];
    newTables[tableIndex].rows = newTables[tableIndex].rows.filter((_, i) => i !== rowIndex);
    onComparisonTablesChange(newTables);
  };

  const handleComparisonRowChange = (
    tableIndex: number,
    rowIndex: number,
    field: 'aspect' | 'country1' | 'country2' | 'country3',
    value: string
  ) => {
    const newTables = [...comparisonTables];
    newTables[tableIndex].rows[rowIndex][field] = value;
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
                {availableRegions?.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </SelectItem>
                ))}
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

          <div>
            <Label>Topic Tags</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableTopicTags?.map((tag) => (
                <Button
                  key={tag}
                  type="button"
                  variant={topicTags.includes(tag) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTopicTagToggle(tag)}
                >
                  {tag}
                </Button>
              ))}
            </div>
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
          <CardDescription>Compare up to 3 countries per table</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {comparisonTables.map((table, tableIndex) => (
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

              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground">
                  <div>Aspect</div>
                  <div>Country 1</div>
                  <div>Country 2</div>
                  <div>Country 3</div>
                </div>

                {table.rows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex items-start gap-2">
                    <div className="grid grid-cols-4 gap-2 flex-1">
                      <Input
                        value={row.aspect}
                        onChange={(e) => handleComparisonRowChange(tableIndex, rowIndex, 'aspect', e.target.value)}
                        placeholder="Aspect..."
                      />
                      <Input
                        value={row.country1}
                        onChange={(e) => handleComparisonRowChange(tableIndex, rowIndex, 'country1', e.target.value)}
                        placeholder="Value..."
                      />
                      <Input
                        value={row.country2}
                        onChange={(e) => handleComparisonRowChange(tableIndex, rowIndex, 'country2', e.target.value)}
                        placeholder="Value..."
                      />
                      <Input
                        value={row.country3}
                        onChange={(e) => handleComparisonRowChange(tableIndex, rowIndex, 'country3', e.target.value)}
                        placeholder="Value..."
                      />
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
                ))}

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
          ))}

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
