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
  /** Opcjonalny URL do wygenerowanej przez AI EDGE (np. w postaci jednego pliku) gotowej choreografii GLB.
   * Jeśli obecne, player zignoruje pole blocks. */
  customGlbUrl?: string;
}

// Spójna i bogata baza klocków tanecznych synchronizowana z backendem i szybkim generowaniem
export const DANCE_MOVE_LIBRARY: DanceMoveBlock[] = [
  { id: 'arm_wave', name: 'Arm Wave', style: 'Hip-Hop', difficulty: 'Początkujący', nativeBPM: 104, durationBeats: 8, description: 'Klasyczny arm wave.', tags: ['hiphop', 'wave'], clipName: 'arm_wave', clipUrl: '/assets/animations/female_hip_hop/arm_wave.glb', keyframes: [] },
  { id: 'body_wave', name: 'Body Wave', style: 'Hip-Hop', difficulty: 'Średniozaawansowany', nativeBPM: 104, durationBeats: 8, description: 'Głęboka fala ciała.', tags: ['hiphop', 'wave', 'body'], clipName: 'body_wave', clipUrl: '/assets/animations/female_hip_hop/body_wave.glb', keyframes: [] },
  { id: 'hip_hop_quake', name: 'Hip Hop Quake', style: 'Hip-Hop', difficulty: 'Zaawansowany', nativeBPM: 128, durationBeats: 8, description: 'Wstrząsy i mocny bounce.', tags: ['hiphop', 'quake', 'bounce'], clipName: 'hip_hop_quake', clipUrl: '/assets/animations/female_hip_hop/hip_hop_quake.glb', keyframes: [] },
  { id: 'kick_step', name: 'Kick Step', style: 'Hip-Hop', difficulty: 'Początkujący', nativeBPM: 104, durationBeats: 8, description: 'Krok z wykopem nogi.', tags: ['hiphop', 'kick', 'step'], clipName: 'kick_step', clipUrl: '/assets/animations/female_hip_hop/kick_step.glb', keyframes: [] },
  { id: 'rib_pops', name: 'Rib Pops', style: 'Hip-Hop', difficulty: 'Średniozaawansowany', nativeBPM: 104, durationBeats: 8, description: 'Izolacje klatki i poppin.', tags: ['hiphop', 'pop', 'rib'], clipName: 'rib_pops', clipUrl: '/assets/animations/female_hip_hop/rib_pops.glb', keyframes: [] },
  { id: 'running_man', name: 'Running Man', style: 'Hip-Hop', difficulty: 'Początkujący', nativeBPM: 128, durationBeats: 8, description: 'Klasyczny krok Running Man.', tags: ['hiphop', 'running', 'classic'], clipName: 'running_man', clipUrl: '/assets/animations/female_hip_hop/running_man.glb', keyframes: [] },
  { id: 'side_step', name: 'Side Step', style: 'Hip-Hop', difficulty: 'Początkujący', nativeBPM: 85, durationBeats: 8, description: 'Krok w bok ze swagem.', tags: ['hiphop', 'side', 'step'], clipName: 'side_step', clipUrl: '/assets/animations/female_hip_hop/side_step.glb', keyframes: [] },
  { id: 'side_to_side', name: 'Side To Side', style: 'Hip-Hop', difficulty: 'Średniozaawansowany', nativeBPM: 85, durationBeats: 8, description: 'Pełen groove z boku na bok.', tags: ['hiphop', 'groove', 'side'], clipName: 'side_to_side', clipUrl: '/assets/animations/female_hip_hop/side_to_side.glb', keyframes: [] },
  { id: 'step_hip_hop', name: 'Step Hip Hop', style: 'Hip-Hop', difficulty: 'Początkujący', nativeBPM: 104, durationBeats: 8, description: 'Podstawowy krok hip hopowy.', tags: ['hiphop', 'basic', 'step'], clipName: 'step_hip_hop', clipUrl: '/assets/animations/female_hip_hop/step_hip_hop.glb', keyframes: [] },
  { id: 'timid_dansing', name: 'Timid Dancing', style: 'Hip-Hop', difficulty: 'Początkujący', nativeBPM: 85, durationBeats: 8, description: 'Spokojny, oszczędny taniec.', tags: ['hiphop', 'chill', 'timid'], clipName: 'timid_dansing', clipUrl: '/assets/animations/female_hip_hop/timid_dansing.glb', keyframes: [] }
];

export const DEFAULT_CHOREOGRAPHY_SEQUENCE: ChoreographySequence = {
  id: 'seq_demo_01',
  title: 'Mój Układ Hip-Hopowy',
  targetBPM: 104,
  blocks: [
    DANCE_MOVE_LIBRARY[3], // Kick Step
    DANCE_MOVE_LIBRARY[8], // Step Hip Hop
    DANCE_MOVE_LIBRARY[6]  // Side Step
  ]
};
