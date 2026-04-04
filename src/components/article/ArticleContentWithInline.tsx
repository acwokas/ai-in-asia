import React, { Children, useMemo } from "react";
import MidArticleRelated from "./MidArticleRelated";

interface ArticleContentWithInlineProps {
  children: React.ReactNode;
  currentArticleId: string;
  categoryId: string | null;
  categorySlug: string;
  articleType: string;
}

/**
 * Wraps rendered article content and injects a MidArticleRelated card
 * after the 4th block-level child element.
 */
const ArticleContentWithInline = ({
  children,
  currentArticleId,
  categoryId,
  categorySlug,
  articleType,
}: ArticleContentWithInlineProps) => {
  const shouldInject =
    !!categoryId &&
    articleType !== "policy_article" &&
    articleType !== "three_before_nine" &&
    articleType !== "editors_note";

  const elements = useMemo(() => {
    const childArray = Children.toArray(children);

    if (!shouldInject || childArray.length < 5) {
      return childArray;
    }

    const INSERT_AFTER = 4; // after 4th element (0-indexed: index 3)
    const before = childArray.slice(0, INSERT_AFTER);
    const after = childArray.slice(INSERT_AFTER);

    return [
      ...before,
      <MidArticleRelated
        key="mid-article-related"
        currentArticleId={currentArticleId}
        categoryId={categoryId!}
        categorySlug={categorySlug}
      />,
      ...after,
    ];
  }, [children, shouldInject, currentArticleId, categoryId, categorySlug]);

  return <>{elements}</>;
};

export default ArticleContentWithInline;
