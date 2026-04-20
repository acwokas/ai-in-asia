import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const REACTIONS = [
  { type: 'insightful', emoji: '💡', label: 'Insightful' },
  { type: 'important',  emoji: '🔥', label: 'Important' },
  { type: 'surprising', emoji: '😮', label: 'Surprising' },
  { type: 'outdated',   emoji: '🤔', label: 'Needs Update' },
] as const;

function getSessionId(): string {
  let id = localStorage.getItem('reaction_session_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('reaction_session_id', id); }
  return id;
}

interface Props {
  articleId: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export default function ArticleReactionsIsland({ articleId, supabaseUrl, supabaseAnonKey }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [animating, setAnimating] = useState<string | null>(null);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
  const sessionId = getSessionId();

  const fetchData = useCallback(async () => {
    const [{ data: all }, { data: mine }] = await Promise.all([
      supabase.from('article_reactions').select('reaction_type').eq('article_id', articleId),
      supabase.from('article_reactions').select('reaction_type').eq('article_id', articleId).eq('session_id', sessionId).limit(1).maybeSingle(),
    ]);
    const map: Record<string, number> = {};
    for (const r of all || []) map[r.reaction_type] = (map[r.reaction_type] || 0) + 1;
    setCounts(map);
    setUserReaction(mine?.reaction_type || null);
  }, [articleId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReact = async (type: string) => {
    setAnimating(type);
    setTimeout(() => setAnimating(null), 600);

    if (userReaction === type) {
      await supabase.from('article_reactions').delete().eq('article_id', articleId).eq('session_id', sessionId);
      setUserReaction(null);
      setCounts(c => ({ ...c, [type]: Math.max((c[type] || 1) - 1, 0) }));
    } else {
      if (userReaction) {
        await supabase.from('article_reactions').delete().eq('article_id', articleId).eq('session_id', sessionId);
      }
      await supabase.from('article_reactions').insert({ article_id: articleId, session_id: sessionId, reaction_type: type });
      setCounts(c => ({
        ...c,
        ...(userReaction ? { [userReaction]: Math.max((c[userReaction] || 1) - 1, 0) } : {}),
        [type]: (c[type] || 0) + 1,
      }));
      setUserReaction(type);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 py-4">
      {REACTIONS.map(r => (
        <button
          key={r.type}
          onClick={() => handleReact(r.type)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            userReaction === r.type
              ? 'bg-primary/10 border-primary/40 text-primary'
              : 'border-border/50 hover:border-border text-muted-foreground hover:text-foreground'
          } ${animating === r.type ? 'scale-110' : ''}`}
          style={{ transition: 'transform 0.15s' }}
        >
          <span className={animating === r.type ? 'animate-bounce' : ''}>{r.emoji}</span>
          <span>{r.label}</span>
          {(counts[r.type] || 0) > 0 && (
            <span className={`ml-0.5 font-semibold ${userReaction === r.type ? 'text-primary' : ''}`}>
              {counts[r.type]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
