import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Comment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  replies?: Comment[];
}

interface Props {
  articleId: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export default function CommentsIsland({ articleId, supabaseUrl, supabaseAnonKey }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('comments_public')
        .select('id, author_name, content, created_at, parent_id')
        .eq('article_id', articleId)
        .eq('approved', true)
        .order('created_at', { ascending: true });

      const flat = data || [];
      const roots: Comment[] = [];
      const byId: Record<string, Comment> = {};
      for (const c of flat) { byId[c.id] = { ...c, replies: [] }; }
      for (const c of flat) {
        if (c.parent_id && byId[c.parent_id]) {
          byId[c.parent_id].replies!.push(byId[c.id]);
        } else {
          roots.push(byId[c.id]);
        }
      }
      setComments(roots);
      setLoading(false);
    }
    load();
  }, [articleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !text.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from('comments').insert({
        article_id: articleId,
        author_name: name.trim(),
        author_email: email.trim() || null,
        content: text.trim(),
        approved: false,
      });
      setSubmitted(true);
      setName(''); setEmail(''); setText('');
    } finally {
      setSubmitting(false);
    }
  };

  const count = comments.length + comments.reduce((s, c) => s + (c.replies?.length || 0), 0);
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const CommentItem = ({ c, indent = false }: { c: Comment; indent?: boolean }) => (
    <div className={indent ? 'ml-8 border-l border-border/40 pl-4' : ''}>
      <div className="py-3 border-b border-border/30 last:border-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
            {c.author_name.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-semibold">{c.author_name}</span>
          <span className="text-xs text-muted-foreground">{fmt(c.created_at)}</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed pl-9">{c.content}</p>
      </div>
      {c.replies?.map(r => <CommentItem key={r.id} c={r} indent />)}
    </div>
  );

  return (
    <section className="mt-10 pt-8 border-t border-border/40">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 mb-4 text-sm font-semibold hover:text-primary transition-colors w-full text-left"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Comments {count > 0 ? `(${count})` : ''}
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ml-auto transition-transform ${open ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {open && (
        <div>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Loading comments...</p>
          ) : comments.length > 0 ? (
            <div className="mb-8">{comments.map(c => <CommentItem key={c.id} c={c} />)}</div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 mb-4">No comments yet. Be the first to share your thoughts.</p>
          )}

          {submitted ? (
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground">
              Thanks for your comment! It will appear after review.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Leave a comment</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  required
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name *"
                  className="px-3 py-2 rounded-lg border border-border/50 bg-card text-sm outline-none focus:border-primary transition-colors"
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email (optional, not published)"
                  className="px-3 py-2 rounded-lg border border-border/50 bg-card text-sm outline-none focus:border-primary transition-colors"
                />
              </div>
              <textarea
                required
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Share your thoughts..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-border/50 bg-card text-sm outline-none focus:border-primary transition-colors resize-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? 'Posting...' : 'Post comment'}
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
