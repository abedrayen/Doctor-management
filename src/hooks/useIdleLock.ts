import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;
const CHECK_INTERVAL_MS = 5_000;

interface IdleLockOptions {
  timeoutMinutes: number;
  enabled: boolean;
  onIdle: () => void;
}

/** Calls `onIdle` once after `timeoutMinutes` without user activity. */
export function useIdleLock({ timeoutMinutes, enabled, onIdle }: IdleLockOptions) {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return;
    let lastActivity = Date.now();
    const markActive = () => {
      lastActivity = Date.now();
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, markActive, { passive: true }));
    const timer = setInterval(() => {
      if (Date.now() - lastActivity >= timeoutMinutes * 60_000) onIdleRef.current();
    }, CHECK_INTERVAL_MS);
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, markActive));
      clearInterval(timer);
    };
  }, [enabled, timeoutMinutes]);
}
