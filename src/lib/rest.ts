import { create } from 'zustand';

interface RestState {
  endsAt: number | null;
  total: number;
  label: string;
  start: (seconds: number, label: string) => void;
  add: (seconds: number) => void;
  stop: () => void;
}

/** Rest countdown between sets. Not persisted: a reload simply drops the rest. */
export const useRest = create<RestState>()((set, get) => ({
  endsAt: null,
  total: 0,
  label: '',
  start: (seconds, label) => set({ endsAt: Date.now() + seconds * 1000, total: seconds, label }),
  add: (seconds) => {
    const { endsAt, total } = get();
    if (endsAt == null) return;
    const next = Math.max(Date.now() + 1000, endsAt + seconds * 1000);
    set({ endsAt: next, total: Math.max(1, total + seconds) });
  },
  stop: () => set({ endsAt: null }),
}));
