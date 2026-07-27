export interface BoneRotation {
  boneName: string;
  rotation: [number, number, number]; // [x, y, z] w radianach
}

export interface PoseKeyframe {
  beatOffset: number; // uderzenie w siatce 8-liczenia (0.0 - 8.0)
  rotations: BoneRotation[];
}

export interface DanceMoveBlock {
  id: string;
  name: string;
  style: 'Hip-Hop' | 'Commercial' | 'Breakdance' | 'High Heels' | 'K-Pop';
  difficulty: 'Początkujący' | 'Średniozaawansowany' | 'Zaawansowany';
  nativeBPM: number;
  durationBeats: number; // standardowo 8 liczeń
  description: string;
  tags: string[];
  keyframes: PoseKeyframe[];
  /** Nazwa klipu MoCap z katalogu (np. 'hiphop_bounce'). Gdy podana, MotionEngine ładuje GLB zamiast proceduralnych keyframes. */
  clipName?: string;
  /** URL do pliku GLB z animacją MoCap. Opcjonalny — jeśli brak, MotionEngine szuka w domyślnym katalogu. */
  clipUrl?: string;
}

export interface ChoreographySequence {
  id: string;
  title: string;
  style?: string;
  targetBPM: number;
  blocks: DanceMoveBlock[];
}

// Spójna i bogata baza klocków tanecznych synchronizowana z backendem i szybkim generowaniem
export const DANCE_MOVE_LIBRARY: DanceMoveBlock[] = [
  {
    id: 'hiphop_bounce',
    name: 'Hip-Hop Bounce Groove',
    style: 'Hip-Hop',
    difficulty: 'Początkujący',
    nativeBPM: 100,
    durationBeats: 8,
    description: 'Głęboki groove z opadaniem klatki piersiowej i bouncem bioder.',
    tags: ['hiphop', 'bounce', 'groove'],
    clipName: 'hiphop_bounce',
    keyframes: []
  },
  {
    id: 'bboy_footwork',
    name: 'B-Boy Toprock Indian Step',
    style: 'Breakdance',
    difficulty: 'Średniozaawansowany',
    nativeBPM: 112,
    durationBeats: 8,
    description: 'Klasyczny Indian Step z szerokim otwarciem ramion i skrętem bioder.',
    tags: ['bboy', 'street', 'toprock'],
    clipName: 'bboy_footwork',
    keyframes: []
  },
  {
    id: 'kpop_isolation',
    name: 'K-Pop Sharp Isolation',
    style: 'K-Pop',
    difficulty: 'Zaawansowany',
    nativeBPM: 120,
    durationBeats: 8,
    description: 'Precyzyjne i ostre blokady ramion z popem klatki piersiowej.',
    tags: ['kpop', 'isolation', 'sharp'],
    clipName: 'kpop_isolation',
    keyframes: []
  },
  {
    id: 'commercial_wave',
    name: 'Commercial Fluid Body Wave',
    style: 'Commercial',
    difficulty: 'Średniozaawansowany',
    nativeBPM: 108,
    durationBeats: 8,
    description: 'Płynna fala przechodząca od głowy przez kręgosłup do bioder.',
    tags: ['wave', 'commercial', 'fluid'],
    clipName: 'commercial_wave',
    keyframes: []
  },
  {
    id: 'heels_strut',
    name: 'High Heels Sassy Strut',
    style: 'High Heels',
    difficulty: 'Średniozaawansowany',
    nativeBPM: 104,
    durationBeats: 8,
    description: 'Zmysłowy krok chodu w obcasach z hip-popami.',
    tags: ['heels', 'sassy', 'strut'],
    clipName: 'heels_strut',
    keyframes: []
  }
];

export const DEFAULT_CHOREOGRAPHY_SEQUENCE: ChoreographySequence = {
  id: 'seq_demo_01',
  title: 'Hip-Hop & Commercial Basic Routine',
  targetBPM: 104,
  blocks: [
    DANCE_MOVE_LIBRARY[0], // Hip-Hop Bounce
    DANCE_MOVE_LIBRARY[1], // B-Boy Footwork
    DANCE_MOVE_LIBRARY[2], // K-Pop Isolation
    DANCE_MOVE_LIBRARY[3]  // Commercial Wave
  ]
};
