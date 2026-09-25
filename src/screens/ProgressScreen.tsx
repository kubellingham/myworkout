import { navigate } from '../lib/router';
import { Segmented } from '../components/ui';
import { WorkoutsView } from './progress/WorkoutsView';
import { RecordsView } from './progress/RecordsView';
import { BodyView } from './progress/BodyView';

type View = 'workouts' | 'records' | 'body';

export function ProgressScreen({ view }: { view?: string }) {
  const current: View = view === 'records' || view === 'body' ? view : 'workouts';
  return (
    <div className="screen">
      <header className="page-head">
        <h1>Progress</h1>
      </header>
      <Segmented<View>
        value={current}
        onChange={(v) => navigate(v === 'workouts' ? 'progress' : `progress/${v}`)}
        options={[
          { value: 'workouts', label: '📅 Workouts' },
          { value: 'records', label: '🏆 Records' },
          { value: 'body', label: '⚖️ Body' },
        ]}
      />
      {current === 'workouts' && <WorkoutsView />}
      {current === 'records' && <RecordsView />}
      {current === 'body' && <BodyView />}
    </div>
  );
}
