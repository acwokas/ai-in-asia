import React from "react";
import { createRoot } from "react-dom/client";
import { del } from "idb-keyval";
import App from "./App.tsx";
import "./index.css";
import { loadGoogleAdsScript } from "./components/GoogleAds";

// Register service worker for image caching
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    const host = window.location.hostname;
    const isLovablePreview = host.includes("lovableproject.com") || host === "localhost";

    // In Lovable preview/staging we avoid SW + persisted query caching issues that can break live updates.
    if (isLovablePreview) {
      try {
        const alreadyCleaned = sessionStorage.getItem("aiinasia_sw_cleaned") === "true";

        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }

        // Clear persisted React Query cache (IndexedDB) so content changes show immediately.
        await del("reactQuery");

        if (!alreadyCleaned) {
          sessionStorage.setItem("aiinasia_sw_cleaned", "true");
          window.location.reload();
        }
      } catch (error) {
        console.log("Service worker cleanup failed:", error);
      }
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.update())
      .catch((error) => {
        console.log("Service worker registration failed:", error);
      });
  });
}

// Load Google AdSense script
loadGoogleAdsScript();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
