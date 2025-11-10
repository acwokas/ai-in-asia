export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          badge_icon: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          points_required: number | null
        }
        Insert: {
          badge_icon?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          points_required?: number | null
        }
        Update: {
          badge_icon?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          points_required?: number | null
        }
        Relationships: []
      }
      ai_comment_authors: {
        Row: {
          avatar_url: string | null
          comment_count: number | null
          created_at: string | null
          handle: string
          id: string
          is_power_user: boolean | null
          name: string
          region: string
        }
        Insert: {
          avatar_url?: string | null
          comment_count?: number | null
          created_at?: string | null
          handle: string
          id?: string
          is_power_user?: boolean | null
          name: string
          region: string
        }
        Update: {
          avatar_url?: string | null
          comment_count?: number | null
          created_at?: string | null
          handle?: string
          id?: string
          is_power_user?: boolean | null
          name?: string
          region?: string
        }
        Relationships: []
      }
      ai_generated_comments: {
        Row: {
          article_id: string
          author_id: string
          comment_date: string
          content: string
          created_at: string | null
          id: string
          is_ai: boolean | null
        }
        Insert: {
          article_id: string
          author_id: string
          comment_date: string
          content: string
          created_at?: string | null
          id?: string
          is_ai?: boolean | null
        }
        Update: {
          article_id?: string
          author_id?: string
          comment_date?: string
          content?: string
          created_at?: string | null
          id?: string
          is_ai?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generated_comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generated_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "ai_comment_authors"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tools: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_featured: boolean | null
          logo_url: string | null
          name: string
          rating_avg: number | null
          rating_count: number | null
          source_urls: string[] | null
          updated_at: string
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          logo_url?: string | null
          name: string
          rating_avg?: number | null
          rating_count?: number | null
          source_urls?: string[] | null
          updated_at?: string
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          logo_url?: string | null
          name?: string
          rating_avg?: number | null
          rating_count?: number | null
          source_urls?: string[] | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      article_categories: {
        Row: {
          article_id: string
          category_id: string
        }
        Insert: {
          article_id: string
          category_id: string
        }
        Update: {
          article_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_categories_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      article_recommendations: {
        Row: {
          article_id: string
          created_at: string
          id: string
          reason: string | null
          score: number
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          reason?: string | null
          score?: number
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      article_series: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      article_tags: {
        Row: {
          article_id: string
          tag_id: string
        }
        Insert: {
          article_id: string
          tag_id: string
        }
        Update: {
          article_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_tags_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          ai_generated_at: string | null
          ai_summary: string | null
          ai_tags: string[] | null
          article_type: Database["public"]["Enums"]["article_type_new"]
          author_id: string | null
          batch_id: string | null
          canonical_url: string | null
          comment_count: number | null
          comparison_tables: Json | null
          content: Json
          cornerstone: boolean | null
          country: string | null
          created_at: string
          created_by: string | null
          event_date: string | null
          event_end_date: string | null
          event_location: string | null
          event_registration_url: string | null
          event_start_date: string | null
          event_venue: string | null
          excerpt: string | null
          featured_image_alt: string | null
          featured_image_caption: string | null
          featured_image_credit: string | null
          featured_image_url: string | null
          featured_on_homepage: boolean | null
          focus_keyphrase: string | null
          governance_maturity: string | null
          homepage_trending: boolean | null
          id: string
          is_launch_article: boolean | null
          is_trending: boolean | null
          keyphrase_synonyms: string | null
          like_count: number | null
          local_resources: Json | null
          meta_description: string | null
          meta_title: string | null
          podcast_audio_url: string | null
          podcast_duration_minutes: number | null
          policy_sections: Json | null
          preview_code: string | null
          primary_category_id: string | null
          published_at: string | null
          reading_time_minutes: number | null
          region: string | null
          review_product_name: string | null
          review_rating: number | null
          scheduled_for: string | null
          seo_title: string | null
          series_id: string | null
          series_part: number | null
          series_total: number | null
          slug: string
          status: Database["public"]["Enums"]["article_status"]
          sticky: boolean | null
          title: string
          tldr_snapshot: Json | null
          topic_tags: string[] | null
          updated_at: string
          updated_by: string | null
          version: number | null
          view_count: number | null
        }
        Insert: {
          ai_generated_at?: string | null
          ai_summary?: string | null
          ai_tags?: string[] | null
          article_type?: Database["public"]["Enums"]["article_type_new"]
          author_id?: string | null
          batch_id?: string | null
          canonical_url?: string | null
          comment_count?: number | null
          comparison_tables?: Json | null
          content?: Json
          cornerstone?: boolean | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          event_end_date?: string | null
          event_location?: string | null
          event_registration_url?: string | null
          event_start_date?: string | null
          event_venue?: string | null
          excerpt?: string | null
          featured_image_alt?: string | null
          featured_image_caption?: string | null
          featured_image_credit?: string | null
          featured_image_url?: string | null
          featured_on_homepage?: boolean | null
          focus_keyphrase?: string | null
          governance_maturity?: string | null
          homepage_trending?: boolean | null
          id?: string
          is_launch_article?: boolean | null
          is_trending?: boolean | null
          keyphrase_synonyms?: string | null
          like_count?: number | null
          local_resources?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          podcast_audio_url?: string | null
          podcast_duration_minutes?: number | null
          policy_sections?: Json | null
          preview_code?: string | null
          primary_category_id?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          region?: string | null
          review_product_name?: string | null
          review_rating?: number | null
          scheduled_for?: string | null
          seo_title?: string | null
          series_id?: string | null
          series_part?: number | null
          series_total?: number | null
          slug: string
          status?: Database["public"]["Enums"]["article_status"]
          sticky?: boolean | null
          title: string
          tldr_snapshot?: Json | null
          topic_tags?: string[] | null
          updated_at?: string
          updated_by?: string | null
          version?: number | null
          view_count?: number | null
        }
        Update: {
          ai_generated_at?: string | null
          ai_summary?: string | null
          ai_tags?: string[] | null
          article_type?: Database["public"]["Enums"]["article_type_new"]
          author_id?: string | null
          batch_id?: string | null
          canonical_url?: string | null
          comment_count?: number | null
          comparison_tables?: Json | null
          content?: Json
          cornerstone?: boolean | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          event_end_date?: string | null
          event_location?: string | null
          event_registration_url?: string | null
          event_start_date?: string | null
          event_venue?: string | null
          excerpt?: string | null
          featured_image_alt?: string | null
          featured_image_caption?: string | null
          featured_image_credit?: string | null
          featured_image_url?: string | null
          featured_on_homepage?: boolean | null
          focus_keyphrase?: string | null
          governance_maturity?: string | null
          homepage_trending?: boolean | null
          id?: string
          is_launch_article?: boolean | null
          is_trending?: boolean | null
          keyphrase_synonyms?: string | null
          like_count?: number | null
          local_resources?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          podcast_audio_url?: string | null
          podcast_duration_minutes?: number | null
          policy_sections?: Json | null
          preview_code?: string | null
          primary_category_id?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          region?: string | null
          review_product_name?: string | null
          review_rating?: number | null
          scheduled_for?: string | null
          seo_title?: string | null
          series_id?: string | null
          series_part?: number | null
          series_total?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["article_status"]
          sticky?: boolean | null
          title?: string
          tldr_snapshot?: Json | null
          topic_tags?: string[] | null
          updated_at?: string
          updated_by?: string | null
          version?: number | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_primary_category_id_fkey"
            columns: ["primary_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "article_series"
            referencedColumns: ["id"]
          },
        ]
      }
      authors: {
        Row: {
          article_count: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          id: string
          is_featured: boolean | null
          job_title: string | null
          linkedin_url: string | null
          name: string
          slug: string
          twitter_handle: string | null
          updated_at: string
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          article_count?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_featured?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          name: string
          slug: string
          twitter_handle?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          article_count?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_featured?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          name?: string
          slug?: string
          twitter_handle?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          article_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_link_operations: {
        Row: {
          articles_modified: number
          backup_data: Json
          created_at: string
          created_by: string | null
          failed_count: number
          id: string
          notes: string | null
          undone_at: string | null
        }
        Insert: {
          articles_modified?: number
          backup_data?: Json
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          notes?: string | null
          undone_at?: string | null
        }
        Update: {
          articles_modified?: number
          backup_data?: Json
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          notes?: string | null
          undone_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_sponsors: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean | null
          sponsor_logo_url: string
          sponsor_name: string
          sponsor_tagline: string | null
          sponsor_website_url: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          sponsor_logo_url: string
          sponsor_name: string
          sponsor_tagline?: string | null
          sponsor_website_url: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          sponsor_logo_url?: string
          sponsor_name?: string
          sponsor_tagline?: string | null
          sponsor_website_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_sponsors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          approved: boolean | null
          article_id: string
          author_email: string | null
          author_name: string | null
          content: string
          created_at: string
          id: string
          parent_id: string | null
          user_id: string | null
        }
        Insert: {
          approved?: boolean | null
          article_id: string
          author_email?: string | null
          author_name?: string | null
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          user_id?: string | null
        }
        Update: {
          approved?: boolean | null
          article_id?: string
          author_email?: string | null
          author_name?: string | null
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          read_at: string | null
          replied_at: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          read_at?: string | null
          replied_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          read_at?: string | null
          replied_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      editors_picks: {
        Row: {
          article_id: string
          created_at: string
          created_by: string | null
          id: string
          location: string
          updated_at: string
        }
        Insert: {
          article_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          location: string
          updated_at?: string
        }
        Update: {
          article_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "editors_picks_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          city: string
          country: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          event_type: string
          id: string
          image_url: string | null
          is_featured: boolean | null
          location: string
          organizer: string | null
          region: string
          registration_url: string | null
          slug: string
          start_date: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          venue: string | null
          website_url: string | null
        }
        Insert: {
          city: string
          country: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          location: string
          organizer?: string | null
          region?: string
          registration_url?: string | null
          slug: string
          start_date: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          venue?: string | null
          website_url?: string | null
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          location?: string
          organizer?: string | null
          region?: string
          registration_url?: string | null
          slug?: string
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          venue?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      migration_logs: {
        Row: {
          batch_id: string
          created_at: string | null
          created_by: string | null
          error_details: Json | null
          failed_records: number | null
          id: string
          operation_type: string
          status: string
          successful_records: number | null
          total_records: number | null
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          created_by?: string | null
          error_details?: Json | null
          failed_records?: number | null
          id?: string
          operation_type: string
          status?: string
          successful_records?: number | null
          total_records?: number | null
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          created_by?: string | null
          error_details?: Json | null
          failed_records?: number | null
          id?: string
          operation_type?: string
          status?: string
          successful_records?: number | null
          total_records?: number | null
        }
        Relationships: []
      }
      newsletter_automation_log: {
        Row: {
          completed_at: string | null
          created_at: string
          details: Json | null
          error_message: string | null
          id: string
          job_name: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          job_name: string
          started_at?: string
          status: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          job_name?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      newsletter_editions: {
        Row: {
          comments_count_override: number | null
          created_at: string
          created_by: string | null
          edition_date: string
          editor_note: string | null
          hero_article_id: string | null
          hero_article_manual_override: boolean | null
          hero_article_original: string | null
          id: string
          meme_alt_text: string | null
          meme_caption: string | null
          meme_image_url: string | null
          mini_case_study: string | null
          scheduled_send_time: string | null
          send_timezone: string
          status: Database["public"]["Enums"]["newsletter_status"]
          subject_line: string
          subject_line_variant_b: string | null
          total_clicked: number | null
          total_opened: number | null
          total_sent: number | null
          updated_at: string
        }
        Insert: {
          comments_count_override?: number | null
          created_at?: string
          created_by?: string | null
          edition_date: string
          editor_note?: string | null
          hero_article_id?: string | null
          hero_article_manual_override?: boolean | null
          hero_article_original?: string | null
          id?: string
          meme_alt_text?: string | null
          meme_caption?: string | null
          meme_image_url?: string | null
          mini_case_study?: string | null
          scheduled_send_time?: string | null
          send_timezone?: string
          status?: Database["public"]["Enums"]["newsletter_status"]
          subject_line: string
          subject_line_variant_b?: string | null
          total_clicked?: number | null
          total_opened?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Update: {
          comments_count_override?: number | null
          created_at?: string
          created_by?: string | null
          edition_date?: string
          editor_note?: string | null
          hero_article_id?: string | null
          hero_article_manual_override?: boolean | null
          hero_article_original?: string | null
          id?: string
          meme_alt_text?: string | null
          meme_caption?: string | null
          meme_image_url?: string | null
          mini_case_study?: string | null
          scheduled_send_time?: string | null
          send_timezone?: string
          status?: Database["public"]["Enums"]["newsletter_status"]
          subject_line?: string
          subject_line_variant_b?: string | null
          total_clicked?: number | null
          total_opened?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_editions_hero_article_id_fkey"
            columns: ["hero_article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_fun_facts: {
        Row: {
          created_at: string
          fact_text: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          source: string | null
          used_count: number | null
        }
        Insert: {
          created_at?: string
          fact_text: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          source?: string | null
          used_count?: number | null
        }
        Update: {
          created_at?: string
          fact_text?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          source?: string | null
          used_count?: number | null
        }
        Relationships: []
      }
      newsletter_mystery_links: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          title: string
          url: string
          used_in_editions: string[] | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          title: string
          url: string
          used_in_editions?: string[] | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          title?: string
          url?: string
          used_in_editions?: string[] | null
        }
        Relationships: []
      }
      newsletter_news_sources: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          last_scraped_at: string | null
          name: string
          region: string | null
          rss_feed_url: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_scraped_at?: string | null
          name: string
          region?: string | null
          rss_feed_url?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_scraped_at?: string | null
          name?: string
          region?: string | null
          rss_feed_url?: string | null
          url?: string
        }
        Relationships: []
      }
      newsletter_quick_takes: {
        Row: {
          created_at: string
          display_order: number | null
          edition_id: string | null
          headline: string
          id: string
          insight: string
          manually_selected: boolean | null
          scraped_at: string | null
          source_url: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          edition_id?: string | null
          headline: string
          id?: string
          insight: string
          manually_selected?: boolean | null
          scraped_at?: string | null
          source_url?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          edition_id?: string | null
          headline?: string
          id?: string
          insight?: string
          manually_selected?: boolean | null
          scraped_at?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_quick_takes_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "newsletter_editions"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_sends: {
        Row: {
          bounced: boolean | null
          clicked_at: string | null
          clicked_sections: Json | null
          edition_id: string
          id: string
          opened_at: string | null
          sent_at: string
          subscriber_id: string
          unsubscribed_at: string | null
          variant: string | null
        }
        Insert: {
          bounced?: boolean | null
          clicked_at?: string | null
          clicked_sections?: Json | null
          edition_id: string
          id?: string
          opened_at?: string | null
          sent_at?: string
          subscriber_id: string
          unsubscribed_at?: string | null
          variant?: string | null
        }
        Update: {
          bounced?: boolean | null
          clicked_at?: string | null
          clicked_sections?: Json | null
          edition_id?: string
          id?: string
          opened_at?: string | null
          sent_at?: string
          subscriber_id?: string
          unsubscribed_at?: string | null
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_sends_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "newsletter_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_sends_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "newsletter_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_sponsors: {
        Row: {
          banner_image_url: string | null
          created_at: string
          cta_text: string | null
          id: string
          is_active: boolean | null
          is_collective_site: boolean | null
          logo_url: string | null
          name: string
          priority: number | null
          updated_at: string
          website_url: string
        }
        Insert: {
          banner_image_url?: string | null
          created_at?: string
          cta_text?: string | null
          id?: string
          is_active?: boolean | null
          is_collective_site?: boolean | null
          logo_url?: string | null
          name: string
          priority?: number | null
          updated_at?: string
          website_url: string
        }
        Update: {
          banner_image_url?: string | null
          created_at?: string
          cta_text?: string | null
          id?: string
          is_active?: boolean | null
          is_collective_site?: boolean | null
          logo_url?: string | null
          name?: string
          priority?: number | null
          updated_at?: string
          website_url?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          confirmed: boolean | null
          email: string
          first_name: string | null
          id: string
          points_earned: number | null
          preferences: Json | null
          subscribed_at: string
          total_clicks: number | null
          total_opens: number | null
          unsubscribed_at: string | null
        }
        Insert: {
          confirmed?: boolean | null
          email: string
          first_name?: string | null
          id?: string
          points_earned?: number | null
          preferences?: Json | null
          subscribed_at?: string
          total_clicks?: number | null
          total_opens?: number | null
          unsubscribed_at?: string | null
        }
        Update: {
          confirmed?: boolean | null
          email?: string
          first_name?: string | null
          id?: string
          points_earned?: number | null
          preferences?: Json | null
          subscribed_at?: string
          total_clicks?: number | null
          total_opens?: number | null
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      newsletter_tools_prompts: {
        Row: {
          category: Database["public"]["Enums"]["tool_prompt_category"]
          created_at: string
          description: string
          featured_image_url: string | null
          id: string
          is_active: boolean | null
          source: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          category: Database["public"]["Enums"]["tool_prompt_category"]
          created_at?: string
          description: string
          featured_image_url?: string | null
          id?: string
          is_active?: boolean | null
          source?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          category?: Database["public"]["Enums"]["tool_prompt_category"]
          created_at?: string
          description?: string
          featured_image_url?: string | null
          id?: string
          is_active?: boolean | null
          source?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      newsletter_top_stories: {
        Row: {
          article_id: string
          created_at: string
          edition_id: string
          id: string
          manual_override: boolean | null
          original_article_id: string | null
          position: number
        }
        Insert: {
          article_id: string
          created_at?: string
          edition_id: string
          id?: string
          manual_override?: boolean | null
          original_article_id?: string | null
          position: number
        }
        Update: {
          article_id?: string
          created_at?: string
          edition_id?: string
          id?: string
          manual_override?: boolean | null
          original_article_id?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_top_stories_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_top_stories_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "newsletter_editions"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_comments: {
        Row: {
          article_id: string
          comment_date: string | null
          comment_prompt: string
          created_at: string | null
          id: string
          scheduled_for: string
        }
        Insert: {
          article_id: string
          comment_date?: string | null
          comment_prompt: string
          created_at?: string | null
          id?: string
          scheduled_for: string
        }
        Update: {
          article_id?: string
          comment_date?: string | null
          comment_prompt?: string
          created_at?: string | null
          id?: string
          scheduled_for?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_settings: {
        Row: {
          active_popup: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          active_popup?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          active_popup?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          country: string | null
          created_at: string | null
          first_name: string | null
          id: string
          interests: string[] | null
          job_title: string | null
          last_name: string | null
          newsletter_subscribed: boolean | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          first_name?: string | null
          id: string
          interests?: string[] | null
          job_title?: string | null
          last_name?: string | null
          newsletter_subscribed?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          interests?: string[] | null
          job_title?: string | null
          last_name?: string | null
          newsletter_subscribed?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      reading_history: {
        Row: {
          article_id: string
          completed: boolean | null
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          article_id: string
          completed?: boolean | null
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          article_id?: string
          completed?: boolean | null
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_history_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      redirects: {
        Row: {
          created_at: string
          created_by: string | null
          from_path: string
          id: string
          status_code: number
          to_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_path: string
          id?: string
          status_code?: number
          to_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_path?: string
          id?: string
          status_code?: number
          to_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      scout_queries: {
        Row: {
          created_at: string | null
          id: string
          query_count: number | null
          query_date: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          query_count?: number | null
          query_date?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          query_count?: number | null
          query_date?: string
          user_id?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      stock_prices: {
        Row: {
          change_amount: number
          change_percent: number
          company_name: string
          created_at: string
          current_price: number
          id: string
          last_updated: string
          symbol: string
        }
        Insert: {
          change_amount: number
          change_percent: number
          company_name: string
          created_at?: string
          current_price: number
          id?: string
          last_updated?: string
          symbol: string
        }
        Update: {
          change_amount?: number
          change_percent?: number
          company_name?: string
          created_at?: string
          current_price?: number
          id?: string
          last_updated?: string
          symbol?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      tool_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          tool_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          tool_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          tool_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_ratings_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "ai_tools"
            referencedColumns: ["id"]
          },
        ]
      }
      url_mappings: {
        Row: {
          article_id: string | null
          batch_id: string | null
          created_at: string | null
          id: string
          new_slug: string
          new_url: string
          old_slug: string
          old_url: string
          redirect_created: boolean | null
        }
        Insert: {
          article_id?: string | null
          batch_id?: string | null
          created_at?: string | null
          id?: string
          new_slug: string
          new_url: string
          old_slug: string
          old_url: string
          redirect_created?: boolean | null
        }
        Update: {
          article_id?: string | null
          batch_id?: string | null
          created_at?: string | null
          id?: string
          new_slug?: string
          new_url?: string
          old_slug?: string
          old_url?: string
          redirect_created?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "url_mappings_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          articles_read: number | null
          comments_made: number | null
          created_at: string | null
          id: string
          last_read_date: string | null
          level: string | null
          points: number | null
          shares_made: number | null
          streak_days: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          articles_read?: number | null
          comments_made?: number | null
          created_at?: string | null
          id?: string
          last_read_date?: string | null
          level?: string | null
          points?: number | null
          shares_made?: number | null
          streak_days?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          articles_read?: number | null
          comments_made?: number | null
          created_at?: string | null
          id?: string
          last_read_date?: string | null
          level?: string | null
          points?: number | null
          shares_made?: number | null
          streak_days?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      authors_public: {
        Row: {
          article_count: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          id: string | null
          is_featured: boolean | null
          job_title: string | null
          name: string | null
          slug: string | null
          twitter_handle: string | null
          updated_at: string | null
        }
        Insert: {
          article_count?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string | null
          is_featured?: boolean | null
          job_title?: string | null
          name?: string | null
          slug?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
        }
        Update: {
          article_count?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string | null
          is_featured?: boolean | null
          job_title?: string | null
          name?: string | null
          slug?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_points: {
        Args: { _points: number; _user_id: string }
        Returns: undefined
      }
      check_and_award_achievements: {
        Args: { _user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_article_views: {
        Args: { article_id: string }
        Returns: undefined
      }
      update_streak: { Args: { _user_id: string }; Returns: undefined }
      update_trending_articles: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "editor" | "contributor" | "user"
      article_status: "draft" | "published" | "archived" | "scheduled"
      article_type_new:
        | "article"
        | "news"
        | "review"
        | "guide"
        | "podcast"
        | "video"
        | "event"
        | "policy_article"
      newsletter_status: "draft" | "scheduled" | "sending" | "sent" | "failed"
      tool_prompt_category: "tool" | "prompt"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor", "contributor", "user"],
      article_status: ["draft", "published", "archived", "scheduled"],
      article_type_new: [
        "article",
        "news",
        "review",
        "guide",
        "podcast",
        "video",
        "event",
        "policy_article",
      ],
      newsletter_status: ["draft", "scheduled", "sending", "sent", "failed"],
      tool_prompt_category: ["tool", "prompt"],
    },
  },
} as const
