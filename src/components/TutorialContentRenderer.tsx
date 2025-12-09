import { useState } from "react";
import { Copy, Check, Wrench, FileText, Lightbulb, Target, Sparkles, Users, ListChecks, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface InlineBlock {
  type: 'prompt' | 'template' | 'tools' | 'use-cases' | 'tips' | 'examples' | 'text';
  heading?: string;
  content: string;
}

// Detect inline structured elements from markdown-style headers
const parseInlineBlocks = (text: string): InlineBlock[] => {
  if (!text) return [];
  
  const blocks: InlineBlock[] = [];
  
  // Split by markdown headers (## or **Header:**)
  const sections = text.split(/(?=^##\s+|\*\*[^*]+:\*\*)/gm);
  
  sections.forEach(section => {
    const trimmed = section.trim();
    if (!trimmed) return;
    
    // Check for ## Header pattern
    const h2Match = trimmed.match(/^##\s+(.+?)(?:\n|$)/);
    // Check for **Header:** pattern
    const boldMatch = trimmed.match(/^\*\*([^*]+):\*\*/);
    
    if (h2Match || boldMatch) {
      const heading = (h2Match?.[1] || boldMatch?.[1] || '').trim().toLowerCase();
      const content = trimmed
        .replace(/^##\s+.+?\n?/, '')
        .replace(/^\*\*[^*]+:\*\*\s*/, '')
        .trim();
      
      // Classify the block type
      if (heading.includes('prompt') || heading.includes('try this')) {
        blocks.push({ type: 'prompt', heading: h2Match?.[1] || boldMatch?.[1], content });
      } else if (heading.includes('template')) {
        blocks.push({ type: 'template', heading: h2Match?.[1] || boldMatch?.[1], content });
      } else if (heading.includes('tool') || heading.includes('recommended')) {
        blocks.push({ type: 'tools', heading: h2Match?.[1] || boldMatch?.[1], content });
      } else if (heading.includes('use case') || heading.includes('use-case') || heading.includes('application')) {
        blocks.push({ type: 'use-cases', heading: h2Match?.[1] || boldMatch?.[1], content });
      } else if (heading.includes('tip') || heading.includes('best practice')) {
        blocks.push({ type: 'tips', heading: h2Match?.[1] || boldMatch?.[1], content });
      } else if (heading.includes('example')) {
        blocks.push({ type: 'examples', heading: h2Match?.[1] || boldMatch?.[1], content });
      } else {
        // Generic text section with a heading
        blocks.push({ type: 'text', heading: h2Match?.[1] || boldMatch?.[1], content });
      }
    } else {
      // Plain text without a header
      blocks.push({ type: 'text', content: trimmed });
    }
  });
  
  return blocks;
};

// Get icon for block type
const getBlockIcon = (type: InlineBlock['type']) => {
  switch (type) {
    case 'prompt': return Sparkles;
    case 'template': return FileText;
    case 'tools': return Wrench;
    case 'use-cases': return Users;
    case 'tips': return Lightbulb;
    case 'examples': return Target;
    default: return ListChecks;
  }
};

// Parse list items from content
const parseListItems = (content: string): string[] => {
  const lines = content.split(/\n/).filter(l => l.trim());
  return lines.map(line => 
    line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '').trim()
  ).filter(Boolean);
};

// Check if section should render as numbered steps
const shouldShowAsSteps = (sectionHeading: string | undefined): boolean => {
  if (!sectionHeading) return false;
  const heading = sectionHeading.toLowerCase();
  return heading.includes('step') || 
         heading.includes('expanded') || 
         heading.includes('deeper') || 
         heading.includes('explanation');
};

// Format step content with numbered badges - handles "Step X:" patterns in text
const formatStepContent = (text: string) => {
  // Match "Step X:" patterns (with optional space variations)
  const stepPattern = /Step\s+(\d+)[.:]\s*/gi;
  
  // Check if content has step patterns
  const hasSteps = stepPattern.test(text);
  stepPattern.lastIndex = 0; // Reset regex
  
  if (!hasSteps) {
    // No steps found, render as paragraphs
    // Split by double newlines OR periods followed by space and capital letter for paragraph breaks
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    return (
      <div className="space-y-6">
        {paragraphs.map((paragraph, i) => (
          <p key={i} className="text-foreground/85 leading-relaxed">
            {paragraph.trim()}
          </p>
        ))}
      </div>
    );
  }
  
  // Split by "Step X:" pattern, keeping the step numbers
  const parts = text.split(/Step\s+(\d+)[.:]\s*/gi);
  
  // Extract steps
  const steps: { number: string; content: string }[] = [];
  
  // First part is leading content (before first step)
  const leadingContent = parts[0]?.trim();
  
  // Remaining parts alternate: step number, content, step number, content...
  for (let i = 1; i < parts.length; i += 2) {
    const number = parts[i];
    const content = parts[i + 1]?.trim() || '';
    if (number && content) {
      steps.push({ number, content });
    }
  }
  
  return (
    <div className="space-y-6">
      {leadingContent && (
        <p className="text-foreground/85 leading-relaxed mb-4">{leadingContent}</p>
      )}
      <div className="space-y-5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-4">
            <Badge 
              variant="outline" 
              className="flex-shrink-0 h-7 w-7 rounded-full p-0 flex items-center justify-center font-semibold bg-primary/10 text-primary border-primary/30"
            >
              {step.number}
            </Badge>
            <div className="flex-1 pt-0.5">
              <p className="text-foreground/85 leading-relaxed">
                {step.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Format prose content (non-step sections) - creates paragraph breaks for readability
const formatProseContent = (text: string) => {
  // First try double newlines
  let paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  
  // If no double newlines found and text is long, create paragraph breaks
  // Break on sentences that end with period followed by capital letter patterns
  if (paragraphs.length === 1 && text.length > 400) {
    // Split into sentences, then group every 2-3 sentences into paragraphs
    const sentences = text.split(/(?<=\.)\s+(?=[A-Z])/).filter(s => s.trim());
    paragraphs = [];
    
    for (let i = 0; i < sentences.length; i += 3) {
      const chunk = sentences.slice(i, i + 3).join(' ');
      if (chunk.trim()) {
        paragraphs.push(chunk.trim());
      }
    }
  }
  
  // If still just one paragraph, just render it
  if (paragraphs.length === 0) {
    paragraphs = [text];
  }
  
  return (
    <div className="space-y-6">
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="text-foreground/85 leading-relaxed">
          {paragraph.trim()}
        </p>
      ))}
    </div>
  );
};

interface CopyablePromptBlockProps {
  heading?: string;
  content: string;
  index: number;
}

const CopyablePromptBlock = ({ heading, content, index }: CopyablePromptBlockProps) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Prompt copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy prompt");
    }
  };
  
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-4 w-4 text-primary" />
          {heading || 'Try This Prompt'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
            <code className="whitespace-pre-wrap break-words text-foreground">
              {content}
            </code>
          </pre>
          <Button
            variant="outline"
            size="sm"
            className="absolute right-2 top-2"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="mr-1 h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1 h-3 w-3" />
                Copy
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface SimpleBlockProps {
  type: InlineBlock['type'];
  heading?: string;
  content: string;
}

const SimpleBlock = ({ type, heading, content }: SimpleBlockProps) => {
  const Icon = getBlockIcon(type);
  const items = parseListItems(content);
  const isListContent = items.length > 1 && content.includes('\n');
  
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-4 w-4 text-primary" />
          {heading || type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isListContent ? (
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/60" />
                <span className="text-foreground/85">{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-foreground/85 leading-relaxed whitespace-pre-line">{content}</p>
        )}
      </CardContent>
    </Card>
  );
};

interface TutorialContentRendererProps {
  content: string;
  sectionHeading?: string;
}

export const TutorialContentRenderer = ({ content, sectionHeading }: TutorialContentRendererProps) => {
  const blocks = parseInlineBlocks(content);
  
  // Check if this should be rendered as numbered steps based on section heading
  const isStepsSection = shouldShowAsSteps(sectionHeading);
  
  // If no structured blocks found (no markdown headers), use the appropriate formatter
  if (blocks.length === 0 || (blocks.length === 1 && blocks[0].type === 'text' && !blocks[0].heading)) {
    if (isStepsSection) {
      return formatStepContent(content);
    }
    return formatProseContent(content);
  }
  
  return (
    <div className="space-y-6">
      {blocks.map((block, i) => {
        if (block.type === 'prompt') {
          return <CopyablePromptBlock key={i} heading={block.heading} content={block.content} index={i} />;
        }
        
        if (block.type === 'text' && !block.heading) {
          // Plain text without header - check if it should be steps
          if (isStepsSection) {
            return <div key={i}>{formatStepContent(block.content)}</div>;
          }
          return <div key={i}>{formatProseContent(block.content)}</div>;
        }
        
        // Structured blocks (templates, tools, use-cases, tips, examples, or text with heading)
        return <SimpleBlock key={i} type={block.type} heading={block.heading} content={block.content} />;
      })}
    </div>
  );
};

export default TutorialContentRenderer;
