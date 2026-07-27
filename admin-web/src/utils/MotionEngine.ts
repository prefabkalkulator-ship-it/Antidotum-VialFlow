import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ChoreographySequence, DanceMoveBlock } from './DanceMoveLibrary';

interface SwapModel {
  scene: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  action: THREE.AnimationAction;
}

/**
 * Katalog mapujący nazwy klipów na animacje.
 * Wszystkie 12 animacji (w tym 5 tanecznych) są osadzone bezpośrednio w Y-Bot.glb!
 */
const CLIP_CATALOG: Record<string, string> = {
  idle: '__embedded__',
  walk: '__embedded__',
  run: '__embedded__',
  agree: '__embedded__',
  headshake: '__embedded__',
  sad_pose: '__embedded__',
  sneak_pose: '__embedded__',

  hiphop_bounce: '__embedded__',
  bboy_footwork: '__embedded__',
  kpop_isolation: '__embedded__',
  commercial_wave: '__embedded__',
  heels_strut: '__embedded__',
  dance: '__embedded__',
  dance_hiphop: '__embedded__',
};

const STYLE_FALLBACKS: Record<string, string[]> = {
  'Hip-Hop': ['hiphop_bounce', 'run'],
  'Breakdance': ['bboy_footwork', 'hiphop_bounce'],
  'K-Pop': ['kpop_isolation', 'hiphop_bounce'],
  'Commercial': ['commercial_wave', 'walk'],
  'High Heels': ['heels_strut', 'commercial_wave'],
};

export class MotionEngine {
  private mixer: THREE.AnimationMixer | null = null;
  private embeddedActions: Map<string, THREE.AnimationAction> = new Map();
  private loadedActions: Map<string, THREE.AnimationAction> = new Map(); // Used just for checking existence
  private swapModels: Map<string, SwapModel> = new Map();
  private currentActionName: string | null = null;
  private avatarScene: THREE.Object3D | null = null;
  private gltfLoader: GLTFLoader = new GLTFLoader();

  /**
   * Rejestruje szkielet awatara 3D oraz inicjalizuje THREE.AnimationMixer.
   * Wszystkie osadzone animacje z Y-Bot.glb są natychmiastowo rejestrowane.
   */
  public bindSkeleton(scene: THREE.Object3D, embeddedAnimations: THREE.AnimationClip[] = []): void {
    this.embeddedActions.clear();
    this.loadedActions.clear();
    this.currentActionName = null;
    this.avatarScene = scene;
    this.mixer = new THREE.AnimationMixer(scene);

    if (embeddedAnimations && embeddedAnimations.length > 0) {
      embeddedAnimations.forEach((clip) => {
        if (this.mixer) {
          const action = this.mixer.clipAction(clip);
          const key = clip.name.toLowerCase();
          this.embeddedActions.set(key, action);
          this.loadedActions.set(key, action);
          console.info(`[MotionEngine] Zarejestrowano osadzony klip: "${key}" (${clip.duration.toFixed(1)}s, ${clip.tracks.length} tracków)`);
        }
      });
    }

    // Domyślnie odtwarzaj animację "idle"
    this.playClipByName('idle', 1.0);
  }

  /**
   * Ładuje całe pliki MOCAP jako oddzielne instancje modeli (Model Swapping).
   * Omija problem macierzy szkieletów Y-Up vs Z-Up, ponieważ każda animacja
   * ma własną powłokę "With Skin", z którą działa bezbłędnie.
   */
  public async loadRemoteAnimations(animUrls: {name: string, url: string}[]): Promise<void> {
    if (!this.avatarScene) return;

    const loader = new GLTFLoader();
    for (const {name, url} of animUrls) {
      if (this.swapModels.has(name)) continue;

      try {
        const gltf = await loader.loadAsync(url);
        if (gltf.animations.length > 0) {
          const clip = gltf.animations[0];
          const scene = gltf.scene;

          // Dopasowanie estetyki Neon Vibes na nowych siatkach
          scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                const mat = mesh.material as THREE.MeshStandardMaterial;
                mat.metalness = 0.5;
                mat.roughness = 0.2;
                mat.color = new THREE.Color(0x887799);
              }
            }
          });

          scene.position.set(0, 0, 0);
          scene.visible = false; // Domyślnie w ukryciu
          
          if (this.avatarScene.parent) {
             this.avatarScene.parent.add(scene);
          }

          const modelMixer = new THREE.AnimationMixer(scene);
          const action = modelMixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.play();

          this.swapModels.set(name, { scene, mixer: modelMixer, action });
          this.loadedActions.set(name, action);
          
          console.info(`[MotionEngine] Zarejestrowano Swap Model: "${name}" (${clip.duration.toFixed(1)}s)`);
        }
      } catch (err) {
        console.error(`Nie udało się pobrać Swap Modelu: ${name}`, err);
      }
    }
  }

  /**
   * Odtwarza klip używając techniki Model Swapping.
   */
  public playClipByName(clipName: string, timeScale: number = 1.0, crossFadeDuration: number = 0.3): void {
    if (!this.mixer || !this.avatarScene) return;
    const key = clipName.toLowerCase();
    
    let activeKey = key;
    if (!this.swapModels.has(key) && !this.embeddedActions.has(key)) {
       activeKey = this.findFallbackClipName(key) || 'idle';
    }

    if (this.currentActionName === activeKey) {
       if (this.swapModels.has(activeKey)) {
          this.swapModels.get(activeKey)!.action.setEffectiveTimeScale(timeScale);
       } else if (this.embeddedActions.has(activeKey)) {
          this.embeddedActions.get(activeKey)!.setEffectiveTimeScale(timeScale);
       }
       return;
    }

    // SWAP: Hide current model
    if (this.currentActionName) {
       if (this.swapModels.has(this.currentActionName)) {
          this.swapModels.get(this.currentActionName)!.scene.visible = false;
       } else {
          this.avatarScene.visible = false;
       }
    }

    // SWAP: Show new model and reset action
    if (this.swapModels.has(activeKey)) {
       const swap = this.swapModels.get(activeKey)!;
       swap.scene.visible = true;
       swap.action.reset();
       swap.action.setEffectiveTimeScale(timeScale);
       swap.action.play();
    } else if (this.embeddedActions.has(activeKey)) {
       this.avatarScene.visible = true;
       const action = this.embeddedActions.get(activeKey)!;
       action.reset();
       action.setEffectiveTimeScale(timeScale);
       action.play();
    }

    this.currentActionName = activeKey;
  }

  /**
   * Główna metoda aktualizacji klatki podczas odtwarzania.
   */
  public updatePose(
    sequence: ChoreographySequence,
    currentTimeSeconds: number,
    delta: number,
    _isMirrorMode: boolean = false
  ): void {
    if (!this.mixer) return;

    this.mixer.update(delta);
    this.swapModels.forEach(m => m.mixer.update(delta));

    if (!sequence || !sequence.blocks || sequence.blocks.length === 0) return;

    const bpm = sequence.targetBPM || 100;
    
    let totalBeats = 0;
    sequence.blocks.forEach((b) => {
      totalBeats += b.durationBeats || 8;
    });

    if (totalBeats <= 0) totalBeats = 8;

    const beatsPerSecond = bpm / 60;
    const currentBeat = (currentTimeSeconds * beatsPerSecond) % totalBeats;

    let accumulatedBeats = 0;
    let activeBlockIndex = 0;

    for (let i = 0; i < sequence.blocks.length; i++) {
      const block = sequence.blocks[i];
      const duration = block.durationBeats || 8;
      if (currentBeat >= accumulatedBeats && currentBeat < accumulatedBeats + duration) {
        activeBlockIndex = i;
        break;
      }
      accumulatedBeats += duration;
    }

    const activeBlock = sequence.blocks[activeBlockIndex];
    if (!activeBlock) return;

    const clipName = activeBlock.clipName || this.resolveClipNameForBlock(activeBlock);
    const timeScale = bpm / (activeBlock.nativeBPM || 100);

    this.playClipByName(clipName, timeScale);
  }

  /**
   * Tick mixera na pauzie (przejście awatara w pozę spoczynkową idle)
   */
  public tick(delta: number): void {
    if (!this.mixer) return;

    if (this.currentActionName !== 'idle') {
      this.playClipByName('idle', 1.0);
    }

    this.mixer.update(delta);
    this.swapModels.forEach(m => m.mixer.update(delta));
  }

  public getMixer(): THREE.AnimationMixer | null {
    return this.mixer;
  }

  private resolveClipNameForBlock(block: DanceMoveBlock): string {
    const style = block.style || 'Hip-Hop';
    const fallbacks = STYLE_FALLBACKS[style] || STYLE_FALLBACKS['Hip-Hop'];

    for (const candidate of fallbacks) {
      if (this.loadedActions.has(candidate)) {
        return candidate;
      }
    }

    return 'hiphop_bounce';
  }

  private findFallbackClipName(_failedKey: string): string | null {
    for (const fallback of ['hiphop_bounce', 'dance_hiphop', 'dance', 'idle']) {
      if (this.loadedActions.has(fallback)) return fallback;
    }
    return 'idle';
  }

  private crossFadeToAction(
    nextAction: THREE.AnimationAction,
    nextName: string,
    timeScale: number,
    crossFadeDuration: number
  ): void {
    // CrossFading usunięty na rzecz natychmiastowego swapu. Metoda zdeprecjonowana.
  }
}
