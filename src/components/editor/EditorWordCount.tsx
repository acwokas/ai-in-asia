import { useMemo } from "react";
import { calculateReadingTime } from "@/lib/readingTime";

interface EditorWordCountProps {
  content: string;
  title: string;
}

const countSyllables = (word: string): number => {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
};

const calculateReadability = (text: string): { score: number; label: string; color: string } => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((count, word) => count + countSyllables(word), 0);

  if (words.length === 0 || sentences.length === 0) return { score: 0, label: 'N/A', color: 'text-muted-foreground' };

  const score = 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  if (clamped >= 60) return { score: clamped, label: 'Easy to read', color: 'text-green-500' };
  if (clamped >= 40) return { score: clamped, label: 'Moderate', color: 'text-yellow-500' };
  return { score: clamped, label: 'Complex', color: 'text-red-500' };
};

const EditorWordCount = ({ content, title }: EditorWordCountProps) => {
  const stats = useMemo(() => {
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
    const readability = calculateReadability(plain);

    return { words, characters, readingTime, readability };
  }, [content, title]);

  return (
    <div className="border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground flex items-center gap-3">
      <span>{stats.words.toLocaleString()} words</span>
      <span>·</span>
      <span>{stats.characters.toLocaleString()} characters</span>
      <span>·</span>
      <span>~{stats.readingTime} min read</span>
      <span>·</span>
      <span>
        Readability: {stats.readability.score}{' '}
        <span className={stats.readability.color}>({stats.readability.label})</span>
      </span>
    </div>
  );
};

export default EditorWordCount;
