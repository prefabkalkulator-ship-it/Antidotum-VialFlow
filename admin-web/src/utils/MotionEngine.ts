import * as THREE from 'three';
import type { ChoreographySequence, DanceMoveBlock, PoseKeyframe } from './DanceMoveLibrary';

export class MotionEngine {
  private skeletonBones: Map<string, THREE.Bone> = new Map();
  private mixer: THREE.AnimationMixer | null = null;
  private animActions: Map<string, THREE.AnimationAction> = new Map();
  private currentActionName: string | null = null;

  /**
   * Rejestruje węzły szkieletu awatara 3D oraz inicjalizuje THREE.AnimationMixer z danymi MoCap
   */
  public bindSkeleton(scene: THREE.Object3D, animations: THREE.AnimationClip[] = []): void {
    this.skeletonBones.clear();
    this.animActions.clear();

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

    if (animations && animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(scene);
      animations.forEach((clip) => {
        if (this.mixer) {
          const action = this.mixer.clipAction(clip);
          this.animActions.set(clip.name.toLowerCase(), action);
        }
      });
    }
  }

  /**
   * Aktualizuje pozycje i obroty kości 3D za pomocą natywnego THREE.AnimationMixer z płynnym przenikaniem (cross-fade)
   */
  public updatePose(
    sequence: ChoreographySequence,
    currentTimeSeconds: number,
    isMirrorMode: boolean = false
  ): void {
    if (!sequence || !sequence.blocks || sequence.blocks.length === 0) return;

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

    // Jeżeli dany blok posiada bogate klatki kluczowe dla tańca, priorytetyzujemy płynną rotację stawów 3D
    if (activeBlock.keyframes && activeBlock.keyframes.length > 0) {
      const interpolatedRotations = this.evaluateBlockRotations(activeBlock, blockBeatOffset);

      interpolatedRotations.forEach((rot, boneName) => {
        let bone = this.skeletonBones.get(boneName) || this.skeletonBones.get(`mixamorig${boneName}`);
        if (bone) {
          const euler = new THREE.Euler(rot[0], rot[1], rot[2], 'XYZ');
          bone.quaternion.setFromEuler(euler);
        }
      });
      return;
    }

    // Fallback: AnimationMixer z klipami MoCap GLB
    if (this.mixer && this.animActions.size > 0) {
      let targetAnimName = 'walk';
      const blockId = (activeBlock.id || '').toLowerCase();
      const style = (activeBlock.style || '').toLowerCase();

      if (blockId.includes('break') || style.includes('break')) {
        targetAnimName = this.animActions.has('run') ? 'run' : 'walk';
      } else if (blockId.includes('kpop') || style.includes('kpop')) {
        targetAnimName = this.animActions.has('agree') ? 'agree' : 'walk';
      } else if (blockId.includes('heels') || style.includes('heels')) {
        targetAnimName = this.animActions.has('sneak_pose') ? 'sneak_pose' : 'walk';
      } else if (blockId.includes('comm') || style.includes('commercial')) {
        targetAnimName = this.animActions.has('sad_pose') ? 'sad_pose' : 'walk';
      } else if (blockId.includes('hiphop') || style.includes('hip-hop')) {
        targetAnimName = this.animActions.has('headshake') ? 'headshake' : 'walk';
      }

      if (this.currentActionName !== targetAnimName) {
        const nextAction = this.animActions.get(targetAnimName);
        const prevAction = this.currentActionName ? this.animActions.get(this.currentActionName) : null;

        if (nextAction) {
          nextAction.reset();
          nextAction.enabled = true;
          nextAction.setEffectiveTimeScale(bpm / (activeBlock.nativeBPM || 100));
          nextAction.play();

          if (prevAction) {
            prevAction.crossFadeTo(nextAction, 0.4, true);
          }
          this.currentActionName = targetAnimName;
        }
      }

      this.mixer.setTime(currentTimeSeconds);
    }
  }

  private evaluateBlockRotations(block: DanceMoveBlock, beatOffset: number): Map<string, [number, number, number]> {
    const result = new Map<string, [number, number, number]>();
    const keyframes = block.keyframes;

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
    const rawFactor = duration > 0 ? (beatOffset - prevKf.beatOffset) / duration : 0;
    
    // Gładkie wygładzanie tempa ruchu (Smoothstep / Cosine Easing)
    const factor = 0.5 - 0.5 * Math.cos(Math.max(0, Math.min(1, rawFactor)) * Math.PI);

    const prevBones = new Map(prevKf.rotations.map(r => [r.boneName, r.rotation]));
    const nextBones = new Map(nextKf.rotations.map(r => [r.boneName, r.rotation]));

    const allBoneNames = Array.from(new Set([...prevBones.keys(), ...nextBones.keys()]));

    allBoneNames.forEach((boneName) => {
      const rotA = prevBones.get(boneName) || [0, 0, 0];
      const rotB = nextBones.get(boneName) || rotA;

      const qA = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotA[0], rotA[1], rotA[2], 'XYZ'));
      const qB = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotB[0], rotB[1], rotB[2], 'XYZ'));
      
      qA.slerp(qB, factor);

      const euler = new THREE.Euler().setFromQuaternion(qA, 'XYZ');
      result.set(boneName, [euler.x, euler.y, euler.z]);
    });

    // Automatyczna kompensacja nacisku nóg, ugięcia kolan i kotwiczenia stóp na podłożu (Foot Grounding / Leg IK Fallback)
    const hipsRot = result.get('mixamorigHips') || result.get('Hips') || [0, 0, 0];
    const [hipPitch, hipYaw, hipRoll] = hipsRot;

    // Jeżeli stawy nóg nie były zdefiniowane w klatce kluczowej, wyliczamy je fizycznie z przechyłu hips
    if (!result.has('mixamorigLeftUpLeg') && !result.has('LeftUpLeg')) {
      result.set('mixamorigLeftUpLeg', [-0.35 * hipPitch + 0.1, -0.4 * hipYaw, -0.6 * hipRoll - 0.12]);
    }
    if (!result.has('mixamorigRightUpLeg') && !result.has('RightUpLeg')) {
      result.set('mixamorigRightUpLeg', [-0.35 * hipPitch + 0.1, -0.4 * hipYaw, -0.6 * hipRoll + 0.12]);
    }

    if (!result.has('mixamorigLeftLeg') && !result.has('LeftLeg')) {
      // Naturalne ugięcie kolana przy opadaniu bioder (bounce)
      const kneeFlex = -0.4 * Math.max(0, hipPitch) - 0.25;
      result.set('mixamorigLeftLeg', [kneeFlex, 0, 0]);
    }
    if (!result.has('mixamorigRightLeg') && !result.has('RightLeg')) {
      const kneeFlex = -0.4 * Math.max(0, hipPitch) - 0.25;
      result.set('mixamorigRightLeg', [kneeFlex, 0, 0]);
    }

    if (!result.has('mixamorigLeftFoot') && !result.has('LeftFoot')) {
      // Stabilizacja płaskiej stopy na podłożu
      result.set('mixamorigLeftFoot', [0.25 * hipPitch + 0.1, 0, 0]);
    }
    if (!result.has('mixamorigRightFoot') && !result.has('RightFoot')) {
      result.set('mixamorigRightFoot', [0.25 * hipPitch + 0.1, 0, 0]);
    }

    return result;
  }
}
