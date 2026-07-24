import * as THREE from 'three';
import { ChoreographySequence, DanceMoveBlock, PoseKeyframe, BoneRotation } from './DanceMoveLibrary';

export class MotionEngine {
  private skeletonBones: Map<string, THREE.Object3D> = new Map();

  constructor() {}

  /**
   * Rejestruje kości szkieletu modelu 3D dla szybkiego dostępu po nazwach
   */
  public bindSkeleton(rootModel: THREE.Object3D) {
    this.skeletonBones.clear();
    rootModel.traverse((child) => {
      if (child.name) {
        // Mapujemy zarówno czystą nazwę jak i nazwy z prefiksem mixamorig
        this.skeletonBones.set(child.name, child);
        const cleanName = child.name.replace(/^mixamorig/, '');
        if (cleanName !== child.name) {
          this.skeletonBones.set(cleanName, child);
        }
      }
    });
  }

  /**
   * Aktualizuje pozy kości w zależności od aktualnego czasu audio (Master Clock),
   * wyliczonego tempa (BPM Warping), płynnej interpolacji (SLERP) oraz trybu lustrzanego.
   */
  public updatePose(
    sequence: ChoreographySequence,
    currentTimeSeconds: number,
    mirrorMode: boolean = false
  ) {
    if (!sequence || !sequence.blocks || sequence.blocks.length === 0) return;
    if (this.skeletonBones.size === 0) return;

    const bpm = sequence.targetBPM || 100;
    // Wyliczenie całkowitej liczby uderzeń w sekwencji
    let totalBeats = 0;
    sequence.blocks.forEach((b) => {
      totalBeats += b.durationBeats;
    });

    if (totalBeats <= 0) return;

    // Przeliczenie sekund na uderzenia w siatce rytmicznej (BPM Warping)
    const beatsPerSecond = bpm / 60;
    const currentBeat = (currentTimeSeconds * beatsPerSecond) % totalBeats;

    // Znalezienie bloku, w którym aktualnie się znajdujemy
    let accumulatedBeats = 0;
    let activeBlockIndex = 0;
    let blockBeatOffset = 0;

    for (let i = 0; i < sequence.blocks.length; i++) {
      const block = sequence.blocks[i];
      if (currentBeat >= accumulatedBeats && currentBeat < accumulatedBeats + block.durationBeats) {
        activeBlockIndex = i;
        blockBeatOffset = currentBeat - accumulatedBeats;
        break;
      }
      accumulatedBeats += block.durationBeats;
    }

    const activeBlock = sequence.blocks[activeBlockIndex];
    if (!activeBlock || !activeBlock.keyframes || activeBlock.keyframes.length === 0) return;

    // Obliczenie rotacji kości w wybranym bloku z interpolacją SLERP
    const interpolatedRotations = this.evaluateBlockRotations(activeBlock, blockBeatOffset);

    // Aplikowanie rotacji na kości awatara
    interpolatedRotations.forEach((rot, boneName) => {
      let bone = this.skeletonBones.get(boneName) || this.skeletonBones.get(`mixamorig${boneName}`);
      if (bone) {
        const euler = new THREE.Euler(
          rot[0],
          mirrorMode ? -rot[1] : rot[1],
          mirrorMode ? -rot[2] : rot[2],
          'XYZ'
        );
        bone.quaternion.setFromEuler(euler);
      }
    });
  }

  /**
   * Ewaluuje i interpoluje rotacje kości dla danego bloku na podstawie beatOffset
   */
  private evaluateBlockRotations(block: DanceMoveBlock, beatOffset: number): Map<string, [number, number, number]> {
    const result = new Map<string, [number, number, number]>();
    const keyframes = block.keyframes;

    if (keyframes.length === 1) {
      keyframes[0].rotations.forEach((r) => result.set(r.boneName, r.rotation));
      return result;
    }

    // Znalezienie dwóch najbliższych klatek kluczowych (Keyframe A i Keyframe B)
    let prevKf = keyframes[0];
    let nextKf = keyframes[keyframes.length - 1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (beatOffset >= keyframes[i].beatOffset && beatOffset <= keyframes[i + 1].beatOffset) {
        prevKf = keyframes[i];
        nextKf = keyframes[i + 1];
        break;
      }
    }

    const duration = nextKf.beatOffset - prevKf.beatOffset;
    const factor = duration > 0 ? Math.min(1, Math.max(0, (beatOffset - prevKf.beatOffset) / duration)) : 0;

    // Zbieranie wszystkich unikalnych nazw kości z obu klatek
    const boneNames = new Set<string>();
    prevKf.rotations.forEach((r) => boneNames.add(r.boneName));
    nextKf.rotations.forEach((r) => boneNames.add(r.boneName));

    boneNames.forEach((boneName) => {
      const rotA = prevKf.rotations.find((r) => r.boneName === boneName)?.rotation || [0, 0, 0];
      const rotB = nextKf.rotations.find((r) => r.boneName === boneName)?.rotation || rotA;

      // Konwersja na Kwaterniony i wykonanie interpolacji sferycznej SLERP
      const qA = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotA[0], rotA[1], rotA[2], 'XYZ'));
      const qB = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotB[0], rotB[1], rotB[2], 'XYZ'));

      qA.slerp(qB, factor);

      const interpolatedEuler = new THREE.Euler().setFromQuaternion(qA, 'XYZ');
      result.set(boneName, [interpolatedEuler.x, interpolatedEuler.y, interpolatedEuler.z]);
    });

    return result;
  }
}
