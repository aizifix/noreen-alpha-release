// Simple session timeout utility with idle and absolute timeouts
// No API changes; purely client-side enforcement

type SessionTimeoutOptions = {
  idleTimeoutMs?: number; // default 15 minutes
  absoluteTimeoutMs?: number; // default 12 hours
  onTimeout: () => void;
  storageKeyPrefix?: string; // to isolate per role if needed
};

const DEFAULT_IDLE_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_ABSOLUTE_MS = 12 * 60 * 60 * 1000; // 12 hours

const now = () => Date.now();

export function startSessionWatcher(options: SessionTimeoutOptions) {
  if (typeof window === "undefined") return () => {};

  const idleMs = Math.max(options.idleTimeoutMs || DEFAULT_IDLE_MS, 60 * 1000);
  const absoluteMs = Math.max(
    options.absoluteTimeoutMs || DEFAULT_ABSOLUTE_MS,
    5 * 60 * 1000
  );
  const prefix = options.storageKeyPrefix || "session";

  const KEY_ABSOLUTE_START = `${prefix}_absolute_start`;
  const KEY_LAST_ACTIVITY = `${prefix}_last_activity`;

  // Initialize timestamps if not set
  try {
    if (!localStorage.getItem(KEY_ABSOLUTE_START)) {
      localStorage.setItem(KEY_ABSOLUTE_START, String(now()));
    }
    localStorage.setItem(KEY_LAST_ACTIVITY, String(now()));
  } catch {}

  let idleTimer: number | null = null;
  let absoluteTimer: number | null = null;

  const clearTimers = () => {
    if (idleTimer) window.clearTimeout(idleTimer);
    if (absoluteTimer) window.clearTimeout(absoluteTimer);
  };

  const triggerTimeout = () => {
    clearTimers();
    try {
      localStorage.removeItem(KEY_LAST_ACTIVITY);
      localStorage.removeItem(KEY_ABSOLUTE_START);
    } catch {}
    options.onTimeout();
  };

  const scheduleIdleTimer = () => {
    if (idleTimer) window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      // Check last activity
      try {
        const last = Number(localStorage.getItem(KEY_LAST_ACTIVITY) || 0);
        if (!last || now() - last >= idleMs) {
          triggerTimeout();
          return;
        }
      } catch {}
      scheduleIdleTimer();
    }, idleMs) as unknown as number;
  };

  const scheduleAbsoluteTimer = () => {
    if (absoluteTimer) window.clearTimeout(absoluteTimer);
    try {
      const started = Number(localStorage.getItem(KEY_ABSOLUTE_START) || now());
      const remaining = Math.max(started + absoluteMs - now(), 0);
      absoluteTimer = window.setTimeout(
        triggerTimeout,
        remaining
      ) as unknown as number;
    } catch {
      absoluteTimer = window.setTimeout(
        triggerTimeout,
        absoluteMs
      ) as unknown as number;
    }
  };

  const activityHandler = () => {
    try {
      localStorage.setItem(KEY_LAST_ACTIVITY, String(now()));
    } catch {}
    scheduleIdleTimer();
  };

  const bindActivityEvents = () => {
    ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach((evt) =>
      window.addEventListener(evt, activityHandler, { passive: true })
    );
  };

  const unbindActivityEvents = () => {
    ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach((evt) =>
      window.removeEventListener(evt, activityHandler)
    );
  };

  bindActivityEvents();
  scheduleIdleTimer();
  scheduleAbsoluteTimer();

  return () => {
    clearTimers();
    unbindActivityEvents();
  };
}
