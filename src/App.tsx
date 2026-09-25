import { useEffect } from 'react';
import { useRoute, navigate } from './lib/router';
import { useStore } from './lib/store';
import { unlockAudio } from './lib/feedback';
import { SpinScreen } from './screens/SpinScreen';
import { WorkoutScreen } from './screens/WorkoutScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { LibraryScreen } from './screens/LibraryScreen';

const TABS = [
  {
    id: 'spin',
    label: 'Spin',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="13" r="8.5" />
        <path d="M12 13 L12 4.5 M12 13 L19.4 17.2 M12 13 L4.6 17.2" />
        <path d="M9.5 1.5 L12 4.5 L14.5 1.5 Z" className="fill" />
      </svg>
    ),
  },
  {
    id: 'workout',
    label: 'Workout',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'History',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    id: 'library',
    label: 'Library',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M5 4.5h4v15H5zM10 4.5h4v15h-4zM15.2 5.3l3.8-1 3.6 14.4-3.8 1z" />
      </svg>
    ),
  },
];

export default function App() {
  const route = useRoute();
  const hasActive = useStore((s) => !!s.active);
  const tab = TABS.some((t) => t.id === route[0]) ? route[0] : 'spin';

  // iOS only allows audio after a user gesture; unlock on the first touch.
  useEffect(() => {
    const once = () => {
      unlockAudio();
      window.removeEventListener('pointerdown', once);
    };
    window.addEventListener('pointerdown', once);
    return () => window.removeEventListener('pointerdown', once);
  }, []);

  return (
    <div className="app">
      <main>
        {tab === 'spin' && <SpinScreen />}
        {tab === 'workout' && <WorkoutScreen />}
        {tab === 'history' && <HistoryScreen />}
        {tab === 'library' && <LibraryScreen categoryId={route[1]} />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => navigate(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.id === 'workout' && hasActive && <i className="live-dot" aria-label="in progress" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
