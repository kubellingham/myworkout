import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../lib/store';
import type { Workout } from '../../lib/types';
import { EFFORTS, summarizeLog } from '../../lib/format';
import { KIND_ICONS } from '../../lib/types';
import { formatDuration, relativeDay, startOfDay, weekStart } from '../../lib/utils';
import { weekStreak } from '../../lib/goals';
import { PR_LABELS, formatMetric } from '../../lib/records';
import { Sheet } from '../../components/ui';
import { navigate } from '../../lib/router';

const DAY = 86400000;

const shownPRs = (w: Workout) => (w.prs ?? []).filter((p) => p.kind !== 'volume');

export function WorkoutsView() {
  const { history, goal } = useStore(useShallow((s) => ({ history: s.history, goal: s.settings.weeklyGoal })));
  const [openId, setOpenId] = useState<string | null>(null);
  const now = Date.now();

  const stats = useMemo(() => {
    const ws = weekStart(now);
    const thisWeek = history.filter((w) => (w.finishedAt ?? w.startedAt) >= ws).length;
    const monthAgo = now - 30 * DAY;
    const recent = history.filter((w) => (w.finishedAt ?? w.startedAt) >= monthAgo);
    const byCat = new Map<string, { name: string; emoji: string; color: string; count: number }>();
    for (const w of recent) {
      const key = w.categoryId ?? w.categoryName;
      const cur = byCat.get(key) ?? { name: w.categoryName, emoji: w.categoryEmoji, color: w.categoryColor, count: 0 };
      cur.count++;
      byCat.set(key, cur);
    }
    return {
      thisWeek,
      streak: weekStreak(history, goal, now),
      total: history.length,
      balance: [...byCat.values()].sort((a, b) => b.count - a.count),
    };
  }, [history, now, goal]);

  // Calendar: 5 weeks, Monday-first, ending with the current week.
  const cal = useMemo(() => {
    const start = weekStart(now) - 4 * 7 * DAY;
    const byDay = new Map<number, Workout[]>();
    for (const w of history) {
      const d = startOfDay(w.finishedAt ?? w.startedAt);
      byDay.set(d, [...(byDay.get(d) ?? []), w]);
    }
    return Array.from({ length: 35 }, (_, i) => {
      const day = startOfDay(start + i * DAY + DAY / 2);
      return { day, workouts: byDay.get(day) ?? [] };
    });
  }, [history, now]);

  const opened = history.find((w) => w.id === openId) ?? null;
  const maxBalance = Math.max(1, ...stats.balance.map((b) => b.count));

  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="stat-num">
            {stats.thisWeek}
            <small>/{goal}</small>
          </div>
          <div className="stat-label">this week</div>
        </div>
        <div className="stat">
          <div className="stat-num">
            {stats.streak}
            {stats.streak >= 2 && '🔥'}
          </div>
          <div className="stat-label">week streak</div>
        </div>
        <div className="stat">
          <div className="stat-num">{stats.total}</div>
          <div className="stat-label">total</div>
        </div>
      </div>

      <div className="card calendar">
        <div className="cal-grid">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i} className="cal-dow">
              {d}
            </span>
          ))}
          {cal.map(({ day, workouts }) => {
            const isToday = day === startOfDay(now);
            const future = day > now;
            const w = workouts[0];
            return (
              <button
                key={day}
                className={`cal-day${isToday ? ' today' : ''}${future ? ' future' : ''}${w ? ' has' : ''}`}
                style={w ? ({ '--c': w.categoryColor } as React.CSSProperties) : undefined}
                disabled={!w}
                onClick={() => w && setOpenId(w.id)}
                aria-label={`${new Date(day).toDateString()}${w ? `: ${workouts.map((x) => x.categoryName).join(', ')}` : ''}`}
              >
                {w ? w.categoryEmoji : new Date(day).getDate()}
                {workouts.length > 1 && <i>{workouts.length}</i>}
              </button>
            );
          })}
        </div>
      </div>

      {stats.balance.length > 0 && (
        <div className="card balance">
          <div className="section-title">Last 30 days</div>
          {stats.balance.map((b) => (
            <div key={b.name} className="bal-row">
              <span className="bal-name">
                {b.emoji} {b.name}
              </span>
              <span className="bal-bar">
                <span style={{ width: `${(b.count / maxBalance) * 100}%`, background: b.color }} />
              </span>
              <span className="bal-num">{b.count}</span>
            </div>
          ))}
        </div>
      )}

      {history.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">📅</div>
          <h2>No workouts yet</h2>
          <p>Finished workouts show up here.</p>
          <button className="btn primary" onClick={() => navigate('spin')}>
            🎡 Spin your first one
          </button>
        </div>
      ) : (
        <div className="history-list">
          {history.map((w) => (
            <HistoryRow key={w.id} w={w} onOpen={() => setOpenId(w.id)} />
          ))}
        </div>
      )}

      <WorkoutDetail workout={opened} onClose={() => setOpenId(null)} />
    </>
  );
}

function HistoryRow({ w, onOpen }: { w: Workout; onOpen: () => void }) {
  const effort = EFFORTS.find((e) => e.value === w.effort);
  const done = w.exercises.filter((e) => e.done).length;
  const prs = shownPRs(w).length;
  return (
    <button className="h-row" onClick={onOpen} style={{ '--c': w.categoryColor } as React.CSSProperties}>
      <span className="h-emoji">{w.categoryEmoji}</span>
      <span className="h-body">
        <span className="h-title">
          {w.categoryName} {w.spun && <span className="badge">🎡</span>}
          {prs > 0 && <span className="badge gold">🏆 {prs}</span>}
        </span>
        <span className="h-sub">
          {relativeDay(w.finishedAt ?? w.startedAt)} · {w.finishedAt ? formatDuration(w.finishedAt - w.startedAt) : '—'} · {done}/
          {w.exercises.length} exercises
        </span>
      </span>
      {effort && (
        <span className="h-effort" title={effort.label}>
          {effort.emoji}
        </span>
      )}
    </button>
  );
}

function WorkoutDetail({ workout, onClose }: { workout: Workout | null; onClose: () => void }) {
  const { settings, active, repeatWorkout, deleteWorkout } = useStore(
    useShallow((s) => ({ settings: s.settings, active: s.active, repeatWorkout: s.repeatWorkout, deleteWorkout: s.deleteWorkout })),
  );
  if (!workout) return null;
  const effort = EFFORTS.find((e) => e.value === workout.effort);
  const when = new Date(workout.finishedAt ?? workout.startedAt);
  return (
    <Sheet
      open
      onClose={onClose}
      title={
        <>
          {workout.categoryEmoji} {workout.categoryName}
        </>
      }
      footer={
        <div className="btn-row">
          <button
            className="btn danger-ghost"
            onClick={() => {
              if (window.confirm('Delete this workout from history?')) {
                deleteWorkout(workout.id);
                onClose();
              }
            }}
          >
            Delete
          </button>
          <button
            className="btn primary"
            onClick={() => {
              if (active && !window.confirm(`Replace your ${active.categoryName} workout in progress?`)) return;
              repeatWorkout(workout.id);
              onClose();
              navigate('workout');
            }}
          >
            ↻ Do it again
          </button>
        </div>
      }
    >
      <p className="muted">
        {when.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at{' '}
        {when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        {workout.finishedAt && ` · ${formatDuration(workout.finishedAt - workout.startedAt)}`}
        {workout.spun && ' · 🎡 picked by the wheel'}
      </p>
      {effort && (
        <div className="detail-effort">
          <span>{effort.emoji}</span> {effort.label}
        </div>
      )}
      {shownPRs(workout).length > 0 && (
        <div className="detail-prs">
          {shownPRs(workout).map((p) => (
            <div key={p.key + p.kind} className="detail-pr">
              🏆 <strong>{p.name}</strong> · {PR_LABELS[p.kind]} {formatMetric(p.kind, p.value, settings)}
              <small> (was {formatMetric(p.kind, p.previous, settings)})</small>
            </div>
          ))}
        </div>
      )}
      <ul className="detail-list">
        {workout.exercises.map((e) => (
          <li key={e.id} className={e.done ? 'done' : ''}>
            <span className="d-check">{e.done ? '✓' : '○'}</span>
            <span className="d-body">
              <span className="d-name">
                {KIND_ICONS[e.kind]} {e.name}
              </span>
              <span className="d-sub">{summarizeLog(e, settings)}</span>
            </span>
          </li>
        ))}
      </ul>
      {workout.notes && (
        <>
          <div className="section-title">Notes</div>
          <p className="notes">{workout.notes}</p>
        </>
      )}
    </Sheet>
  );
}
