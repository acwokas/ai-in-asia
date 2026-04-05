import { supabase } from "@/integrations/supabase/client";

export interface PublicAuthor {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  bio: string | null;
  job_title: string | null;
  twitter_handle: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  is_featured: boolean | null;
  article_count: number | null;
}

export const fetchPublicAuthorsByIds = async (authorIds: Array<string | null | undefined>) => {
  const uniqueIds = [...new Set(authorIds.filter((id): id is string => Boolean(id)))];

  if (uniqueIds.length === 0) {
    return new Map<string, PublicAuthor>();
  }

  const { data, error } = await supabase
    .from("authors_public")
    .select("id, name, slug, avatar_url, bio, job_title, twitter_handle, linkedin_url, website_url, is_featured, article_count")
    .in("id", uniqueIds);

  if (error) throw error;

  return new Map<string, PublicAuthor>((data || []).map((author) => [author.id, author]));
};

export const hydrateArticleWithPublicAuthor = async <T extends { author_id?: string | null }>(
  article: T | null,
): Promise<(T & { authors: PublicAuthor | null }) | null> => {
  if (!article) return null;

  const authorsById = await fetchPublicAuthorsByIds([article.author_id]);

  return {
    ...article,
    authors: article.author_id ? authorsById.get(article.author_id) ?? null : null,
  };
};

export const hydrateArticlesWithPublicAuthors = async <T extends { author_id?: string | null }>(
  articles: T[],
): Promise<Array<T & { authors: PublicAuthor | null }>> => {
  if (articles.length === 0) return [];

  const authorsById = await fetchPublicAuthorsByIds(articles.map((article) => article.author_id));

  return articles.map((article) => ({
    ...article,
    authors: article.author_id ? authorsById.get(article.author_id) ?? null : null,
  }));
};
