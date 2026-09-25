import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../lib/store';
import { KIND_ICONS } from '../../lib/types';
import { PR_LABELS, formatMetric, summarizeExercises } from '../../lib/records';
import { relativeDay } from '../../lib/utils';
import { ExerciseProgressSheet } from '../../components/ExerciseProgressSheet';

export function RecordsView() {
  const { history, settings } = useStore(useShallow((s) => ({ history: s.history, settings: s.settings })));
  const [openKey, setOpenKey] = useState<string | null>(null);
  const summaries = useMemo(() => summarizeExercises(history), [history]);
  const recent = useMemo(
    () =>
      history
        .flatMap((w) => (w.prs ?? []).filter((p) => p.kind !== 'volume').map((p) => ({ ...p, at: w.finishedAt ?? w.startedAt })))
        .slice(0, 6),
    [history],
  );

  if (summaries.length === 0) {
    return (
      <div className="empty">
        <div className="empty-emoji">🏆</div>
        <h2>No records yet</h2>
        <p>Tick your sets and finish a workout. Beat your best next time and it lands here.</p>
      </div>
    );
  }

  return (
    <>
      {recent.length > 0 && (
        <section>
          <div className="section-title">Latest PRs</div>
          <div className="pr-list">
            {recent.map((p, i) => (
              <button key={i} className="pr-row" onClick={() => setOpenKey(p.key)}>
                <span className="pr-trophy">🏆</span>
                <span className="lr-body">
                  <span className="lr-title">{p.name}</span>
                  <span className="lr-sub">
                    {PR_LABELS[p.kind]} · {relativeDay(p.at)}
                  </span>
                </span>
                <span className="pr-value">
                  <strong>{formatMetric(p.kind, p.value, settings)}</strong>
                  <small>+{formatMetric(p.kind, Math.round((p.value - p.previous) * 100) / 100, settings)}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="section-title">Your bests</div>
        <div className="list">
          {summaries.map((s) => (
            <div key={s.key} className="list-row" role="button" tabIndex={0} onClick={() => setOpenKey(s.key)}>
              <span className="kind-icon">{KIND_ICONS[s.kind]}</span>
              <span className="lr-body">
                <span className="lr-title">{s.name}</span>
                <span className="lr-sub">
                  {s.sessions} session{s.sessions === 1 ? '' : 's'} · {relativeDay(s.lastAt)}
                </span>
              </span>
              {s.metric && <strong className="best-value">{formatMetric(s.metric, s.bests[s.metric]!, settings)}</strong>}
              <span className="chev">›</span>
            </div>
          ))}
        </div>
      </section>

      {openKey && <ExerciseProgressSheet exerciseKey={openKey} onClose={() => setOpenKey(null)} />}
    </>
  );
}
