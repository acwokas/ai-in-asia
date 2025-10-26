-- Insert or update featured authors with bios
INSERT INTO public.authors (name, slug, bio, is_featured, job_title, avatar_url)
VALUES 
  (
    'Adrian Watkins',
    'adrian-watkins',
    'I''ve spent over 26 years helping companies from global corporations to fast-growing startups achieve measurable success through AI-powered digital transformation, smart go-to-market execution, and sustainable revenue growth. I launched AIinASIA to help share news, tips and tricks for work and play.',
    true,
    'Founder & Editor',
    'https://pbmtnvxywplgpldmlygv.supabase.co/storage/v1/object/public/author-avatars/adrian-watkins.jpeg'
  ),
  (
    'Intelligence Desk',
    'intelligence-desk',
    'The Intelligence Desk is powered by a handful of global experts who focus on clarity over hype, pairing local insight with a global perspective. From policy to pop culture, and from boardrooms to backstreets, the Asia Intelligence Crew delivers stories that reveal AI''s real impact across the region: smart, human, and distinctly Asian.',
    true,
    'Editorial Team',
    'https://pbmtnvxywplgpldmlygv.supabase.co/storage/v1/object/public/author-avatars/intelligence-desk.png'
  ),
  (
    'Koo Ping Shung',
    'koo-ping-shung',
    'Koo Ping Shung has 20 years of experience in Data Science and AI across various industries. He covers the data value chain from collection to implementation of machine learning models. Koo is an instructor, trainer, and advisor for businesses and startups, and a co-founder of DataScience SG, one of the largest tech communities in the region. He was also involved in setting up the Chartered AI Engineer accreditation process.',
    true,
    'Data Science & AI Expert',
    'https://pbmtnvxywplgpldmlygv.supabase.co/storage/v1/object/public/author-avatars/koo-ping-shung.jpeg'
  ),
  (
    'Victoria Watkins',
    'victoria-watkins',
    'Victoria Watkins is a strategic HR and people operations consultant with deep experience across high-growth businesses, established enterprises, and founder-led teams. Specialises in bringing clarity and calm to complex people challenges, from performance systems and hiring strategies to cultural alignment and leadership coaching.',
    true,
    'HR & People Operations Consultant',
    'https://pbmtnvxywplgpldmlygv.supabase.co/storage/v1/object/public/author-avatars/victoria-watkins.jpeg'
  )
ON CONFLICT (slug) 
DO UPDATE SET
  bio = EXCLUDED.bio,
  is_featured = EXCLUDED.is_featured,
  job_title = EXCLUDED.job_title,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = now();