import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../lib/store';
import type { BodyEntry } from '../../lib/types';
import {
  BMI_BANDS,
  bmi,
  bmiBand,
  fromDisplayWeight,
  movingAverage,
  round1,
  toDisplayWeight,
  trendChange,
  waistToHeight,
  weighIns,
} from '../../lib/body';
import { fmtNum, relativeDay, startOfDay } from '../../lib/utils';
import { NumberField, Segmented, Sheet } from '../../components/ui';
import { LineChart } from '../../components/LineChart';

const DAY = 86400000;
const AVG_COLOR = '#3987e5';
const DOT_COLOR = '#d95926';
type Range = '30' | '90' | '365' | 'all';

const toInputDate = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fromInputDate = (v: string) => {
  const [y, m, d] = v.split('-').map(Number);
  const ts = new Date(y, m - 1, d, 12).getTime();
  return startOfDay(ts) === startOfDay(Date.now()) ? Date.now() : ts;
};
const shortDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function BodyView() {
  const { body, settings, updateSettings } = useStore(
    useShallow((s) => ({ body: s.body, settings: s.settings, updateSettings: s.updateSettings })),
  );
  const unit = settings.weightUnit;
  const [range, setRange] = useState<Range>('90');
  const [editing, setEditing] = useState<BodyEntry | 'new' | null>(null);
  const [heightDraft, setHeightDraft] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const points = useMemo(() => weighIns(body), [body]);
  const avg = useMemo(() => movingAverage(points), [points]);
  const latest = points.at(-1);
  const trend = useMemo(() => trendChange(body, 30), [body]);
  const latestWaist = body.find((b) => b.waist != null)?.waist ?? null;
  const height = settings.heightCm;
  const bmiValue = latest && height ? bmi(latest.weight, height) : null;
  const band = bmiValue != null ? bmiBand(bmiValue) : null;

  const cutoff = range === 'all' ? -Infinity : (latest?.date ?? Date.now()) - Number(range) * DAY;
  const w = (kg: number) => round1(toDisplayWeight(kg, unit));

  return (
    <>
      {!height && (
        <div className="card height-card">
          <div>
            <strong>Add your height</strong>
            <p className="muted small">It's only used to work out your BMI.</p>
          </div>
          <div className="inline-form">
            <NumberField className="short" value={heightDraft} decimal placeholder="cm" onChange={setHeightDraft} ariaLabel="Height in cm" />
            <button
              className="btn primary small"
              disabled={!heightDraft || heightDraft < 50 || heightDraft > 260}
              onClick={() => updateSettings({ heightCm: heightDraft })}
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="stats">
        <div className="stat">
          <div className="stat-num">{latest ? fmtNum(w(latest.weight)) : '–'}</div>
          <div className="stat-label">{unit}{latest ? ` · ${relativeDay(latest.date).toLowerCase()}` : ''}</div>
        </div>
        <div className="stat">
          <div className="stat-num">
            {trend ? `${trend.change > 0 ? '+' : trend.change < 0 ? '−' : ''}${fmtNum(Math.abs(w(trend.change)))}` : '–'}
          </div>
          <div className="stat-label">
            {trend ? (Date.now() - trend.since > 29 * DAY ? '30-day trend' : 'since start') : 'trend'}
          </div>
        </div>
        <div className="stat">
          <div className="stat-num">{bmiValue != null ? fmtNum(round1(bmiValue)) : '–'}</div>
          <div className="stat-label">BMI</div>
        </div>
      </div>

      <button className="btn primary wide" onClick={() => setEditing('new')}>
        ⚖️ Log weigh-in
      </button>

      {points.length > 0 && (
        <div className="card">
          <div className="card-head">
            <div className="section-title">Weight ({unit})</div>
            <Segmented<Range>
              value={range}
              onChange={setRange}
              options={[
                { value: '30', label: '1M' },
                { value: '90', label: '3M' },
                { value: '365', label: '1Y' },
                { value: 'all', label: 'All' },
              ]}
            />
          </div>
          {points.filter((p) => p.date >= cutoff).length >= 2 ? (
            <LineChart
              ariaLabel={`Body weight over time with 7-day average. Latest ${fmtNum(w(latest!.weight))} ${unit}.`}
              series={[
                {
                  id: 'raw',
                  label: 'Weigh-in',
                  color: DOT_COLOR,
                  kind: 'dots',
                  points: points.filter((p) => p.date >= cutoff).map((p) => ({ x: p.date, y: w(p.weight) })),
                },
                {
                  id: 'avg',
                  label: '7-day average',
                  color: AVG_COLOR,
                  kind: 'line',
                  points: avg.filter((p) => p.date >= cutoff).map((p) => ({ x: p.date, y: w(p.avg) })),
                },
              ]}
              endLabel="avg"
              formatY={(v) => fmtNum(round1(v))}
              formatX={shortDate}
            />
          ) : (
            <p className="muted small">Log a couple of weigh-ins to see your trend. Same time of day works best, e.g. mornings.</p>
          )}
        </div>
      )}

      {bmiValue != null && band && (
        <div className="card">
          <div className="section-title">BMI</div>
          <div className="bmi-head">
            <strong className="bmi-value">{fmtNum(round1(bmiValue))}</strong>
            <span className="status-label">
              <i className={`status-dot ${band.status}`} />
              {band.label}
            </span>
          </div>
          <BmiGauge value={bmiValue} />
          <p className="muted small">
            BMI can't tell muscle from fat. If you're lifting, it can go up while you get leaner, so watch your waist
            too.
          </p>
        </div>
      )}

      {latestWaist != null && (
        <div className="card">
          <div className="section-title">Waist</div>
          <div className="bmi-head">
            <strong className="bmi-value">{fmtNum(latestWaist)} cm</strong>
            {height && (
              <span className="status-label">
                <i className={`status-dot ${waistToHeight(latestWaist, height) < 0.5 ? 'good' : 'warning'}`} />
                {fmtNum(Math.round(waistToHeight(latestWaist, height) * 100) / 100)} of height
              </span>
            )}
          </div>
          <p className="muted small">A common guideline: keep your waist under half your height (below 0.5).</p>
        </div>
      )}

      {body.length > 0 && (
        <section>
          <div className="section-title">Weigh-ins</div>
          <div className="list">
            {(showAll ? body : body.slice(0, 10)).map((e, i) => {
              const prev = body.slice(i + 1).find((b) => b.weight != null);
              const delta = e.weight != null && prev?.weight != null ? w(e.weight) - w(prev.weight) : null;
              return (
                <div key={e.id} className="list-row" role="button" tabIndex={0} onClick={() => setEditing(e)}>
                  <span className="lr-body">
                    <span className="lr-title">{e.weight != null ? `${fmtNum(w(e.weight))} ${unit}` : '—'}</span>
                    <span className="lr-sub">
                      {new Date(e.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      {e.waist != null && ` · waist ${fmtNum(e.waist)} cm`}
                    </span>
                  </span>
                  {delta != null && Math.abs(delta) >= 0.05 && (
                    <span className="delta">
                      {delta > 0 ? '▲' : '▼'} {fmtNum(Math.abs(round1(delta)))}
                    </span>
                  )}
                  <span className="chev">›</span>
                </div>
              );
            })}
          </div>
          {body.length > 10 && !showAll && (
            <button className="btn ghost small show-all" onClick={() => setShowAll(true)}>
              Show all {body.length} weigh-ins
            </button>
          )}
        </section>
      )}

      {body.length === 0 && (
        <div className="empty">
          <div className="empty-emoji">⚖️</div>
          <h2>No weigh-ins yet</h2>
          <p>Log your weight (and waist, if you like) to see your trend.</p>
        </div>
      )}

      <WeighInSheet entry={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function BmiGauge({ value }: { value: number }) {
  const min = 15;
  const max = 35;
  const pos = (v: number) => ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 100;
  return (
    <div className="bmi-gauge" aria-hidden>
      <div className="bmi-track">
        {BMI_BANDS.map((b) => (
          <span
            key={b.label}
            className={`bmi-band ${b.status}`}
            style={{ left: `${pos(b.from)}%`, width: `${pos(b.to) - pos(b.from)}%` }}
          />
        ))}
        <span className="bmi-marker" style={{ left: `${pos(value)}%` }} />
      </div>
      <div className="bmi-scale">
        {[18.5, 25, 30].map((v) => (
          <span key={v} style={{ left: `${pos(v)}%` }}>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

function WeighInSheet({ entry, onClose }: { entry: BodyEntry | 'new' | null; onClose: () => void }) {
  const { body, settings, saveBodyEntry, deleteBodyEntry } = useStore(
    useShallow((s) => ({
      body: s.body,
      settings: s.settings,
      saveBodyEntry: s.saveBodyEntry,
      deleteBodyEntry: s.deleteBodyEntry,
    })),
  );
  const unit = settings.weightUnit;
  const [date, setDate] = useState(toInputDate(Date.now()));
  const [weight, setWeight] = useState<number | null>(null);
  const [waist, setWaist] = useState<number | null>(null);
  const existing = entry && entry !== 'new' ? entry : null;

  useEffect(() => {
    if (!entry) return;
    const src = existing ?? body[0];
    setDate(toInputDate(existing?.date ?? Date.now()));
    setWeight(src?.weight != null ? round1(toDisplayWeight(src.weight, unit)) : null);
    setWaist(existing ? existing.waist : null);
  }, [entry]);

  if (!entry) return null;
  const sameDay = !existing && body.find((b) => startOfDay(b.date) === startOfDay(fromInputDate(date)));

  return (
    <Sheet
      open
      onClose={onClose}
      title={existing ? 'Edit weigh-in' : 'Log weigh-in'}
      footer={
        <div className="btn-row">
          {existing && (
            <button
              className="btn danger-ghost"
              onClick={() => {
                if (window.confirm('Delete this weigh-in?')) {
                  deleteBodyEntry(existing.id);
                  onClose();
                }
              }}
            >
              Delete
            </button>
          )}
          <button
            className="btn primary"
            disabled={weight == null && waist == null}
            onClick={() => {
              saveBodyEntry(
                {
                  date: fromInputDate(date),
                  weight: weight != null ? fromDisplayWeight(weight, unit) : null,
                  waist,
                },
                existing?.id,
              );
              onClose();
            }}
          >
            Save
          </button>
        </div>
      }
    >
      <label className="field">
        <span>Date</span>
        <input
          className="text-input"
          type="date"
          value={date}
          max={toInputDate(Date.now())}
          onChange={(e) => e.target.value && setDate(e.target.value)}
        />
      </label>
      <div className="defaults-grid">
        <label>
          <span>Weight ({unit})</span>
          <NumberField value={weight} decimal placeholder="e.g. 72.5" onChange={setWeight} className="big-num" />
        </label>
        <label>
          <span>Waist (cm) · optional</span>
          <NumberField value={waist} decimal placeholder="optional" onChange={setWaist} className="big-num" />
        </label>
      </div>
      {sameDay && <p className="muted small">You already logged this day, so saving will replace it.</p>}
      <p className="muted small">Tip: weigh yourself at the same time each day, e.g. in the morning before breakfast.</p>
    </Sheet>
  );
}
