import { Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { Separator } from "@/components/ui/separator";

interface EditorNoteContentProps {
  article: {
    title: string;
    content: any;
    published_at: string | null;
  };
  renderContent: (content: any) => React.ReactNode;
}

const EditorNoteContent = ({ article, renderContent }: EditorNoteContentProps) => {
  const formattedDate = article.published_at 
    ? new Date(article.published_at).toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })
    : null;

  return (
    <div className="editor-note-content">
      {/* Distinctive Header */}
      <div className="mb-8 pb-6 border-b-2 border-primary/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-8 bg-primary rounded-full" />
          <span className="text-sm font-medium tracking-wide uppercase text-primary">
            Editor's Note
          </span>
        </div>
        
        <p className="text-sm text-muted-foreground">
          By <span className="font-medium text-foreground">AI in ASIA</span>
          {formattedDate && (
            <>
              <span className="mx-2">·</span>
              {formattedDate}
            </>
          )}
        </p>
      </div>

      {/* Main Content */}
      <div className="prose prose-lg dark:prose-invert max-w-none">
        {renderContent(article.content)}
      </div>

      {/* Footer Section */}
      <Separator className="my-8" />
      
      <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Related coverage on AIinASIA explores how these developments affect businesses, 
          platforms, and adoption across the region.{" "}
          <Link 
            to="/category/regulation" 
            className="text-primary hover:underline font-medium"
          >
            View our policy and regulation coverage
          </Link>.
        </p>
      </div>

      {/* Disclaimer */}
      <p className="mt-6 text-xs text-muted-foreground italic">
        This overview is provided for general informational purposes only and does not 
        constitute legal advice. Regulatory frameworks may evolve, and readers should 
        consult official government sources or legal counsel where appropriate.
      </p>
    </div>
  );
};

export default EditorNoteContent;
