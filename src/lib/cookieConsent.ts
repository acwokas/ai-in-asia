const CONSENT_KEY = "aiia_cookie_consent";

export type ConsentValue = "accepted" | "declined" | null;

export function getConsent(): ConsentValue {
  try {
    const val = localStorage.getItem(CONSENT_KEY);
    if (val === "accepted" || val === "declined") return val;
    return null;
  } catch {
    return null;
  }
}

export function setConsent(value: "accepted" | "declined") {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // storage unavailable
  }
}

/** Dynamically inject GTM + AdSense scripts when user accepts cookies */
export function loadTrackingScripts() {
  if (typeof window === "undefined") return;

  // GTM
  if (!document.querySelector('script[src*="googletagmanager.com/gtm.js"]')) {
    const gtmScript = document.createElement("script");
    gtmScript.async = true;
    gtmScript.src = "https://www.googletagmanager.com/gtm.js?id=GTM-NVSBJH7Q";
    document.head.appendChild(gtmScript);

    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  }

  // AdSense
  if (!document.querySelector('script[src*="adsbygoogle"]')) {
    const adsScript = document.createElement("script");
    adsScript.async = true;
    adsScript.crossOrigin = "anonymous";
    adsScript.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4181437297386228";
    document.head.appendChild(adsScript);
  }
}

/** Remove tracking cookies / revoke consent signals */
export function removeTrackingScripts() {
  // We can't truly unload scripts, but we signal GTM to stop
  if (typeof window !== "undefined" && (window as any).dataLayer) {
    (window as any).dataLayer.push({ event: "consent_declined" });
  }
}
