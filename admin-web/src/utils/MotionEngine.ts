import * as THREE from 'three';
import type { ChoreographySequence, DanceMoveBlock } from './DanceMoveLibrary';

export class MotionEngine {
  private skeletonBones: Map<string, THREE.Bone> = new Map();
  private mixer: THREE.AnimationMixer | null = null;
  private animActions: Map<string, THREE.AnimationAction> = new Map();
  private generatedClips: Map<string, THREE.AnimationClip> = new Map();
  private currentActionName: string | null = null;
  private avatarScene: THREE.Object3D | null = null;

  /**
   * Rejestruje węzły szkieletu awatara 3D oraz inicjalizuje THREE.AnimationMixer
   */
  public bindSkeleton(scene: THREE.Object3D, embeddedAnimations: THREE.AnimationClip[] = []): void {
    this.skeletonBones.clear();
    this.animActions.clear();
    this.generatedClips.clear();
    this.avatarScene = scene;
    this.mixer = new THREE.AnimationMixer(scene);

    scene.traverse((object) => {
      if ((object as THREE.Bone).isBone) {
        const bone = object as THREE.Bone;
        this.skeletonBones.set(bone.name, bone);
        if (bone.name.startsWith('mixamorig')) {
          const cleanName = bone.name.replace('mixamorig', '');
          this.skeletonBones.set(cleanName, bone);
        }
      }
    });

    if (embeddedAnimations && embeddedAnimations.length > 0) {
      embeddedAnimations.forEach((clip) => {
        if (this.mixer) {
          const action = this.mixer.clipAction(clip);
          this.animActions.set(clip.name.toLowerCase(), action);
        }
      });
    }
  }

  /**
   * Aktualizuje animację 3D za pomocą natywnego THREE.AnimationMixer z płynnym przenikaniem (cross-fade)
   */
  public updatePose(
    sequence: ChoreographySequence,
    currentTimeSeconds: number,
    isMirrorMode: boolean = false
  ): void {
    if (!sequence || !sequence.blocks || sequence.blocks.length === 0 || !this.mixer || !this.avatarScene) return;

    const bpm = sequence.targetBPM || 100;
    
    let totalBeats = 0;
    sequence.blocks.forEach((b) => {
      totalBeats += b.durationBeats;
    });

    if (totalBeats <= 0) return;

    const beatsPerSecond = bpm / 60;
    const currentBeat = (currentTimeSeconds * beatsPerSecond) % totalBeats;

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
    if (!activeBlock) return;

    // Przygotuj lub pobierz wygenerowaną ścieżkę AnimationClip dla bloku tanecznego
    const clipKey = activeBlock.id || activeBlock.name;
    if (!this.generatedClips.has(clipKey)) {
      const clip = this.createAnimationClipFromBlock(activeBlock);
      if (clip) {
        this.generatedClips.set(clipKey, clip);
        const action = this.mixer.clipAction(clip);
        this.animActions.set(clipKey.toLowerCase(), action);
      }
    }

    const targetActionName = clipKey.toLowerCase();
    if (this.currentActionName !== targetActionName) {
      const nextAction = this.animActions.get(targetActionName);
      const prevAction = this.currentActionName ? this.animActions.get(this.currentActionName) : null;

      if (nextAction) {
        nextAction.reset();
        nextAction.enabled = true;
        nextAction.setEffectiveTimeScale(bpm / (activeBlock.nativeBPM || 100));
        nextAction.play();

        if (prevAction && prevAction !== nextAction) {
          prevAction.crossFadeTo(nextAction, 0.3, true);
        }
        this.currentActionName = targetActionName;
      }
    }

    // Płynna synchronizacja z zegarem
    this.mixer.setTime(currentTimeSeconds);
    this.mixer.update(0);
  }

  private getExactBoneNodeName(rawName: string): string {
    if (this.skeletonBones.has(rawName)) return this.skeletonBones.get(rawName)!.name;
    const clean = rawName.replace('mixamorig:', '').replace('mixamorig', '');
    if (this.skeletonBones.has(clean)) return this.skeletonBones.get(clean)!.name;
    if (this.skeletonBones.has(`mixamorig${clean}`)) return this.skeletonBones.get(`mixamorig${clean}`)!.name;
    if (this.skeletonBones.has(`mixamorig:${clean}`)) return this.skeletonBones.get(`mixamorig:${clean}`)!.name;
    return rawName;
  }

  /**
   * Tworzy natywny THREE.AnimationClip z 60 FPS z pełną translacją miednicy (bounce, wyskoki) i rotacjami 24 stawów
   */
  private createAnimationClipFromBlock(block: DanceMoveBlock): THREE.AnimationClip | null {
    if (!block.keyframes || block.keyframes.length === 0) return null;

    const nativeBPM = block.nativeBPM || 100;
    const durationSeconds = (block.durationBeats * 60) / nativeBPM;

    // 1. Zbierz wszystkie unikalne kości występujące w CAŁYM bloku
    const allBoneNamesSet = new Set<string>();
    block.keyframes.forEach((kf) => {
      kf.rotations.forEach((r) => allBoneNamesSet.add(r.boneName));
    });

    const times: number[] = [];
    const hipsPosValues: number[] = [];
    const boneTracksMap: Map<string, number[]> = new Map();

    // Inicjalizacja tablic dla każdej kości
    allBoneNamesSet.forEach((rawName) => {
      const nodeName = this.getExactBoneNodeName(rawName);
      boneTracksMap.set(`${nodeName}.quaternion`, []);
    });

    // Ostatnie znane rotacje dla każdej kości (fallback przy braku klucza w klatce)
    const lastRotations = new Map<string, [number, number, number]>();

    const keyframes = block.keyframes;
    for (let i = 0; i < keyframes.length; i++) {
      const kf = keyframes[i];
      const time = (kf.beatOffset * 60) / nativeBPM;
      times.push(time);

      // Aktualizuj mapę podanych rotacji w tej klatce
      const currentKfRotations = new Map<string, [number, number, number]>();
      kf.rotations.forEach((r) => {
        currentKfRotations.set(r.boneName, r.rotation);
        lastRotations.set(r.boneName, r.rotation);
      });

      let hipPitch = 0;
      let hipYaw = 0;

      // Dla KAŻDEJ znanej kości dodaj wartosc dla CAŁEJ klatki kluczowej
      allBoneNamesSet.forEach((rawName) => {
        const rot = currentKfRotations.get(rawName) || lastRotations.get(rawName) || [0, 0, 0];
        if (rawName.includes('Hips')) {
          hipPitch = rot[0];
          hipYaw = rot[1];
        }

        const nodeName = this.getExactBoneNodeName(rawName);
        const trackName = `${nodeName}.quaternion`;
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'XYZ'));
        
        boneTracksMap.get(trackName)!.push(q.x, q.y, q.z, q.w);
      });

      // Hips translation (dynamic bounce Y and step X/Z)
      const bounceY = -0.12 * Math.max(0, Math.sin(kf.beatOffset * Math.PI)) - 0.05 * Math.abs(hipPitch);
      const stepX = 0.15 * Math.sin(hipYaw);
      hipsPosValues.push(stepX, bounceY, 0);
    }

    const tracks: THREE.KeyframeTrack[] = [];
    
    // Track translacji miednicy
    const hipsNodeName = this.getExactBoneNodeName('mixamorigHips');
    tracks.push(new THREE.VectorKeyframeTrack(`${hipsNodeName}.position`, times, hipsPosValues));

    // Tracki rotacji kości (każdy ma TERAZ DOKŁADNIE times.length * 4 elementów!)
    boneTracksMap.forEach((values, trackName) => {
      if (values.length === times.length * 4) {
        tracks.push(new THREE.QuaternionKeyframeTrack(trackName, times, values));
      }
    });

    return new THREE.AnimationClip(block.id || block.name, durationSeconds, tracks);
  }
}
