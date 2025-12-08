-- Add new columns for Platform Guides, Role Guides, and Prompt Packs schema
ALTER TABLE public.ai_guides
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS learning_objectives TEXT,
ADD COLUMN IF NOT EXISTS role_challenges_overview TEXT,
ADD COLUMN IF NOT EXISTS how_ai_helps_this_role TEXT,
ADD COLUMN IF NOT EXISTS step_by_step_section_1_heading TEXT,
ADD COLUMN IF NOT EXISTS step_by_step_section_1_text TEXT,
ADD COLUMN IF NOT EXISTS step_by_step_section_2_heading TEXT,
ADD COLUMN IF NOT EXISTS step_by_step_section_2_text TEXT,
ADD COLUMN IF NOT EXISTS step_by_step_section_3_heading TEXT,
ADD COLUMN IF NOT EXISTS step_by_step_section_3_text TEXT,
ADD COLUMN IF NOT EXISTS applied_examples TEXT,
ADD COLUMN IF NOT EXISTS interactive_exercises TEXT,
ADD COLUMN IF NOT EXISTS troubleshooting_and_common_mistakes TEXT,
ADD COLUMN IF NOT EXISTS advanced_tips_and_optimisation TEXT,
ADD COLUMN IF NOT EXISTS recommended_tools_for_this_role TEXT,
ADD COLUMN IF NOT EXISTS further_reading TEXT,
ADD COLUMN IF NOT EXISTS closing_encouragement TEXT;