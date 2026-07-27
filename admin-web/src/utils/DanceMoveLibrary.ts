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

// Bogata baza klocków tanecznych dla szkół tańca
export const DANCE_MOVE_LIBRARY: DanceMoveBlock[] = [
  {
    id: 'hiphop_toprock_cross',
    name: 'Toprock Cross Step',
    style: 'Hip-Hop',
    difficulty: 'Początkujący',
    nativeBPM: 100,
    durationBeats: 8,
    description: 'Dynamiczny krok otwarcia z krzyżowaniem nóg i pracą ramion w rytmie bounce.',
    tags: ['toprock', 'bounce', 'footwork'],
    clipName: 'hiphop_bounce',
    keyframes: [
      {
        beatOffset: 0,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0.1, 0, 0] },
          { boneName: 'mixamorigSpine', rotation: [0.1, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.15, 0, 0] },
          { boneName: 'mixamorigNeck', rotation: [0, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.2, 0.2, -1.1] },
          { boneName: 'mixamorigLeftForeArm', rotation: [0.5, 0.2, 0] },
          { boneName: 'mixamorigRightArm', rotation: [0.2, -0.2, 1.1] },
          { boneName: 'mixamorigRightForeArm', rotation: [0.5, -0.2, 0] },
          { boneName: 'mixamorigLeftUpLeg', rotation: [-0.2, 0.3, -0.2] },
          { boneName: 'mixamorigLeftLeg', rotation: [-0.4, 0, 0] },
          { boneName: 'mixamorigRightUpLeg', rotation: [-0.2, -0.3, 0.2] },
          { boneName: 'mixamorigRightLeg', rotation: [-0.4, 0, 0] }
        ]
      },
      {
        beatOffset: 2,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0.25, 0.4, -0.2] },
          { boneName: 'mixamorigSpine', rotation: [0.2, 0.3, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.3, 0.4, 0.1] },
          { boneName: 'mixamorigNeck', rotation: [-0.1, -0.2, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.6, 0.4, -0.6] },
          { boneName: 'mixamorigLeftForeArm', rotation: [0.9, 0.3, 0] },
          { boneName: 'mixamorigRightArm', rotation: [-0.2, -0.4, 1.3] },
          { boneName: 'mixamorigRightForeArm', rotation: [0.4, -0.2, 0] },
          { boneName: 'mixamorigLeftUpLeg', rotation: [0.4, 0.6, -0.1] },
          { boneName: 'mixamorigLeftLeg', rotation: [-0.8, 0, 0] },
          { boneName: 'mixamorigRightUpLeg', rotation: [-0.4, -0.2, 0.3] },
          { boneName: 'mixamorigRightLeg', rotation: [-0.2, 0, 0] }
        ]
      },
      {
        beatOffset: 4,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0.1, 0, 0] },
          { boneName: 'mixamorigSpine', rotation: [0.1, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.15, 0, 0] },
          { boneName: 'mixamorigNeck', rotation: [0, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.2, 0.2, -1.1] },
          { boneName: 'mixamorigLeftForeArm', rotation: [0.5, 0.2, 0] },
          { boneName: 'mixamorigRightArm', rotation: [0.2, -0.2, 1.1] },
          { boneName: 'mixamorigRightForeArm', rotation: [0.5, -0.2, 0] },
          { boneName: 'mixamorigLeftUpLeg', rotation: [-0.2, 0.3, -0.2] },
          { boneName: 'mixamorigLeftLeg', rotation: [-0.4, 0, 0] },
          { boneName: 'mixamorigRightUpLeg', rotation: [-0.2, -0.3, 0.2] },
          { boneName: 'mixamorigRightLeg', rotation: [-0.4, 0, 0] }
        ]
      },
      {
        beatOffset: 6,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0.25, -0.4, 0.2] },
          { boneName: 'mixamorigSpine', rotation: [0.2, -0.3, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.3, -0.4, -0.1] },
          { boneName: 'mixamorigNeck', rotation: [-0.1, 0.2, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [-0.2, 0.4, -1.3] },
          { boneName: 'mixamorigLeftForeArm', rotation: [0.4, 0.2, 0] },
          { boneName: 'mixamorigRightArm', rotation: [0.6, -0.4, 0.6] },
          { boneName: 'mixamorigRightForeArm', rotation: [0.9, -0.3, 0] },
          { boneName: 'mixamorigLeftUpLeg', rotation: [-0.4, 0.2, -0.3] },
          { boneName: 'mixamorigLeftLeg', rotation: [-0.2, 0, 0] },
          { boneName: 'mixamorigRightUpLeg', rotation: [0.4, -0.6, 0.1] },
          { boneName: 'mixamorigRightLeg', rotation: [-0.8, 0, 0] }
        ]
      },
      {
        beatOffset: 8,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0.1, 0, 0] },
          { boneName: 'mixamorigSpine', rotation: [0.1, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.15, 0, 0] },
          { boneName: 'mixamorigNeck', rotation: [0, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.2, 0.2, -1.1] },
          { boneName: 'mixamorigLeftForeArm', rotation: [0.5, 0.2, 0] },
          { boneName: 'mixamorigRightArm', rotation: [0.2, -0.2, 1.1] },
          { boneName: 'mixamorigRightForeArm', rotation: [0.5, -0.2, 0] },
          { boneName: 'mixamorigLeftUpLeg', rotation: [-0.2, 0.3, -0.2] },
          { boneName: 'mixamorigLeftLeg', rotation: [-0.4, 0, 0] },
          { boneName: 'mixamorigRightUpLeg', rotation: [-0.2, -0.3, 0.2] },
          { boneName: 'mixamorigRightLeg', rotation: [-0.4, 0, 0] }
        ]
      }
    ]
  },
  {
    id: 'hiphop_bounce_groove',
    name: 'Hip-Hop Heavy Groove',
    style: 'Hip-Hop',
    difficulty: 'Początkujący',
    nativeBPM: 96,
    durationBeats: 8,
    description: 'Głęboki groove z opadaniem klatki piersiowej i ugięciem kolan.',
    tags: ['groove', 'bounce'],
    clipName: 'hiphop_bounce',
    keyframes: [
      {
        beatOffset: 0,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0.05, 0, 0] },
          { boneName: 'mixamorigSpine', rotation: [0.05, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.1, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.5, 0.2, 0.3] },
          { boneName: 'mixamorigRightArm', rotation: [0.5, -0.2, -0.3] },
          { boneName: 'mixamorigLeftUpLeg', rotation: [-0.1, 0, -0.1] },
          { boneName: 'mixamorigLeftLeg', rotation: [-0.2, 0, 0] },
          { boneName: 'mixamorigRightUpLeg', rotation: [-0.1, 0, 0.1] },
          { boneName: 'mixamorigRightLeg', rotation: [-0.2, 0, 0] }
        ]
      },
      {
        beatOffset: 2,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0.4, 0, 0] },
          { boneName: 'mixamorigSpine', rotation: [0.4, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.5, 0, 0] },
          { boneName: 'mixamorigNeck', rotation: [-0.2, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [1.1, 0.4, 0.8] },
          { boneName: 'mixamorigLeftForeArm', rotation: [1.0, 0, 0] },
          { boneName: 'mixamorigRightArm', rotation: [1.1, -0.4, -0.8] },
          { boneName: 'mixamorigRightForeArm', rotation: [1.0, 0, 0] },
          { boneName: 'mixamorigLeftUpLeg', rotation: [-0.4, 0.1, -0.15] },
          { boneName: 'mixamorigLeftLeg', rotation: [-0.75, 0, 0] },
          { boneName: 'mixamorigRightUpLeg', rotation: [-0.4, -0.1, 0.15] },
          { boneName: 'mixamorigRightLeg', rotation: [-0.75, 0, 0] }
        ]
      },
      {
        beatOffset: 4,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0.05, 0, 0] },
          { boneName: 'mixamorigSpine', rotation: [0.05, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.1, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.5, 0.2, 0.3] },
          { boneName: 'mixamorigRightArm', rotation: [0.5, -0.2, -0.3] },
          { boneName: 'mixamorigLeftUpLeg', rotation: [-0.1, 0, -0.1] },
          { boneName: 'mixamorigLeftLeg', rotation: [-0.2, 0, 0] },
          { boneName: 'mixamorigRightUpLeg', rotation: [-0.1, 0, 0.1] },
          { boneName: 'mixamorigRightLeg', rotation: [-0.2, 0, 0] }
        ]
      },
      {
        beatOffset: 6,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0.4, 0, 0] },
          { boneName: 'mixamorigSpine', rotation: [0.4, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.5, 0, 0] },
          { boneName: 'mixamorigNeck', rotation: [-0.2, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [1.1, 0.4, 0.8] },
          { boneName: 'mixamorigLeftForeArm', rotation: [1.0, 0, 0] },
          { boneName: 'mixamorigRightArm', rotation: [1.1, -0.4, -0.8] },
          { boneName: 'mixamorigRightForeArm', rotation: [1.0, 0, 0] },
          { boneName: 'mixamorigLeftUpLeg', rotation: [-0.4, 0.1, -0.15] },
          { boneName: 'mixamorigLeftLeg', rotation: [-0.75, 0, 0] },
          { boneName: 'mixamorigRightUpLeg', rotation: [-0.4, -0.1, 0.15] },
          { boneName: 'mixamorigRightLeg', rotation: [-0.75, 0, 0] }
        ]
      },
      {
        beatOffset: 8,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0.05, 0, 0] },
          { boneName: 'mixamorigSpine', rotation: [0.05, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.1, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.5, 0.2, 0.3] },
          { boneName: 'mixamorigRightArm', rotation: [0.5, -0.2, -0.3] },
          { boneName: 'mixamorigLeftUpLeg', rotation: [-0.1, 0, -0.1] },
          { boneName: 'mixamorigLeftLeg', rotation: [-0.2, 0, 0] },
          { boneName: 'mixamorigRightUpLeg', rotation: [-0.1, 0, 0.1] },
          { boneName: 'mixamorigRightLeg', rotation: [-0.2, 0, 0] }
        ]
      }
    ]
  },
  {
    id: 'comm_body_wave',
    name: 'Commercial Fluid Body Wave',
    style: 'Commercial',
    difficulty: 'Średniozaawansowany',
    nativeBPM: 108,
    durationBeats: 8,
    description: 'Płynna fala przechodząca od głowy, przez klatkę piersiową do bioder.',
    tags: ['wave', 'commercial', 'fluidity'],
    clipName: 'commercial_wave',
    keyframes: [
      {
        beatOffset: 0,
        rotations: [
          { boneName: 'mixamorigNeck', rotation: [-0.3, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [-0.1, 0, 0] },
          { boneName: 'mixamorigHips', rotation: [0, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.2, 0.4, 1.2] },
          { boneName: 'mixamorigRightArm', rotation: [0.2, -0.4, -1.2] }
        ]
      },
      {
        beatOffset: 2,
        rotations: [
          { boneName: 'mixamorigNeck', rotation: [0.4, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [-0.3, 0, 0] },
          { boneName: 'mixamorigHips', rotation: [0.1, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.6, 0.2, 0.8] },
          { boneName: 'mixamorigRightArm', rotation: [0.6, -0.2, -0.8] }
        ]
      },
      {
        beatOffset: 4,
        rotations: [
          { boneName: 'mixamorigNeck', rotation: [0, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.4, 0, 0] },
          { boneName: 'mixamorigHips', rotation: [-0.3, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.8, 0, 0.4] },
          { boneName: 'mixamorigRightArm', rotation: [0.8, 0, -0.4] }
        ]
      },
      {
        beatOffset: 6,
        rotations: [
          { boneName: 'mixamorigNeck', rotation: [-0.2, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.1, 0, 0] },
          { boneName: 'mixamorigHips', rotation: [0.3, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.4, 0.3, 1.0] },
          { boneName: 'mixamorigRightArm', rotation: [0.4, -0.3, -1.0] }
        ]
      },
      {
        beatOffset: 8,
        rotations: [
          { boneName: 'mixamorigNeck', rotation: [-0.3, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [-0.1, 0, 0] },
          { boneName: 'mixamorigHips', rotation: [0, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.2, 0.4, 1.2] },
          { boneName: 'mixamorigRightArm', rotation: [0.2, -0.4, -1.2] }
        ]
      }
    ]
  },
  {
    id: 'break_toprock_basic',
    name: 'B-Boy Toprock Indian Step',
    style: 'Breakdance',
    difficulty: 'Średniozaawansowany',
    nativeBPM: 112,
    durationBeats: 8,
    description: 'Klasyczny Indian Step z wykręceniem klatki, otwarciem rąk i skrętem bioder.',
    tags: ['bboy', 'toprock', 'street'],
    clipName: 'bboy_footwork',
    keyframes: [
      {
        beatOffset: 0,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0, 0.6, 0] },
          { boneName: 'mixamorigSpine', rotation: [0.1, 0.4, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [1.4, 0.5, 0.8] },
          { boneName: 'mixamorigRightArm', rotation: [-0.4, -0.5, -0.4] }
        ]
      },
      {
        beatOffset: 4,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0, -0.6, 0] },
          { boneName: 'mixamorigSpine', rotation: [0.1, -0.4, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [-0.4, 0.5, 0.4] },
          { boneName: 'mixamorigRightArm', rotation: [1.4, -0.5, -0.8] }
        ]
      },
      {
        beatOffset: 8,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0, 0.6, 0] },
          { boneName: 'mixamorigSpine', rotation: [0.1, 0.4, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [1.4, 0.5, 0.8] },
          { boneName: 'mixamorigRightArm', rotation: [-0.4, -0.5, -0.4] }
        ]
      }
    ]
  },
  {
    id: 'heels_sassy_strut',
    name: 'High Heels Sassy Strut',
    style: 'High Heels',
    difficulty: 'Średniozaawansowany',
    nativeBPM: 104,
    durationBeats: 8,
    description: 'Zmysłowy krok chodu w obcasach z akcentami bioder i kadrowaniem twarzy dłońmi.',
    tags: ['heels', 'sassy', 'strut', 'attitude'],
    clipName: 'heels_strut',
    keyframes: [
      {
        beatOffset: 0,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0.1, 0.4, -0.3] },
          { boneName: 'mixamorigSpine1', rotation: [-0.1, 0, 0.1] },
          { boneName: 'mixamorigNeck', rotation: [0.2, -0.3, -0.1] },
          { boneName: 'mixamorigLeftArm', rotation: [1.8, 0.6, 0.4] },
          { boneName: 'mixamorigRightArm', rotation: [0.3, -0.4, -0.8] }
        ]
      },
      {
        beatOffset: 4,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0.1, -0.4, 0.3] },
          { boneName: 'mixamorigSpine1', rotation: [-0.1, 0, -0.1] },
          { boneName: 'mixamorigNeck', rotation: [0.2, 0.3, 0.1] },
          { boneName: 'mixamorigLeftArm', rotation: [0.3, 0.4, 0.8] },
          { boneName: 'mixamorigRightArm', rotation: [1.8, -0.6, -0.4] }
        ]
      },
      {
        beatOffset: 8,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0.1, 0.4, -0.3] },
          { boneName: 'mixamorigSpine1', rotation: [-0.1, 0, 0.1] },
          { boneName: 'mixamorigNeck', rotation: [0.2, -0.3, -0.1] },
          { boneName: 'mixamorigLeftArm', rotation: [1.8, 0.6, 0.4] },
          { boneName: 'mixamorigRightArm', rotation: [0.3, -0.4, -0.8] }
        ]
      }
    ]
  },
  {
    id: 'kpop_sharp_locks',
    name: 'K-Pop Sharp Isolation',
    style: 'K-Pop',
    difficulty: 'Zaawansowany',
    nativeBPM: 120,
    durationBeats: 8,
    description: 'Precyzyjne i ostre jak brzytwa blokady ramion z szybkim popem klatki piersiowej.',
    tags: ['kpop', 'isolation', 'sharp', 'precision'],
    clipName: 'kpop_isolation',
    keyframes: [
      {
        beatOffset: 0,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.2, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [1.5, 1.2, 0] },
          { boneName: 'mixamorigRightArm', rotation: [1.5, -1.2, 0] }
        ]
      },
      {
        beatOffset: 2,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [-0.2, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.8, 0, 1.4] },
          { boneName: 'mixamorigRightArm', rotation: [0.8, 0, -1.4] }
        ]
      },
      {
        beatOffset: 4,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0, 0.3, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.2, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [1.8, 0.5, 0.2] },
          { boneName: 'mixamorigRightArm', rotation: [0.2, -0.8, -0.8] }
        ]
      },
      {
        beatOffset: 6,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0, -0.3, 0] },
          { boneName: 'mixamorigSpine2', rotation: [-0.2, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.2, 0.8, 0.8] },
          { boneName: 'mixamorigRightArm', rotation: [1.8, -0.5, -0.2] }
        ]
      },
      {
        beatOffset: 8,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.2, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [1.5, 1.2, 0] },
          { boneName: 'mixamorigRightArm', rotation: [1.5, -1.2, 0] }
        ]
      }
    ]
  }
];

export const DEFAULT_CHOREOGRAPHY_SEQUENCE: ChoreographySequence = {
  id: 'seq_demo_01',
  title: 'Hip-Hop & Commercial Basic Routine',
  targetBPM: 104,
  blocks: [
    DANCE_MOVE_LIBRARY[0], // Toprock Cross
    DANCE_MOVE_LIBRARY[1], // Bounce Groove
    DANCE_MOVE_LIBRARY[2], // Body Wave
    DANCE_MOVE_LIBRARY[3]  // B-Boy Indian Step
  ]
};
