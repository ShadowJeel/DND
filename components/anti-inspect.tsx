"use client";
import { useEffect } from "react";

export function AntiInspect() {
  useEffect(() => {
    const showBlockOverlay = () => {
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 999999;
        background: #0f172a; color: #f8fafc;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        font-family: system-ui, sans-serif; text-align: center; padding: 2rem;
      `;
      overlay.innerHTML = `
        <h1 style="font-size: 1.8rem; max-width: 600px; line-height: 1.4; margin-bottom: 1.5rem;">
          Developer tools and source viewing are restricted<br>due to site policy
        </h1>
        <p style="font-size: 1.1rem; max-width: 500px; opacity: 0.9; margin-bottom: 2rem;">
          Please close any open developer tools to continue.
        </p>
        <button 
          onclick="location.reload()" 
          style="padding: 0.8rem 2rem; font-size: 1.1rem; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;"
        >
          Reload Page
        </button>
      `;
      document.body.appendChild(overlay);
      document.body.style.overflow = "hidden";
    };

    // Block dangerous shortcuts
    const blockShortcuts = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (
        e.key === "F12" ||
        (e.ctrlKey && key === "u") ||               // Ctrl+U → View Source
        (e.ctrlKey && e.shiftKey && (key === "i" || key === "j" || key === "c")) ||
        (e.metaKey && e.altKey && (key === "i" || key === "j")) ||
        (e.ctrlKey && key === "s")                  // Ctrl+S can sometimes trigger save/source-ish flows
      ) {
        e.preventDefault();
        e.stopPropagation();
        showBlockOverlay();
      }
    };

    // Timing-based DevTools detection (still one of the best)
    const devtoolsCheck = () => {
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const duration = performance.now() - start;

      if (duration > 60) {  // 40–100 ms threshold works best in 2026
        showBlockOverlay();
      }
    };

    // Window size ratio change detection (docked devtools)
    let prevRatio = window.outerWidth / (window.innerWidth || 1);
    const sizeCheck = () => {
      const currentRatio = window.outerWidth / (window.innerWidth || 1);
      const diff = Math.abs(currentRatio - prevRatio);

      if (diff > 0.18 || window.outerHeight - window.innerHeight > 120) {
        showBlockOverlay();
      }
      prevRatio = currentRatio;
    };

    // Listeners
    document.addEventListener("keydown", blockShortcuts, true);
    document.addEventListener("contextmenu", (e) => {
      // We allow normal context menu → no e.preventDefault() here
    });

    const interval = setInterval(() => {
      devtoolsCheck();
      sizeCheck();
    }, 700); // Frequent enough to catch quickly, not too CPU heavy

    // Optional: basic anti-select / anti-drag
    document.addEventListener("selectstart", (e) => e.preventDefault());
    document.addEventListener("dragstart", (e) => e.preventDefault());

    return () => {
      document.removeEventListener("keydown", blockShortcuts, true);
      document.removeEventListener("selectstart", () => {});
      document.removeEventListener("dragstart", () => {});
      clearInterval(interval);
    };
  }, []);

  return null;
}