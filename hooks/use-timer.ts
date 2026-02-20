"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TEST_CONFIG } from "@/lib/config/test-rules";

interface UseTimerOptions {
  durationMins: number;
  startedAt: string | null;
  isRunning: boolean;
  onTimeout: () => void;
}

export function useTimer({
  durationMins,
  startedAt,
  isRunning,
  onTimeout,
}: UseTimerOptions) {
  const [remainingSecs, setRemainingSecs] = useState(() => durationMins * 60);
  const [isHidden, setIsHidden] = useState(false);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const config = TEST_CONFIG.timer;

  // Update initial remaining seconds when durationMins changes
  useEffect(() => {
    if (durationMins > 0 && !startedAt) {
      setRemainingSecs(durationMins * 60);
    }
  }, [durationMins, startedAt]);

  // Calculate remaining time from startedAt
  useEffect(() => {
    if (!startedAt || !isRunning || durationMins <= 0) return;

    const startTime = new Date(startedAt).getTime();
    const endTime = startTime + durationMins * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setRemainingSecs(remaining);

      if (remaining <= 0 && config.autoSubmitOnTimeout) {
        onTimeoutRef.current();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startedAt, durationMins, isRunning, config.autoSubmitOnTimeout]);

  const toggleHidden = useCallback(() => {
    if (config.allowHideTimer) {
      setIsHidden((prev) => !prev);
    }
  }, [config.allowHideTimer]);

  const minutes = Math.floor(remainingSecs / 60);
  const seconds = remainingSecs % 60;
  const isWarning = remainingSecs <= config.warningThresholdSecs && remainingSecs > config.criticalThresholdSecs;
  const isCritical = remainingSecs <= config.criticalThresholdSecs;

  const formatted = config.showSeconds
    ? `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes} min`;

  // Grace period check (allow ending test in first N minutes)
  const elapsedSecs = startedAt
    ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
    : 0;
  const isInGracePeriod =
    TEST_CONFIG.gracePeriod.showEndTestButton &&
    elapsedSecs <= TEST_CONFIG.gracePeriod.durationMins * 60;

  return {
    remainingSecs,
    minutes,
    seconds,
    formatted,
    isHidden,
    isWarning,
    isCritical,
    isInGracePeriod,
    toggleHidden,
  };
}
