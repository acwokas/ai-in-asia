/**
 * Returns a 200 Response containing the React SPA shell HTML.
 * Used as a fallback when Astro SSR pages can't match a route
 * (e.g. /tools, /events, /newsletter) so the React Router can handle it.
 */
export function spaShellResponse(): Response {
  const html = `<!doctype html>
<html lang="en-GB">
  <head>
    <script>
      (function() {
        var stored = localStorage.getItem('aiia_theme') || localStorage.getItem('theme');
        var isDark = stored ? stored !== 'light' : true;
        if (isDark) document.documentElement.classList.add('dark');
      })();
    </script>
    <script>
      (function() {
        var path = window.location.pathname.toLowerCase();
        if (path.indexOf('/admin') !== -1) return;
        document.addEventListener('visibilitychange', function() {
          if (document.hidden) {
            window._refreshTimer = setTimeout(function() { window.location.reload(); }, 3600000);
          } else if (window._refreshTimer) {
            clearTimeout(window._refreshTimer);
          }
        });
      })();
    </script>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico?v=5" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=5" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icons/aiinasia-192.png?v=5" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#000000" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="AIinASIA" />
    <link rel="apple-touch-icon" href="/icons/aiinasia-ios-180.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preconnect" href="https://pbmtnvxywplgpldmlygv.supabase.co" crossorigin />
    <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=Poppins:wght@700;800;900&display=swap" rel="stylesheet" />
    <script>window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);}</script>
    <script src="https://analytics.ahrefs.com/analytics.js" data-key="ehgmS75pUla8HpRhvnD/1w" async></script>
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4181437297386228" crossorigin="anonymous"></script>
  </head>
  <body>
    <noscript>
      <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NVSBJH7Q"
        height="0" width="0" style="display:none;visibility:hidden"></iframe>
    </noscript>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
