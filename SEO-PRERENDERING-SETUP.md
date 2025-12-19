# SEO Prerendering Setup Guide

## The Problem

AI in ASIA is a React Single Page Application (SPA). When search engines and social media crawlers visit the site, they receive an empty HTML shell with JavaScript that renders content client-side. This means:

- **Google**: May not properly index dynamic content
- **Facebook/Twitter/LinkedIn**: Show generic fallback meta tags instead of article-specific previews
- **Social sharing**: Links don't display proper title, description, and images

## Solution Overview

We've implemented a three-pronged approach:

### 1. ✅ Improved Static Meta Tags (Already Implemented)
- Enhanced `index.html` with comprehensive OG and Twitter Card meta tags
- Added canonical URLs and robots directives
- Provides baseline fallback for all crawlers

### 2. ✅ Edge Function for Social Sharing (Already Implemented)
- Share buttons route through `render-meta-tags` edge function
- Returns server-rendered HTML with proper meta tags to crawlers
- Redirects regular users to the actual article

### 3. 📋 Prerendering Service (This Guide)

For full SEO support, you need a prerendering service that:
1. Detects crawler user agents
2. Serves pre-rendered HTML to crawlers
3. Serves the normal SPA to regular users

---

## Option A: Prerender.io (Recommended)

### Step 1: Sign Up
1. Go to [prerender.io](https://prerender.io)
2. Create an account (free tier: 250 pages/month)

### Step 2: Get Your Token
1. After signing up, go to Dashboard → Settings
2. Copy your **Prerender Token**

### Step 3: Configure Lovable/Hosting

Since Lovable uses static hosting, you'll need to configure prerendering at the CDN/proxy level:

#### Option A1: Cloudflare (Recommended for Lovable)

1. **Add your domain to Cloudflare**
   - Go to cloudflare.com and add your domain
   - Update nameservers at your registrar

2. **Install Prerender Cloudflare Worker**

   Create a Cloudflare Worker with this code:

   ```javascript
   const PRERENDER_TOKEN = 'YOUR_PRERENDER_TOKEN';
   const BOT_USER_AGENTS = [
     'googlebot', 'bingbot', 'yandex', 'baiduspider', 'facebookexternalhit',
     'twitterbot', 'rogerbot', 'linkedinbot', 'embedly', 'quora link preview',
     'showyoubot', 'outbrain', 'pinterest', 'slackbot', 'vkShare', 'W3C_Validator',
     'redditbot', 'Applebot', 'WhatsApp', 'flipboard', 'tumblr', 'bitlybot',
     'SkypeUriPreview', 'nuzzel', 'Discordbot', 'Google Page Speed', 'Qwantify',
     'pinterestbot', 'Bitrix link preview', 'XING-contenttabreceiver', 'TelegramBot'
   ];

   async function handleRequest(request) {
     const url = new URL(request.url);
     const userAgent = request.headers.get('User-Agent') || '';
     
     // Check if it's a bot
     const isBot = BOT_USER_AGENTS.some(bot => 
       userAgent.toLowerCase().includes(bot.toLowerCase())
     );
     
     // Skip prerender for static assets
     const isStaticAsset = /\.(js|css|xml|less|png|jpg|jpeg|gif|pdf|doc|txt|ico|rss|zip|mp3|rar|exe|wmv|avi|ppt|mpg|mpeg|tif|wav|mov|psd|ai|xls|mp4|m4a|swf|dat|dmg|iso|flv|m4v|torrent|ttf|woff|svg|eot)$/i.test(url.pathname);
     
     if (!isBot || isStaticAsset) {
       return fetch(request);
     }
     
     // Prerender the page for bots
     const prerenderUrl = `https://service.prerender.io/${url.href}`;
     
     const prerenderResponse = await fetch(prerenderUrl, {
       headers: {
         'X-Prerender-Token': PRERENDER_TOKEN,
       },
     });
     
     return new Response(prerenderResponse.body, {
       status: prerenderResponse.status,
       headers: {
         'Content-Type': 'text/html',
         'Cache-Control': 'public, max-age=3600',
       },
     });
   }

   addEventListener('fetch', event => {
     event.respondWith(handleRequest(event.request));
   });
   ```

3. **Configure Worker Route**
   - Go to Workers → Routes
   - Add route: `aiinasia.com/*` → Your Worker

#### Option A2: Using Render.com or Vercel

If you migrate hosting, these platforms have built-in prerender integrations.

---

## Option B: Rendertron (Self-Hosted, Free)

### Step 1: Deploy Rendertron

Deploy Google's Rendertron to a cloud provider:

```bash
# Clone Rendertron
git clone https://github.com/GoogleChrome/rendertron.git
cd rendertron

# Deploy to Google Cloud Run (or similar)
gcloud run deploy rendertron --source .
```

### Step 2: Configure Cloudflare Worker

Use similar worker code but point to your Rendertron instance:

```javascript
const RENDERTRON_URL = 'https://your-rendertron-instance.run.app/render/';

async function handleRequest(request) {
  // ... bot detection logic same as above ...
  
  if (isBot) {
    const prerenderUrl = `${RENDERTRON_URL}${encodeURIComponent(url.href)}`;
    return fetch(prerenderUrl);
  }
  
  return fetch(request);
}
```

---

## Option C: Prerender-Node (For Custom Servers)

If you have a Node.js server in front of your SPA:

```bash
npm install prerender-node
```

```javascript
const prerender = require('prerender-node');
app.use(prerender.set('prerenderToken', 'YOUR_TOKEN'));
```

---

## Testing Your Setup

### 1. Test with cURL
```bash
# Simulate Googlebot
curl -A "Googlebot" https://aiinasia.com/news/your-article-slug

# Simulate Facebook crawler
curl -A "facebookexternalhit/1.1" https://aiinasia.com/news/your-article-slug
```

### 2. Facebook Debugger
- Go to: https://developers.facebook.com/tools/debug/
- Enter your article URL
- Click "Scrape Again" to refresh

### 3. Twitter Card Validator
- Go to: https://cards-dev.twitter.com/validator
- Enter your article URL

### 4. LinkedIn Post Inspector
- Go to: https://www.linkedin.com/post-inspector/
- Enter your article URL

### 5. Google Rich Results Test
- Go to: https://search.google.com/test/rich-results
- Enter your URL

---

## Current Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Static meta tags in index.html | ✅ Complete | Fallback for all pages |
| React Helmet for dynamic meta | ✅ Complete | Updates on client-side navigation |
| Edge function for share links | ✅ Complete | `render-meta-tags` function |
| Prerendering service | 📋 Needs Setup | Follow this guide |

---

## Recommended Next Steps

1. **Immediate**: Test current share functionality on Facebook/Twitter
2. **Short-term**: Set up Cloudflare for your domain
3. **Short-term**: Implement Prerender.io with Cloudflare Worker
4. **Ongoing**: Monitor with Facebook Debugger after publishing articles

---

## Costs

| Service | Free Tier | Paid |
|---------|-----------|------|
| Prerender.io | 250 pages/month | $15+/month |
| Rendertron | Self-hosted | Cloud hosting costs |
| Cloudflare | Generous free tier | Pro: $20/month |

For a news site, Prerender.io's paid tier is recommended for reliable caching and performance.
