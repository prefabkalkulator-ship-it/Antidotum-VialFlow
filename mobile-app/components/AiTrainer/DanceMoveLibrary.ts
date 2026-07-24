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

// Baza gotowych klocków tanecznych dla szkół tańca
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
          { boneName: 'mixamorigSpine1', rotation: [0.1, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.2, 0.3, 0.5] },
          { boneName: 'mixamorigRightArm', rotation: [0.2, -0.3, -0.5] }
        ]
      },
      {
        beatOffset: 2,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0.1, 0.3, -0.05] },
          { boneName: 'mixamorigSpine1', rotation: [0.15, 0.2, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.5, 0.8, 0.2] },
          { boneName: 'mixamorigRightArm', rotation: [-0.2, -0.4, -0.2] }
        ]
      },
      {
        beatOffset: 4,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0, 0, 0] },
          { boneName: 'mixamorigSpine1', rotation: [0.1, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.2, 0.3, 0.5] },
          { boneName: 'mixamorigRightArm', rotation: [0.2, -0.3, -0.5] }
        ]
      },
      {
        beatOffset: 6,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0.1, -0.3, 0.05] },
          { boneName: 'mixamorigSpine1', rotation: [0.15, -0.2, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [-0.2, 0.4, 0.2] },
          { boneName: 'mixamorigRightArm', rotation: [0.5, -0.8, -0.2] }
        ]
      },
      {
        beatOffset: 8,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0, 0, 0] },
          { boneName: 'mixamorigSpine1', rotation: [0.1, 0, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.2, 0.3, 0.5] },
          { boneName: 'mixamorigRightArm', rotation: [0.2, -0.3, -0.5] }
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
    description: 'Głęboki groove z opadaniem klatki piersiowej na uderzenia 2 i 4.',
    tags: ['groove', 'bounce', 'body'],
    keyframes: [
      {
        beatOffset: 0,
        rotations: [
          { boneName: 'mixamorigSpine', rotation: [0.05, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.05, 0, 0] }
        ]
      },
      {
        beatOffset: 2,
        rotations: [
          { boneName: 'mixamorigSpine', rotation: [0.3, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.25, 0, 0] }
        ]
      },
      {
        beatOffset: 4,
        rotations: [
          { boneName: 'mixamorigSpine', rotation: [0.05, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.05, 0, 0] }
        ]
      },
      {
        beatOffset: 6,
        rotations: [
          { boneName: 'mixamorigSpine', rotation: [0.3, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.25, 0, 0] }
        ]
      },
      {
        beatOffset: 8,
        rotations: [
          { boneName: 'mixamorigSpine', rotation: [0.05, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.05, 0, 0] }
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
          { boneName: 'mixamorigNeck', rotation: [-0.2, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0, 0, 0] },
          { boneName: 'mixamorigHips', rotation: [0, 0, 0] }
        ]
      },
      {
        beatOffset: 2,
        rotations: [
          { boneName: 'mixamorigNeck', rotation: [0.3, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [-0.2, 0, 0] },
          { boneName: 'mixamorigHips', rotation: [0, 0, 0] }
        ]
      },
      {
        beatOffset: 4,
        rotations: [
          { boneName: 'mixamorigNeck', rotation: [0, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0.3, 0, 0] },
          { boneName: 'mixamorigHips', rotation: [-0.2, 0, 0] }
        ]
      },
      {
        beatOffset: 6,
        rotations: [
          { boneName: 'mixamorigNeck', rotation: [0, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0, 0, 0] },
          { boneName: 'mixamorigHips', rotation: [0.2, 0, 0] }
        ]
      },
      {
        beatOffset: 8,
        rotations: [
          { boneName: 'mixamorigNeck', rotation: [-0.2, 0, 0] },
          { boneName: 'mixamorigSpine2', rotation: [0, 0, 0] },
          { boneName: 'mixamorigHips', rotation: [0, 0, 0] }
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
    description: 'Klasyczny Indian Step z szerokimi pracami rąk i skrętem bioder.',
    tags: ['bboy', 'toprock', 'street'],
    keyframes: [
      {
        beatOffset: 0,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0, 0.4, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.8, 0, 0.5] }
        ]
      },
      {
        beatOffset: 4,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0, -0.4, 0] },
          { boneName: 'mixamorigRightArm', rotation: [0.8, 0, -0.5] }
        ]
      },
      {
        beatOffset: 8,
        rotations: [
          { boneName: 'mixamorigHips', rotation: [0, 0.4, 0] },
          { boneName: 'mixamorigLeftArm', rotation: [0.8, 0, 0.5] }
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
    DANCE_MOVE_LIBRARY[2]  // Body Wave
  ]
};
