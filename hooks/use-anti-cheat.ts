"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { TEST_CONFIG } from "@/lib/config/test-rules";

interface UseAntiCheatOptions {
  enabled: boolean;
  onAutoSubmit: () => void;
  onWarning: (message: string, remaining: number) => void;
}

export function useAntiCheat({
  enabled,
  onAutoSubmit,
  onWarning,
}: UseAntiCheatOptions) {
  const warningCountRef = useRef(0);
  const [warnings, setWarnings] = useState(0);
  const isFullscreenRef = useRef(false);
  const config = TEST_CONFIG.antiCheat;

  const addWarning = useCallback(() => {
    warningCountRef.current += 1;
    const count = warningCountRef.current;
    setWarnings(count);

    const remaining = config.maxWarnings - count;

    if (remaining <= 0) {
      onAutoSubmit();
      return;
    }

    if (remaining === 1) {
      onWarning(config.finalWarningMessage, remaining);
    } else {
      onWarning(config.warningMessage(remaining), remaining);
    }
  }, [config, onAutoSubmit, onWarning]);

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    if (!config.requireFullscreen || !enabled) return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        isFullscreenRef.current = true;
      }
    } catch {
      // Fullscreen not supported or blocked
      console.warn("Fullscreen request failed");
    }
  }, [config.requireFullscreen, enabled]);

  // Exit fullscreen
  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      isFullscreenRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handlers: (() => void)[] = [];

    // -- Right-click disable --
    if (config.disableRightClick) {
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        return false;
      };
      document.addEventListener("contextmenu", handleContextMenu);
      handlers.push(() =>
        document.removeEventListener("contextmenu", handleContextMenu)
      );
    }

    // -- Dev tools shortcuts disable --
    if (config.disableDevTools) {
      const handleKeyDown = (e: KeyboardEvent) => {
        // F12
        if (e.key === "F12") {
          e.preventDefault();
          return;
        }
        // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
        if (
          e.ctrlKey &&
          e.shiftKey &&
          ["I", "J", "C"].includes(e.key.toUpperCase())
        ) {
          e.preventDefault();
          return;
        }
        // Ctrl+U (view source)
        if (e.ctrlKey && e.key.toUpperCase() === "U") {
          e.preventDefault();
          return;
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      handlers.push(() =>
        document.removeEventListener("keydown", handleKeyDown)
      );
    }

    // -- Copy/Paste disable --
    if (config.disableCopyPaste) {
      const handleCopy = (e: ClipboardEvent) => e.preventDefault();
      const handlePaste = (e: ClipboardEvent) => e.preventDefault();
      document.addEventListener("copy", handleCopy);
      document.addEventListener("paste", handlePaste);
      handlers.push(() => {
        document.removeEventListener("copy", handleCopy);
        document.removeEventListener("paste", handlePaste);
      });
    }

    // -- Tab switch / visibility detection --
    if (config.detectTabSwitch) {
      const handleVisibility = () => {
        if (document.hidden) {
          addWarning();
        }
      };
      document.addEventListener("visibilitychange", handleVisibility);
      handlers.push(() =>
        document.removeEventListener("visibilitychange", handleVisibility)
      );

      // Also detect fullscreen exit
      if (config.requireFullscreen) {
        const handleFullscreenChange = () => {
          if (!document.fullscreenElement && isFullscreenRef.current) {
            isFullscreenRef.current = false;
            addWarning();
            // Try to re-enter fullscreen
            enterFullscreen();
          } else if (document.fullscreenElement) {
            isFullscreenRef.current = true;
          }
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        handlers.push(() =>
          document.removeEventListener(
            "fullscreenchange",
            handleFullscreenChange
          )
        );
      }
    }

    return () => {
      handlers.forEach((cleanup) => cleanup());
    };
  }, [enabled, config, addWarning, enterFullscreen]);

  return {
    warnings,
    maxWarnings: config.maxWarnings,
    enterFullscreen,
    exitFullscreen,
  };
}
