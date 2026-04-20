// Site configuration for AI in Asia.
// Server-side only: do NOT import from client React islands.
// Pass required values as props from .astro pages instead.

const ANON_KEY_FALLBACK =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBibXRudnh5d3BsZ3BsZG1seWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NjYwOTMsImV4cCI6MjA3NzA0MjA5M30.Xt29HhlYkz3BJW9VlMBzNF-_hqmfiqOLF8HmonOxfvg';

const domain = import.meta.env.SITE_DOMAIN || 'aiinasia.com';

export const siteConfig = {
  name:            import.meta.env.SITE_NAME        || 'AI in Asia',
  domain,
  tagline:         import.meta.env.SITE_TAGLINE     || 'Your guide to AI in Asia',
  description:     import.meta.env.SITE_DESC        || 'The definitive source for AI news, insights, and innovation across Asia. Daily briefings, analysis, and practical guides.',
  url:             import.meta.env.SITE_URL         || `https://${domain}`,
  supabaseUrl:     import.meta.env.SUPABASE_URL     || 'https://pbmtnvxywplgpldmlygv.supabase.co',
  supabaseAnonKey: import.meta.env.SUPABASE_ANON_KEY || ANON_KEY_FALLBACK,
  ga4Id:           import.meta.env.GA4_ID           || '',
  gtmId:           import.meta.env.GTM_ID           || 'GTM-NVSBJH7Q',
  adsensePubId:    import.meta.env.ADSENSE_PUB_ID   || 'ca-pub-4181437297386228',
  brandColor:      import.meta.env.BRAND_COLOR      || '#5F72FF',
  logoUrl:         import.meta.env.LOGO_URL         || '/logos/aiinasia-logo.png',
  ogDefaultImage:  import.meta.env.OG_DEFAULT_IMAGE || '/icons/aiinasia-og-default.png',
  twitterHandle:   import.meta.env.TWITTER_HANDLE   || '',
  locale:          import.meta.env.SITE_LOCALE      || 'en-GB',
  hreflang:        import.meta.env.SITE_HREFLANG    || 'en-GB',
  defaultAuthor:   'Intelligence Desk',
  spotifyShowUrl:  'https://open.spotify.com/show/3aHz4AvuZTHjiKJaZ9FUdW',
};
