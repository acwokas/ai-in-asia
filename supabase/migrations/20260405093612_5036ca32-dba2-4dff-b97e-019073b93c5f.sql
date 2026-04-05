
DO $$
DECLARE
    trigger_record RECORD;
    function_source TEXT;
    known_good_functions TEXT[] := ARRAY[
        'update_updated_at_column',
        'set_published_at',
        'update_author_article_count',
        'notify_search_engines_on_publish',
        'manage_voices_category',
        'validate_guide_status'
    ];
BEGIN
    FOR trigger_record IN
        SELECT
            t.tgname AS trigger_name,
            p.proname AS function_name
        FROM pg_trigger t
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE t.tgrelid = 'public.articles'::regclass
          AND t.tgisinternal = false
    LOOP
        SELECT prosrc INTO function_source
        FROM pg_proc
        WHERE proname = trigger_record.function_name;

        IF function_source ILIKE '%NEW.title%' AND NOT (trigger_record.function_name = ANY(known_good_functions)) THEN
            RAISE NOTICE 'Dropping rogue trigger: % (function: %)', trigger_record.trigger_name, trigger_record.function_name;
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.articles;', trigger_record.trigger_name);
        END IF;
    END LOOP;
END;
$$;
