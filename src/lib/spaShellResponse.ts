/**
 * Fallback for unknown routes — redirects to 404. The React SPA has been
 * removed; all routes now use Astro SSR pages.
 */
export function spaShellResponse(): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: '/404' },
  });
}
