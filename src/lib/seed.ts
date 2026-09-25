import type { Category, Exercise, ExerciseDefaults, ExerciseKind, IntervalConfig, Settings } from './types';
import { uid } from './utils';

export const DEFAULT_SETTINGS: Settings = {
  exercisesPerWorkout: 4,
  sound: true,
  vibration: true,
  avoidRepeat: true,
  weightUnit: 'kg',
  distanceUnit: 'km',
  heightCm: null,
  weeklyGoal: 3,
  restTimer: true,
  restSeconds: 90,
};

/** Bump when the built-in library grows; saved data and old backups are upgraded to it. */
export const LIBRARY_VERSION = 2;

export const CATEGORY_COLORS = [
  '#ff6b6b',
  '#4da3ff',
  '#ffb020',
  '#b57bff',
  '#2ed39a',
  '#ff7ac6',
  '#3fd0e0',
  '#c6e23a',
  '#ff8f3f',
  '#8f9bff',
];

export function interval(
  steps: [string, number][],
  rounds: number,
  warmup = 0,
  cooldown = 0,
): IntervalConfig {
  return {
    warmup,
    cooldown,
    rounds,
    steps: steps.map(([label, seconds]) => ({ id: uid(), label, seconds })),
  };
}

type SeedExercise = [name: string, kind: ExerciseKind, defaults?: ExerciseDefaults];

/** Sets × reps, with an optional rest (seconds) for heavy lifts. */
const S = (sets: number, reps: number, rest?: number): ExerciseDefaults => (rest ? { sets, reps, rest } : { sets, reps });
/** Minutes, optional distance. */
const C = (minutes: number, distance?: number): ExerciseDefaults => ({ minutes, distance });
/** Interval: steps per round, rounds, optional warm-up / cool-down seconds. */
const I = (steps: [string, number][], rounds: number, warmup = 0, cooldown = 0): ExerciseDefaults => ({
  interval: interval(steps, rounds, warmup, cooldown),
});

const str = (name: string, d: ExerciseDefaults): SeedExercise => [name, 'strength', d];
const car = (name: string, d: ExerciseDefaults): SeedExercise => [name, 'cardio', d];
const int = (name: string, d: ExerciseDefaults): SeedExercise => [name, 'interval', d];
const chk = (name: string): SeedExercise => [name, 'check'];

interface SeedCategory {
  name: string;
  emoji: string;
  color: string;
  /** The original library (v1). */
  exercises: SeedExercise[];
  /** Added in library v2. */
  more: SeedExercise[];
}

const SEED: SeedCategory[] = [
  {
    name: 'Push',
    emoji: '💪',
    color: CATEGORY_COLORS[0],
    exercises: [
      str('Bench Press', S(4, 8, 150)),
      str('Push-ups', S(3, 15)),
      str('Overhead Press', S(4, 8, 150)),
      str('Incline DB Press', S(3, 10)),
      str('Dips', S(3, 10)),
      str('Lateral Raises', S(3, 12)),
      str('Triceps Pushdown', S(3, 12)),
    ],
    more: [
      str('Dumbbell Bench Press', S(3, 10)),
      str('Incline Bench Press', S(4, 8, 120)),
      str('Decline Bench Press', S(3, 10)),
      str('Close-Grip Bench Press', S(3, 8, 120)),
      str('Machine Chest Press', S(3, 12)),
      str('Arnold Press', S(3, 10)),
      str('Seated DB Shoulder Press', S(3, 10)),
      str('Push Press', S(4, 5, 150)),
      str('Landmine Press', S(3, 10)),
      str('Cable Chest Fly', S(3, 12)),
      str('Dumbbell Fly', S(3, 12)),
      str('Pec Deck', S(3, 12)),
      str('Front Raises', S(3, 12)),
      str('Cable Lateral Raise', S(3, 15)),
      str('Skull Crushers', S(3, 10)),
      str('Overhead Triceps Extension', S(3, 12)),
      str('Triceps Kickbacks', S(3, 12)),
      str('Diamond Push-ups', S(3, 12)),
      str('Incline Push-ups', S(3, 15)),
      str('Decline Push-ups', S(3, 12)),
      str('Pike Push-ups', S(3, 10)),
      str('Bench Dips', S(3, 15)),
      int('Wall Handstand Hold', I([['Hold', 30], ['Rest', 45]], 4)),
    ],
  },
  {
    name: 'Pull',
    emoji: '🧗',
    color: CATEGORY_COLORS[1],
    exercises: [
      str('Pull-ups', S(4, 6, 120)),
      str('Barbell Row', S(4, 8, 120)),
      str('Lat Pulldown', S(3, 10)),
      str('Seated Cable Row', S(3, 10)),
      str('Face Pulls', S(3, 15)),
      str('Biceps Curls', S(3, 12)),
      str('Hammer Curls', S(3, 12)),
    ],
    more: [
      str('Chin-ups', S(4, 6, 120)),
      str('Neutral-Grip Pull-ups', S(3, 8, 120)),
      str('Assisted Pull-ups', S(3, 10)),
      str('Inverted Row', S(3, 12)),
      str('Dumbbell Row', S(3, 10)),
      str('Pendlay Row', S(4, 6, 150)),
      str('T-Bar Row', S(4, 8, 120)),
      str('Chest-Supported Row', S(3, 10)),
      str('Single-Arm Cable Row', S(3, 12)),
      str('Straight-Arm Pulldown', S(3, 12)),
      str('Close-Grip Lat Pulldown', S(3, 10)),
      str('Rear Delt Fly', S(3, 15)),
      str('Reverse Pec Deck', S(3, 15)),
      str('Shrugs', S(3, 12)),
      str('Rack Pulls', S(3, 5, 180)),
      str('Preacher Curls', S(3, 10)),
      str('Incline DB Curls', S(3, 10)),
      str('Cable Curls', S(3, 12)),
      str('Concentration Curls', S(3, 12)),
      str('EZ-Bar Curls', S(3, 10)),
      str('Reverse Curls', S(3, 12)),
      str('Band Pull-Aparts', S(3, 20)),
      str('Scapular Pull-ups', S(3, 10)),
      int('Dead Hang', I([['Hang', 30], ['Rest', 45]], 3)),
    ],
  },
  {
    name: 'Legs',
    emoji: '🦵',
    color: CATEGORY_COLORS[2],
    exercises: [
      str('Back Squat', S(4, 8, 180)),
      str('Romanian Deadlift', S(3, 10, 120)),
      str('Walking Lunges', S(3, 12)),
      str('Leg Press', S(3, 12)),
      str('Bulgarian Split Squat', S(3, 10)),
      str('Calf Raises', S(4, 15)),
      str('Glute Bridge', S(3, 15)),
    ],
    more: [
      str('Front Squat', S(4, 6, 180)),
      str('Goblet Squat', S(3, 12)),
      str('Hack Squat', S(3, 10, 120)),
      str('Sumo Deadlift', S(4, 5, 180)),
      str('Hip Thrust', S(4, 10, 120)),
      str('Leg Extension', S(3, 12)),
      str('Lying Leg Curl', S(3, 12)),
      str('Seated Leg Curl', S(3, 12)),
      str('Reverse Lunges', S(3, 10)),
      str('Curtsy Lunges', S(3, 12)),
      str('Step-ups', S(3, 10)),
      str('Split Squat', S(3, 10)),
      str('Sumo Squat', S(3, 12)),
      str('Single-Leg RDL', S(3, 10)),
      str('Good Mornings', S(3, 10)),
      str('Seated Calf Raise', S(3, 15)),
      str('Nordic Curls', S(3, 5)),
      str('Cossack Squat', S(3, 8)),
      str('Pistol Squat', S(3, 5)),
      str('Box Jumps', S(4, 6)),
      str('Jump Squats', S(3, 12)),
      str('Hip Abduction', S(3, 15)),
      str('Cable Kickbacks', S(3, 12)),
      int('Wall Sit', I([['Hold', 45], ['Rest', 30]], 4)),
    ],
  },
  {
    name: 'Core',
    emoji: '🎯',
    color: CATEGORY_COLORS[3],
    exercises: [
      int('Plank', I([['Hold', 45], ['Rest', 15]], 3)),
      str('Hanging Leg Raises', S(3, 10)),
      str('Russian Twists', S(3, 20)),
      str('Dead Bug', S(3, 12)),
      int('Mountain Climbers', I([['Climb', 30], ['Rest', 30]], 4)),
      str('Ab Wheel', S(3, 10)),
    ],
    more: [
      int('Side Plank', I([['Left side', 30], ['Right side', 30], ['Rest', 20]], 3)),
      str('Crunches', S(3, 20)),
      str('Bicycle Crunches', S(3, 20)),
      str('Cable Crunch', S(3, 15)),
      str('Lying Leg Raises', S(3, 15)),
      str('Reverse Crunches', S(3, 15)),
      str('Hanging Knee Raises', S(3, 12)),
      str('Toes to Bar', S(3, 8)),
      str('V-ups', S(3, 12)),
      str('Sit-ups', S(3, 20)),
      str('Heel Taps', S(3, 20)),
      str('Windshield Wipers', S(3, 10)),
      str('Pallof Press', S(3, 12)),
      str('Woodchoppers', S(3, 12)),
      str('Bird Dog', S(3, 12)),
      str('Plank Shoulder Taps', S(3, 20)),
      str('Stir the Pot', S(3, 10)),
      int('Hollow Body Hold', I([['Hold', 30], ['Rest', 30]], 4)),
      int('Flutter Kicks', I([['Kick', 30], ['Rest', 15]], 4)),
      int('L-Sit Hold', I([['Hold', 15], ['Rest', 45]], 4)),
      int('Superman Hold', I([['Hold', 30], ['Rest', 30]], 3)),
      int('Bear Plank', I([['Hold', 30], ['Rest', 30]], 3)),
      int('Copenhagen Plank', I([['Left side', 20], ['Right side', 20], ['Rest', 30]], 3)),
      chk('Suitcase Carry'),
    ],
  },
  {
    name: 'Cardio',
    emoji: '🏃',
    color: CATEGORY_COLORS[4],
    exercises: [
      int('Run / Walk Intervals', I([['Run', 60], ['Walk', 120]], 6, 180, 180)),
      car('Easy Run', C(30, 5)),
      car('Cycling', C(40, 15)),
      int('Jump Rope', I([['Jump', 60], ['Rest', 30]], 8)),
      car('Rowing', C(20, 4)),
      int('Tabata Sprints', I([['Sprint', 20], ['Rest', 10]], 8, 120, 120)),
      car('Stair Climber', C(15)),
    ],
    more: [
      car('Tempo Run', C(25, 5)),
      car('Long Run', C(60, 10)),
      car('Fartlek Run', C(30, 5)),
      int('Hill Sprints', I([['Sprint up', 20], ['Walk down', 90]], 8, 300, 180)),
      int('400 m Repeats', I([['Run', 90], ['Rest', 90]], 6, 300, 180)),
      car('Brisk Walk', C(45, 4)),
      car('Incline Treadmill Walk', C(30)),
      car('Hiking', C(90, 6)),
      car('Elliptical', C(30)),
      car('Swimming', C(30, 1)),
      int('Bike Intervals', I([['Sprint', 30], ['Easy', 90]], 8, 300, 300)),
      int('Rowing Intervals', I([['Hard', 60], ['Easy', 60]], 8, 180, 120)),
      int('Assault Bike Sprints', I([['Sprint', 20], ['Rest', 40]], 10, 180)),
      int('Ski Erg Intervals', I([['Pull', 40], ['Rest', 20]], 10, 120)),
      int('Jumping Jacks', I([['Jacks', 45], ['Rest', 15]], 5)),
      int('High Knees', I([['High knees', 30], ['Rest', 30]], 6)),
      int('Skater Jumps', I([['Skate', 30], ['Rest', 30]], 6)),
      int('Stair Sprints', I([['Run up', 30], ['Walk down', 60]], 8)),
      int('Shadow Boxing', I([['Box', 180], ['Rest', 60]], 5)),
      int('Heavy Bag Rounds', I([['Punch', 180], ['Rest', 60]], 5)),
      car('Dance Workout', C(30)),
    ],
  },
  {
    name: 'Full Body',
    emoji: '🔥',
    color: CATEGORY_COLORS[5],
    exercises: [
      str('Deadlift', S(4, 5, 180)),
      str('Burpees', S(3, 12)),
      str('Kettlebell Swings', S(4, 15)),
      str('Thrusters', S(3, 10)),
      str('Clean & Press', S(4, 6, 120)),
      int('Circuit 40/20', I([['Work', 40], ['Rest', 20]], 10)),
      chk("Farmer's Carry"),
    ],
    more: [
      str('Power Clean', S(5, 3, 150)),
      str('Hang Clean', S(4, 4, 120)),
      str('Dumbbell Snatch', S(4, 6)),
      str('Kettlebell Snatch', S(4, 8)),
      str('Kettlebell Clean & Press', S(3, 8)),
      str('Turkish Get-up', S(3, 3)),
      str('Man Makers', S(3, 8)),
      str('Devil Press', S(3, 8)),
      str('Wall Balls', S(3, 15)),
      str('Medicine Ball Slams', S(3, 12)),
      str('Squat to Press', S(3, 12)),
      str('Renegade Rows', S(3, 10)),
      str('Burpee Pull-ups', S(3, 8)),
      str('Sprawls', S(3, 10)),
      str('Tire Flips', S(3, 8)),
      int('Battle Ropes', I([['Waves', 30], ['Rest', 30]], 8)),
      int('Sled Push', I([['Push', 20], ['Rest', 60]], 6)),
      int('Bear Crawl', I([['Crawl', 30], ['Rest', 30]], 5)),
      int('EMOM 12', I([['Every minute', 60]], 12)),
      int('Tabata Full Body', I([['Work', 20], ['Rest', 10]], 8, 120)),
      car('AMRAP 20', C(20)),
      chk('Sandbag Carry'),
    ],
  },
  {
    name: 'Mobility',
    emoji: '🧘',
    color: CATEGORY_COLORS[6],
    exercises: [
      car('Yoga Flow', C(20)),
      chk('Hip Openers'),
      int('Hamstring Stretch', I([['Stretch', 30], ['Switch', 10]], 4)),
      car('Foam Rolling', C(10)),
      chk("World's Greatest Stretch"),
      chk('Cat-Cow'),
    ],
    more: [
      str('90/90 Hip Switches', S(3, 10)),
      int('Pigeon Pose', I([['Left', 60], ['Right', 60]], 2)),
      int('Couch Stretch', I([['Left', 60], ['Right', 60]], 2)),
      int('Hip Flexor Stretch', I([['Left', 45], ['Right', 45]], 2)),
      int("Child's Pose", I([['Hold', 60], ['Rest', 15]], 2)),
      int('Deep Squat Hold', I([['Hold', 60], ['Rest', 30]], 3)),
      int('Frog Stretch', I([['Hold', 60], ['Rest', 20]], 2)),
      int('Butterfly Stretch', I([['Hold', 45], ['Rest', 15]], 3)),
      int('Doorway Chest Stretch', I([['Hold', 45], ['Rest', 15]], 2)),
      int('Lat Stretch', I([['Left', 30], ['Right', 30]], 2)),
      str('Thoracic Rotations', S(2, 10)),
      str('Band Shoulder Dislocates', S(2, 15)),
      str('Downward Dog to Cobra', S(2, 10)),
      str('Scorpion Stretch', S(2, 10)),
      str('Ankle Mobility Drill', S(2, 10)),
      str('Jefferson Curl', S(2, 8)),
      chk('Wrist Mobility'),
      chk('Neck Rolls'),
      chk('Sun Salutations'),
      int('Box Breathing', I([['Inhale', 4], ['Hold', 4], ['Exhale', 4], ['Hold', 4]], 10)),
      car('Pilates', C(30)),
      car('Stretching Routine', C(15)),
    ],
  },
];

function toExercise([name, kind, defaults]: SeedExercise, categoryId: string): Exercise {
  return { id: uid(), name, categoryId, kind, inWheel: true, defaults: defaults ?? {} };
}

export function createSeed(): { categories: Category[]; exercises: Exercise[] } {
  const categories: Category[] = [];
  const exercises: Exercise[] = [];
  for (const c of SEED) {
    const id = uid();
    categories.push({ id, name: c.name, emoji: c.emoji, color: c.color, inWheel: true });
    for (const e of [...c.exercises, ...c.more]) exercises.push(toExercise(e, id));
  }
  return { categories, exercises };
}

/**
 * Bring a library saved before v2 up to date: add the exercises new in v2 to their groups.
 * Groups are matched by name (or emoji if renamed). Exercises that already exist by name
 * anywhere are skipped, and v1 exercises the user deleted stay deleted.
 */
export function upgradeLibrary(categories: Category[], exercises: Exercise[], fromVersion: number): Exercise[] {
  if (fromVersion >= LIBRARY_VERSION) return exercises;
  const have = new Set(exercises.map((e) => e.name.trim().toLowerCase()));
  const added: Exercise[] = [];
  for (const c of SEED) {
    const cat =
      categories.find((x) => x.name.trim().toLowerCase() === c.name.toLowerCase()) ??
      categories.find((x) => x.emoji === c.emoji);
    if (!cat) continue;
    for (const e of c.more) {
      const key = e[0].toLowerCase();
      if (have.has(key)) continue;
      have.add(key);
      added.push(toExercise(e, cat.id));
    }
  }
  return [...exercises, ...added];
}

export function seedCount(): number {
  return SEED.reduce((n, c) => n + c.exercises.length + c.more.length, 0);
}

export function defaultsForKind(kind: ExerciseKind): ExerciseDefaults {
  switch (kind) {
    case 'strength':
      return S(3, 10);
    case 'cardio':
      return C(20);
    case 'interval':
      return I([['Work', 60], ['Rest', 120]], 6);
    case 'check':
      return {};
  }
}
