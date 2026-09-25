# Spin & Sweat 🎡

A mobile-first workout app for people who don't plan their workouts. Spin a prize wheel to pick
**what** to train, spin again to pick the **exercises**, then log the session.

## Features

- **Two-step spin.** The first wheel picks the workout type (Push, Pull, Legs, Core, Cardio,
  Full Body, Mobility). The second wheel, made of that type's exercises, spins once per exercise.
  Picked exercises grey out so they can't repeat. You can re-spin (⟳) any single exercise in the plan.
- **Mix mode.** Tap "🎲 Mix it up" to put every exercise that's switched on for spins, from every
  group, on one wheel. A live readout above the wheel shows each exercise as it passes the pointer.
- **Wheel animation.** Tap SPIN or flick the wheel with your finger. It has an ease-out
  spin, a flapper that clicks on every peg, blinking bulbs, a winner highlight and confetti.
  Android phones also vibrate.
- **Workout logger.** Each exercise can be tracked one of four ways:
  - 🏋️ sets × reps × weight, pre-filled from last time
  - ⏱️ time and distance
  - 🔁 interval timer
  - ✅ just mark it done
- **Interval timer.** Set a warm-up, any number of steps per round (e.g. *Run 1:00 / Walk 2:00*),
  the number of rounds, and a cool-down. The timer is full-screen, changes colour per phase,
  beeps a 3-2-1 countdown, can pause, skip and go back, and keeps the screen awake.
  Edit the times during a workout and tick "Remember for next time".
- **Finish.** Rate how the workout felt (1–5) and add notes.
- **Rest timer.** Tick a set and a countdown starts (90 s by default, and each exercise can have
  its own). It has −15 / +15 / skip buttons and a 3-2-1 beep.
- **Personal records.** You get confetti and a 🏆 when you beat your heaviest weight, your most reps
  (bodyweight), or your longest distance or time. Each exercise also has a progress chart.
- **Weekly goal.** A ring on the Spin screen shows e.g. "2 of 3 this week", plus your week streak.
- **Progress tab.**
  - *Workouts:* this week vs goal, week streak, a 5-week calendar, type balance, and "Do it again".
  - *Records:* your latest PRs and your best for each exercise.
  - *Body:* weigh-ins with a 7-day average trend chart, BMI (from your height), and an optional
    waist measurement with the waist-to-height guideline.
- **Library.** About 200 built-in exercises across 7 groups: barbell, dumbbell, cable, machine,
  kettlebell, bodyweight, cardio intervals and mobility. You can search them, add or edit workout
  types (name, emoji, colour) and exercises, and switch anything, or a whole group, on or off the wheel.
- **Settings.** Exercises per workout, weekly goal, rest timer, height, rest yesterday's type, sound,
  vibration, kg/lb, km/mi.
- **Your data stays on your phone** (localStorage). Use Library → Backup to export and import a JSON file.
- **Installable PWA.** It works offline. On iPhone, open it in Safari, tap Share, then *Add to Home Screen*.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (vitest)
npm run build      # typecheck + production build to dist/
```

Stack: Vite, React 19, TypeScript, Zustand (persisted to localStorage), vite-plugin-pwa, canvas-confetti.

## Deploy to Vercel

Import this repo in Vercel. It detects Vite automatically: the build command is `npm run build`
and the output folder is `dist` (see `vercel.json`). Every push to the production branch redeploys.
