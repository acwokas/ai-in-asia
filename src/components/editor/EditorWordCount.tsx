import { useMemo } from "react";
import { calculateReadingTime } from "@/lib/readingTime";

interface EditorWordCountProps {
  content: string;
  title: string;
}

const EditorWordCount = ({ content, title }: EditorWordCountProps) => {
  const stats = useMemo(() => {
    // Strip markdown/HTML for plain text word & char counts
    const plain = content
      .replace(/<[^>]+>/g, "")
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]+`/g, "")
      .trim();

    const words = plain.split(/\s+/).filter((w) => w.length > 0).length;
    const characters = plain.length;
    const readingTime = calculateReadingTime(content, title);

    return { words, characters, readingTime };
  }, [content, title]);

  return (
    <div className="border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground flex items-center gap-3">
      <span>{stats.words.toLocaleString()} words</span>
      <span>·</span>
      <span>{stats.characters.toLocaleString()} characters</span>
      <span>·</span>
      <span>~{stats.readingTime} min read</span>
    </div>
  );
};

export default EditorWordCount;
