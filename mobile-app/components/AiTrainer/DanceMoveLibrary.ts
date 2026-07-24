export interface BoneRotation {
  boneName: string; // np. 'mixamorigHips', 'mixamorigSpine', 'mixamorigLeftArm', etc.
  rotation: [number, number, number]; // Euler angles [x, y, z] w radianach
}

export interface PoseKeyframe {
  beatOffset: number; // np. 0.0, 1.0, 2.0 ... do 8.0 uderzeń
  rotations: BoneRotation[];
}

export interface DanceMoveBlock {
  id: string;
  name: string;
  style: 'Hip-Hop' | 'Commercial' | 'Breakdance' | 'High Heels' | 'K-Pop';
  difficulty: 'Początkujący' | 'Średniozaawansowany' | 'Zaawansowany';
  nativeBPM: number;
  durationBeats: number; // Standardowo 8 uderzeń
  description: string;
  tags: string[];
  keyframes: PoseKeyframe[];
}

export interface ChoreographySequence {
  id: string;
  title: string;
  targetBPM: number;
  audioUrl?: string;
  blocks: DanceMoveBlock[];
}

// Bogata baza klocków tanecznych dla szkół tańca z pełną pracą szkieletu
export const DANCE_MOVE_LIBRARY: DanceMoveBlock[] = [
  {
    id: 'hiphop_toprock_cross',
    name: 'Toprock Cross Step',
    style: 'Hip-Hop',
    difficulty: 'Początkujący',
    nativeBPM: 100,
    durationBeats: 8,
    description: 'Dynamiczny krok otwarcia z krzyżowaniem nóg i praca ramion w rytmie bounce.',
    tags: ['toprock', 'bounce', 'footwork'],
    keyframes: [
      {
        beatOffset: 0,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0, 0, 0] },
          { boneName: 'mixamorigSpine', rotation: [0.1, 0, 0] },
          { boneName: 'mixamorigSpine1', rotation: [0.15, 0, 0] },
          { boneName: 'mixamorigNeck', rotation: [0, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.4, 0.5, 0.6] },
          { boneName: 'mixamorigRightArm', rotation: [0.4, -0.5, -0.6] }
        ]
      },
      {
        beatOffset: 2,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0.2, 0.5, -0.2] },
          { boneName: 'mixamorigSpine', rotation: [0.2, 0.3, 0] },
          { boneName: 'mixamorigSpine1', rotation: [0.25, 0.4, 0.1] },
          { boneName: 'mixamorigNeck', rotation: [-0.1, -0.2, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [1.2, 0.8, -0.4] },
          { boneName: 'mixamorigRightArm', rotation: [-0.5, -0.8, -0.5] }
        ]
      },
      {
        beatOffset: 4,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0, 0, 0] },
          { boneName: 'mixamorigSpine', rotation: [0.1, 0, 0] },
          { boneName: 'mixamorigSpine1', rotation: [0.15, 0, 0] },
          { boneName: 'mixamorigNeck', rotation: [0, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.4, 0.5, 0.6] },
          { boneName: 'mixamorigRightArm', rotation: [0.4, -0.5, -0.6] }
        ]
      },
      {
        beatOffset: 6,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0.2, -0.5, 0.2] },
          { boneName: 'mixamorigSpine', rotation: [0.2, -0.3, 0] },
          { boneName: 'mixamorigSpine1', rotation: [0.25, -0.4, -0.1] },
          { boneName: 'mixamorigNeck', rotation: [-0.1, 0.2, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [-0.5, 0.8, 0.5] },
          { boneName: 'mixamorigRightArm', rotation: [1.2, -0.8, 0.4] }
        ]
      },
      {
        beatOffset: 8,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0, 0, 0] },
          { boneName: 'mixamorigSpine', rotation: [0.1, 0, 0] },
          { boneName: 'mixamorigSpine1', rotation: [0.15, 0, 0] },
          { boneName: 'mixamorigNeck', rotation: [0, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.4, 0.5, 0.6] },
          { boneName: 'mixamorigRightArm', rotation: [0.4, -0.5, -0.6] }
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
    description: 'Głęboki groove z opadaniem klatki piersiowej i bitem uderzeń w kolanach.',
    tags: ['groove', 'bounce', 'body'],
    keyframes: [
      {
        beatOffset: 0,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0, 0, 0] },
          { boneName: 'mixamorigSpine', rotation: [0.05, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.05, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.5, 0.2, 0.3] },
          { boneName: 'mixamorigRightArm', rotation: [0.5, -0.2, -0.3] }
        ]
      },
      {
        beatOffset: 2,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0.35, 0, 0] },
          { boneName: 'mixamorigSpine', rotation: [0.4, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.35, 0, 0] },
          { boneName: 'mixamorigNeck', rotation: [0.3, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [1.1, 0.4, 0.8] },
          { boneName: 'mixamorigRightArm', rotation: [1.1, -0.4, -0.8] }
        ]
      },
      {
        beatOffset: 4,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0, 0, 0] },
          { boneName: 'mixamorigSpine', rotation: [0.05, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.05, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.5, 0.2, 0.3] },
          { boneName: 'mixamorigRightArm', rotation: [0.5, -0.2, -0.3] }
        ]
      },
      {
        beatOffset: 6,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0.35, 0, 0] },
          { boneName: 'mixamorigSpine', rotation: [0.4, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.35, 0, 0] },
          { boneName: 'mixamorigNeck', rotation: [0.3, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [1.1, 0.4, 0.8] },
          { boneName: 'mixamorigRightArm', rotation: [1.1, -0.4, -0.8] }
        ]
      },
      {
        beatOffset: 8,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0, 0, 0] },
          { boneName: 'mixamorigSpine', rotation: [0.05, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.05, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.5, 0.2, 0.3] },
          { boneName: 'mixamorigRightArm', rotation: [0.5, -0.2, -0.3] }
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
