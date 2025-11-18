# SEO Indexing Speed Optimization Setup

This document explains the technical improvements implemented to speed up Google and other search engine indexing for AI in ASIA.

## What's Been Implemented

### 1. **IndexNow Protocol Integration** ✅
- Instantly notifies Bing, Yandex, and partner search engines when content is published
- Microsoft shares IndexNow data with Google, providing faster discovery

### 2. **Automatic Sitemap Ping** ✅
- Automatically pings Google and Bing sitemap services when new articles are published
- Triggers immediate recrawl of the sitemap

### 3. **Optimized Sitemap Generation** ✅
- **Dynamic Priority**: Articles get priority based on freshness
  - 0-7 days old: Priority 0.9, updated daily
  - 8-30 days old: Priority 0.8, updated weekly
  - 31-90 days old: Priority 0.7, updated weekly
  - 90+ days old: Priority 0.7, updated monthly
- **Last-Modified Headers**: Proper HTTP headers for better cache control
- **Change Frequency**: Realistic values based on content age

### 4. **Automatic Notifications** ✅
- Database trigger automatically notifies search engines when:
  - New articles are published
  - Draft articles change to published status
- Fire-and-forget mechanism doesn't slow down publishing

## Setup Required

### IndexNow Key Setup (Important!)

1. **Generate Your IndexNow Key**:
   ```bash
   # Generate a random 32-character key
   openssl rand -hex 16
   ```

2. **Update the IndexNow Key File**:
   - Edit `public/indexnow-key.txt` and replace the placeholder with your generated key
   - This file must be publicly accessible at `https://aiinasia.com/indexnow-key.txt`

3. **Update Edge Function**:
   - Open `supabase/functions/notify-search-engines/index.ts`
   - Replace `"your-indexnow-key"` on line 51 with your actual key:
   ```typescript
   key: "your-actual-generated-key-here",
   ```

4. **Submit Your Key to IndexNow**:
   - Visit: https://www.bing.com/indexnow
   - Or: https://www.indexnow.org/
   - Follow instructions to verify your key

## How It Works

### Automatic Flow
1. Article is published via the admin panel
2. Database trigger detects the status change
3. Edge function `notify-search-engines` is automatically called
4. Three notifications sent simultaneously:
   - **IndexNow**: Instant notification to Bing/Yandex
   - **Google Sitemap Ping**: Notifies Google of sitemap update
   - **Bing Sitemap Ping**: Notifies Bing of sitemap update

### Manual Testing
You can manually test the notification system:
```bash
curl -X POST https://aiinasia.com/functions/v1/notify-search-engines \
  -H "Content-Type: application/json" \
  -d '{"articleId": "your-article-id-here"}'
```

## Monitoring & Verification

### Check If It's Working
1. **Publish a new article**
2. **Check the edge function logs**:
   - Go to Lovable Cloud → Functions → `notify-search-engines`
   - Look for success messages in logs

3. **Verify in Search Consoles**:
   - Google Search Console: Check "Sitemaps" section for last fetch date
   - Bing Webmaster Tools: Check "Sitemaps" for submission status
   - IndexNow submissions: Check Bing Webmaster's IndexNow report

### Expected Results
- **Google**: Typically indexes within 1-48 hours (vs 1-7 days previously)
- **Bing**: Usually faster, within hours via IndexNow
- **Yandex**: IndexNow provides near-instant discovery

## Troubleshooting

### Common Issues

**Issue**: IndexNow returning 403 Forbidden
- **Fix**: Ensure your key in the edge function matches the key in `indexnow-key.txt`

**Issue**: Sitemap pings failing
- **Fix**: Verify sitemap is accessible at `https://aiinasia.com/sitemap.xml`

**Issue**: No notifications being sent
- **Fix**: Check edge function logs for errors; verify database trigger is active

### Disable Automatic Notifications
If needed, you can disable the automatic trigger:
```sql
DROP TRIGGER IF EXISTS trigger_notify_search_engines ON articles;
```

Re-enable it:
```sql
CREATE TRIGGER trigger_notify_search_engines
  AFTER INSERT OR UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION notify_search_engines_on_publish();
```

## Performance Impact
- **Database**: Negligible (async trigger)
- **Publishing Speed**: No impact (fire-and-forget)
- **Costs**: ~3 edge function calls per published article

## Additional Recommendations

### For Maximum Indexing Speed:
1. ✅ **Already Done**: Sitemap optimization
2. ✅ **Already Done**: Automatic notifications
3. 📋 **Consider**: Submit sitemap to other search engines (DuckDuckGo, Ecosia)
4. 📋 **Consider**: Implement AMP pages for mobile-first indexing
5. 📋 **Consider**: Add structured data for rich snippets (already implemented)

## Support
For issues or questions, check:
- Edge function logs in Lovable Cloud
- Google Search Console
- Bing Webmaster Tools
