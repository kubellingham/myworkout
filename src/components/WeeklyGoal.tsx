import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../lib/store';
import { weekDays, weekStreak, workoutsInWeek } from '../lib/goals';
import { weekStart } from '../lib/utils';
import { Sheet, Stepper } from './ui';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function WeeklyGoal() {
  const { history, goal, updateSettings } = useStore(
    useShallow((s) => ({ history: s.history, goal: s.settings.weeklyGoal, updateSettings: s.updateSettings })),
  );
  const [editing, setEditing] = useState(false);
  const now = Date.now();
  const count = workoutsInWeek(history, weekStart(now)).length;
  const streak = weekStreak(history, goal, now);
  const days = weekDays(history, now);
  const hit = count >= goal;
  const r = 19;
  const circ = 2 * Math.PI * r;
  const frac = Math.min(1, count / goal);

  return (
    <>
      <button className={`goal-card${hit ? ' hit' : ''}`} onClick={() => setEditing(true)} aria-label={`${count} of ${goal} workouts this week. Change goal`}>
        <span className="goal-ring">
          <svg viewBox="0 0 48 48">
            <circle cx="24" cy="24" r={r} className="goal-track" />
            <circle
              cx="24"
              cy="24"
              r={r}
              className="goal-fill"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - frac)}
              transform="rotate(-90 24 24)"
            />
          </svg>
          <span className="goal-count">{hit ? '✓' : count}</span>
        </span>
        <span className="goal-text">
          <strong>{hit ? 'Goal hit! 🎉' : `${count} of ${goal} this week`}</strong>
          <span className="goal-sub">
            {streak > 0 ? `🔥 ${streak}-week streak` : hit ? 'Anything more is a bonus' : `${goal - count} more workout${goal - count === 1 ? '' : 's'} to go`}
          </span>
        </span>
        <span className="goal-days" aria-hidden>
          {days.map((d, i) => (
            <span key={d.day} className={`${d.done ? 'done' : ''}${d.today ? ' today' : ''}${d.future ? ' future' : ''}`}>
              {DOW[i]}
            </span>
          ))}
        </span>
      </button>
      <Sheet open={editing} onClose={() => setEditing(false)} title="Weekly goal">
        <p className="muted">How many workouts do you want to do each week? Hit it every week to build a streak.</p>
        <div className="goal-edit">
          <Stepper value={goal} min={1} max={14} onChange={(v) => updateSettings({ weeklyGoal: v })} suffix="/ week" />
        </div>
      </Sheet>
    </>
  );
}
