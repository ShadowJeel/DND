"use client";

import { useEffect } from "react";

export function AntiInspect() {
    useEffect(() => {
        // We only want to run this in production or if explicitly testing it.
        // However, the user requested it for all the code.
        const triggerPrivacyPolicy = () => {
            try {
                document.body.innerHTML = `
          <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 24px; min-height: 100dvh; width: 100vw; background-color: #0f172a; color: #f8fafc; text-align: center; padding: 24px; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;">
            <h1 style="max-width: 600px; line-height: 1.4; font-size: 1.5rem; font-weight: 600;">You Cannot See the Code Due To Privacy Policy Of The Site</h1>
            <button onclick="window.location.reload()" style="padding: 12px 24px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 1rem; transition: background-color 0.2s;">
              Return to Page
            </button>
          </div>
        `;
                document.body.style.overflow = "hidden";
                document.body.style.maxWidth = "none";
                document.body.style.border = "none";
            } catch (e) {
                // Fallback if document.body isn't ready
                console.error("Privacy mode enabled");
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            triggerPrivacyPolicy();
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === "F12" ||
                ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) ||
                ((e.ctrlKey || e.metaKey) && (e.key === "U" || e.key === "u" || e.key === "S" || e.key === "s")) ||
                (e.metaKey && e.altKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c" || e.key === "U" || e.key === "u"))
            ) {
                e.preventDefault();
                triggerPrivacyPolicy();
            }
        };

        // Prevent dragging images or text selection as basic protections
        const handleDragStart = (e: DragEvent) => e.preventDefault();
        const handleSelectStart = (e: Event) => e.preventDefault();

        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("dragstart", handleDragStart);
        document.addEventListener("selectstart", handleSelectStart);

        // Advanced protection: detect devtools by measuring debugger pause
        const checkDevTools = setInterval(() => {
            const before = performance.now();
            // eslint-disable-next-line no-debugger
            debugger;
            const after = performance.now();
            if (after - before > 100) {
                triggerPrivacyPolicy();
            }
        }, 1000);

        return () => {
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("dragstart", handleDragStart);
            document.removeEventListener("selectstart", handleSelectStart);
            clearInterval(checkDevTools);
        };
    }, []);

    return null;
}
