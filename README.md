# Spin & Sweat 🎡

A mobile-first workout app for people who don't plan their workouts. Spin a prize wheel to pick
**what** to train, spin again to pick the **exercises**, then log the session.

## Features

- **Two-step spin.** The first wheel picks the workout type (Push, Pull, Legs, Core, Cardio,
  Full Body, Mobility). The second wheel, made of that type's exercises, spins once per exercise.
  Picked exercises grey out so they can't repeat. You can re-spin (⟳) any single exercise in the plan.
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
- **History.** Workouts this week, your day streak, a 5-week calendar, type balance over the
  last 30 days, and "Do it again" to repeat a past workout.
- **Library.** Add or edit workout types (name, emoji, colour) and exercises, and toggle anything
  on or off the wheel.
- **Settings.** Exercises per workout, rest yesterday's type, sound, vibration, kg/lb, km/mi.
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
