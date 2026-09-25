import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../lib/store';
import { PR_LABELS, formatMetric, summarizeExercises } from '../lib/records';
import type { PRKind } from '../lib/types';
import { Sheet } from './ui';
import { LineChart } from './LineChart';

const SERIES_COLOR = '#3987e5';
const shortDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function ExerciseProgressSheet({
  exerciseKey,
  fallbackName,
  onClose,
}: {
  exerciseKey: string | null;
  fallbackName?: string;
  onClose: () => void;
}) {
  const { history, settings } = useStore(useShallow((s) => ({ history: s.history, settings: s.settings })));
  const summary = useMemo(
    () => (exerciseKey ? summarizeExercises(history).find((s) => s.key === exerciseKey) : undefined),
    [history, exerciseKey],
  );
  if (!exerciseKey) return null;

  const metric = summary?.metric;
  const prWorkouts = new Set(
    history.filter((w) => w.prs?.some((p) => p.key === exerciseKey && p.kind === metric)).map((w) => w.id),
  );

  return (
    <Sheet open onClose={onClose} title={`📈 ${summary?.name ?? fallbackName ?? 'Progress'}`}>
      {!summary || !metric ? (
        <p className="muted">No logged sessions yet. Tick some sets and finish a workout to start the chart.</p>
      ) : (
        <>
          <div className="best-chips">
            {(Object.keys(summary.bests) as PRKind[]).map((k) => (
              <div key={k} className="best-chip">
                <span>{PR_LABELS[k]}</span>
                <strong>{formatMetric(k, summary.bests[k]!, settings)}</strong>
              </div>
            ))}
          </div>
          <div className="section-title">
            {PR_LABELS[metric]} per session · {summary.sessions} session{summary.sessions === 1 ? '' : 's'}
          </div>
          {summary.series.length >= 2 ? (
            <LineChart
              ariaLabel={`${PR_LABELS[metric]} for ${summary.name} per session`}
              series={[
                {
                  id: 'main',
                  label: PR_LABELS[metric],
                  color: SERIES_COLOR,
                  kind: 'line',
                  points: summary.series.map((p) => ({ x: p.at, y: p.value })),
                },
              ]}
              endLabel="main"
              formatY={(v) => formatMetric(metric, v, settings).replace(/ (reps|min)$/, '')}
              formatX={shortDate}
            />
          ) : (
            <p className="muted small">One more session and you'll see a trend line here.</p>
          )}
          <ul className="session-list">
            {[...summary.series].reverse().map((p) => (
              <li key={p.workoutId + p.at}>
                <span>{new Date(p.at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                <strong>
                  {prWorkouts.has(p.workoutId) && '🏆 '}
                  {formatMetric(metric, p.value, settings)}
                </strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}
