import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyableCodeBlockProps {
  content: string;
  className?: string;
}

const CopyableCodeBlock = ({ content, className = "" }: CopyableCodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative ${className}`}>
      <pre className="bg-[hsl(220,20%,10%)] text-[hsl(0,0%,88%)] p-4 pr-24 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
        {content}
      </pre>
      <button
        onClick={handleCopy}
        className={`absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
          copied
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-white/10 hover:bg-white/20 text-[hsl(0,0%,65%)]"
        }`}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copy
          </>
        )}
      </button>
    </div>
  );
};

export default CopyableCodeBlock;
