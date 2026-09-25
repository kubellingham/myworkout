import { useEffect } from 'react';

type Sentinel = { release: () => Promise<void> };
type WakeNavigator = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } };

/** Keep the screen on while `enabled` (e.g. during a timer). Silently a no-op where unsupported. */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const nav = navigator as WakeNavigator;
    let sentinel: Sentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        if (nav.wakeLock && document.visibilityState === 'visible') {
          const s = await nav.wakeLock.request('screen');
          if (cancelled) void s.release().catch(() => {});
          else sentinel = s;
        }
      } catch {
        /* denied or unsupported */
      }
    };
    void request();
    const onVis = () => document.visibilityState === 'visible' && void request();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      void sentinel?.release().catch(() => {});
    };
  }, [enabled]);
}
