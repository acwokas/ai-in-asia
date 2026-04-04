
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip updated_at change if only operational columns were modified
  -- (trending, view counts, scores, flags that automated jobs touch)
  IF (
    NEW.title IS NOT DISTINCT FROM OLD.title AND
    NEW.slug IS NOT DISTINCT FROM OLD.slug AND
    NEW.content IS NOT DISTINCT FROM OLD.content AND
    NEW.excerpt IS NOT DISTINCT FROM OLD.excerpt AND
    NEW.status IS NOT DISTINCT FROM OLD.status AND
    NEW.meta_title IS NOT DISTINCT FROM OLD.meta_title AND
    NEW.meta_description IS NOT DISTINCT FROM OLD.meta_description AND
    NEW.seo_title IS NOT DISTINCT FROM OLD.seo_title AND
    NEW.featured_image_url IS NOT DISTINCT FROM OLD.featured_image_url AND
    NEW.featured_image_alt IS NOT DISTINCT FROM OLD.featured_image_alt AND
    NEW.featured_image_caption IS NOT DISTINCT FROM OLD.featured_image_caption AND
    NEW.featured_image_credit IS NOT DISTINCT FROM OLD.featured_image_credit AND
    NEW.author_id IS NOT DISTINCT FROM OLD.author_id AND
    NEW.primary_category_id IS NOT DISTINCT FROM OLD.primary_category_id AND
    NEW.article_type IS NOT DISTINCT FROM OLD.article_type AND
    NEW.canonical_url IS NOT DISTINCT FROM OLD.canonical_url AND
    NEW.focus_keyphrase IS NOT DISTINCT FROM OLD.focus_keyphrase AND
    NEW.keyphrase_synonyms IS NOT DISTINCT FROM OLD.keyphrase_synonyms AND
    NEW.cornerstone IS NOT DISTINCT FROM OLD.cornerstone AND
    NEW.region IS NOT DISTINCT FROM OLD.region AND
    NEW.country IS NOT DISTINCT FROM OLD.country AND
    NEW.sources IS NOT DISTINCT FROM OLD.sources AND
    NEW.ai_summary IS NOT DISTINCT FROM OLD.ai_summary AND
    NEW.ai_tags IS NOT DISTINCT FROM OLD.ai_tags AND
    NEW.topic_tags IS NOT DISTINCT FROM OLD.topic_tags AND
    NEW.policy_sections IS NOT DISTINCT FROM OLD.policy_sections AND
    NEW.policy_status IS NOT DISTINCT FROM OLD.policy_status AND
    NEW.policy_effective_date IS NOT DISTINCT FROM OLD.policy_effective_date AND
    NEW.policy_applies_to IS NOT DISTINCT FROM OLD.policy_applies_to AND
    NEW.policy_regulatory_impact IS NOT DISTINCT FROM OLD.policy_regulatory_impact AND
    NEW.tldr_snapshot IS NOT DISTINCT FROM OLD.tldr_snapshot AND
    NEW.top_list_intro IS NOT DISTINCT FROM OLD.top_list_intro AND
    NEW.top_list_items IS NOT DISTINCT FROM OLD.top_list_items AND
    NEW.top_list_outro IS NOT DISTINCT FROM OLD.top_list_outro AND
    NEW.comparison_tables IS NOT DISTINCT FROM OLD.comparison_tables AND
    NEW.series_id IS NOT DISTINCT FROM OLD.series_id AND
    NEW.series_part IS NOT DISTINCT FROM OLD.series_part AND
    NEW.series_total IS NOT DISTINCT FROM OLD.series_total AND
    NEW.event_date IS NOT DISTINCT FROM OLD.event_date AND
    NEW.event_start_date IS NOT DISTINCT FROM OLD.event_start_date AND
    NEW.event_end_date IS NOT DISTINCT FROM OLD.event_end_date AND
    NEW.event_location IS NOT DISTINCT FROM OLD.event_location AND
    NEW.event_venue IS NOT DISTINCT FROM OLD.event_venue AND
    NEW.event_registration_url IS NOT DISTINCT FROM OLD.event_registration_url AND
    NEW.podcast_audio_url IS NOT DISTINCT FROM OLD.podcast_audio_url AND
    NEW.podcast_duration_minutes IS NOT DISTINCT FROM OLD.podcast_duration_minutes AND
    NEW.review_product_name IS NOT DISTINCT FROM OLD.review_product_name AND
    NEW.review_rating IS NOT DISTINCT FROM OLD.review_rating AND
    NEW.local_resources IS NOT DISTINCT FROM OLD.local_resources AND
    NEW.governance_maturity IS NOT DISTINCT FROM OLD.governance_maturity AND
    NEW.reading_time_minutes IS NOT DISTINCT FROM OLD.reading_time_minutes AND
    NEW.published_at IS NOT DISTINCT FROM OLD.published_at AND
    NEW.scheduled_for IS NOT DISTINCT FROM OLD.scheduled_for
  ) THEN
    -- Only operational columns changed (view_count, like_count, comment_count,
    -- trending_score, is_trending, featured_on_homepage, homepage_trending,
    -- featured_pinned, trending_excluded, trending_rotated_at, sticky, etc.)
    -- Preserve the original updated_at
    NEW.updated_at = OLD.updated_at;
    RETURN NEW;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
