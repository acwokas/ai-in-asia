/**
 * Fallback for unknown category routes — redirects to homepage.
 * The React SPA has been removed; all routes use Astro SSR pages.
 * Redirecting to / (not /404) prevents a redirect loop since /404
 * would hit [category]/index.astro → spaShellResponse → /404 again.
 */
export function spaShellResponse(): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: '/' },
  });
}
