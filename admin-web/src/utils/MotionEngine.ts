import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ChoreographySequence, DanceMoveBlock } from './DanceMoveLibrary';

/**
 * Katalog mapujący nazwy klipów na ścieżki do plików GLB z animacjami MoCap.
 */
const CLIP_CATALOG: Record<string, string> = {
  // Animacje osadzone w Y-Bot.glb
  idle: '__embedded__',
  walk: '__embedded__',
  run: '__embedded__',
  agree: '__embedded__',
  headshake: '__embedded__',
  sad_pose: '__embedded__',
  sneak_pose: '__embedded__',

  // Dedykowane animacje taneczne MoCap z plików GLB (pełne 23 kości)
  hiphop_bounce: '/assets/animations/hiphop_bounce.glb',
  bboy_footwork: '/assets/animations/bboy_footwork.glb',
  kpop_isolation: '/assets/animations/kpop_isolation.glb',
  commercial_wave: '/assets/animations/commercial_wave.glb',
  heels_strut: '/assets/animations/heels_strut.glb',
  dance: '/assets/animations/dance.glb',
  dance_hiphop: '/assets/animations/dance_hiphop.glb',
};

/**
 * Mapowanie styl taneczny → preferowany klip
 */
const STYLE_FALLBACKS: Record<string, string[]> = {
  'Hip-Hop': ['hiphop_bounce', 'dance_hiphop', 'dance'],
  'Breakdance': ['bboy_footwork', 'dance', 'hiphop_bounce'],
  'K-Pop': ['kpop_isolation', 'dance_hiphop', 'dance'],
  'Commercial': ['commercial_wave', 'dance', 'dance_hiphop'],
  'High Heels': ['heels_strut', 'dance_hiphop', 'dance'],
};

export class MotionEngine {
  private mixer: THREE.AnimationMixer | null = null;
  private embeddedActions: Map<string, THREE.AnimationAction> = new Map();
  private loadedActions: Map<string, THREE.AnimationAction> = new Map();
  private currentActionName: string | null = null;
  private avatarScene: THREE.Object3D | null = null;
  private loadingClips: Set<string> = new Set();
  private gltfLoader: GLTFLoader = new GLTFLoader();

  /**
   * Rejestruje szkielet awatara 3D oraz inicjalizuje THREE.AnimationMixer.
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

    // Pre-load wszystkich 5 tanecznych plików GLB natychmiast po załadowaniu sceny
    this.preloadDanceClips();

    // Domyślnie odtwarzaj animację "idle"
    this.playClipByName('idle', 1.0);
  }

  /**
   * Natychmiastowo ładuje w tle wszystkie 5 dedykowanych animacji tanecznych
   */
  private preloadDanceClips(): void {
    const clipsToPreload = ['hiphop_bounce', 'bboy_footwork', 'kpop_isolation', 'commercial_wave', 'heels_strut', 'dance_hiphop', 'dance'];
    clipsToPreload.forEach((key) => {
      const clipUrl = CLIP_CATALOG[key];
      if (clipUrl && clipUrl !== '__embedded__' && !this.loadedActions.has(key) && !this.loadingClips.has(key)) {
        this.loadingClips.add(key);
        this.gltfLoader.load(
          clipUrl,
          (gltf) => {
            this.loadingClips.delete(key);
            if (this.mixer && gltf.animations && gltf.animations.length > 0) {
              const clip = gltf.animations[0];
              const action = this.mixer.clipAction(clip);
              this.loadedActions.set(key, action);
              console.info(`[MotionEngine] ✅ Preloaded dance clip "${key}" (${clip.duration.toFixed(1)}s, ${clip.tracks.length} tracks)`);
            }
          },
          undefined,
          () => { this.loadingClips.delete(key); }
        );
      }
    });
  }

  /**
   * Odtwarza klip animacyjny po nazwie z zatrzymaniem poprzednich akcji.
   */
  public playClipByName(clipName: string, timeScale: number = 1.0, crossFadeDuration: number = 0.3): void {
    if (!this.mixer) return;
    const key = clipName.toLowerCase();

    if (this.currentActionName === key) {
      const action = this.loadedActions.get(key);
      if (action) action.setEffectiveTimeScale(timeScale);
      return;
    }

    const existingAction = this.loadedActions.get(key);
    if (existingAction) {
      this.crossFadeToAction(existingAction, key, timeScale, crossFadeDuration);
      return;
    }

    const clipUrl = CLIP_CATALOG[key];
    if (!clipUrl || clipUrl === '__embedded__') {
      const fallbackName = this.findFallbackClipName(key);
      const fallback = fallbackName ? this.loadedActions.get(fallbackName) : null;
      if (fallback) {
        this.crossFadeToAction(fallback, fallbackName || 'idle', 1.0, crossFadeDuration);
      }
      return;
    }

    if (this.loadingClips.has(key)) return;
    this.loadingClips.add(key);

    console.info(`[MotionEngine] Ładowanie klipu tanecznego: "${key}" z ${clipUrl}...`);
    this.gltfLoader.load(
      clipUrl,
      (gltf) => {
        this.loadingClips.delete(key);
        if (!this.mixer) return;

        if (gltf.animations && gltf.animations.length > 0) {
          const clip = gltf.animations[0];
          const action = this.mixer.clipAction(clip);
          this.loadedActions.set(key, action);
          console.info(`[MotionEngine] ✅ Załadowano klip "${key}" (${clip.duration.toFixed(1)}s)`);
          this.crossFadeToAction(action, key, timeScale, crossFadeDuration);
        } else {
          console.warn(`[MotionEngine] Plik ${clipUrl} nie zawiera animacji`);
        }
      },
      undefined,
      (err) => {
        this.loadingClips.delete(key);
        console.warn(`[MotionEngine] Nie udało się załadować "${key}" z ${clipUrl}:`, err);
        const fallbackName = this.findFallbackClipName(key);
        if (fallbackName && this.currentActionName !== fallbackName) {
          const fallback = this.loadedActions.get(fallbackName);
          if (fallback) this.crossFadeToAction(fallback, fallbackName, timeScale, crossFadeDuration);
        }
      }
    );
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
      const idleAction = this.loadedActions.get('idle') || this.embeddedActions.get('idle');
      if (idleAction) {
        this.crossFadeToAction(idleAction, 'idle', 1.0, 0.3);
      }
    }

    this.mixer.update(delta);
  }

  public getMixer(): THREE.AnimationMixer | null {
    return this.mixer;
  }

  private resolveClipNameForBlock(block: DanceMoveBlock): string {
    const style = block.style || 'Hip-Hop';
    const fallbacks = STYLE_FALLBACKS[style] || STYLE_FALLBACKS['Hip-Hop'];

    for (const candidate of fallbacks) {
      if (this.loadedActions.has(candidate) || CLIP_CATALOG[candidate]) {
        return candidate;
      }
    }

    return 'hiphop_bounce';
  }

  private findFallbackClipName(_failedKey: string): string | null {
    for (const fallback of ['hiphop_bounce', 'dance_hiphop', 'dance', 'idle']) {
      if (this.loadedActions.has(fallback) || CLIP_CATALOG[fallback]) return fallback;
    }
    return 'idle';
  }

  /**
   * Zatrzymuje WSZYSTKIE poprzednio odtwarzane akcje (w tym walk/run) i płynnie włącza docelową akcję taneczną.
   */
  private crossFadeToAction(
    nextAction: THREE.AnimationAction,
    nextName: string,
    timeScale: number,
    crossFadeDuration: number
  ): void {
    if (this.currentActionName === nextName && nextAction.isRunning()) {
      nextAction.setEffectiveTimeScale(timeScale);
      return;
    }

    // Zwróć uwagę: zatrzymujemy WSZYSTKIE poprzednie akcje, aby usunąć ścieżki chodu/biegu
    this.loadedActions.forEach((action, key) => {
      if (key !== nextName && action !== nextAction) {
        action.stop();
      }
    });

    nextAction.reset();
    nextAction.enabled = true;
    nextAction.setEffectiveTimeScale(timeScale);
    nextAction.setLoop(THREE.LoopRepeat, Infinity);
    nextAction.clampWhenFinished = false;
    nextAction.play();

    this.currentActionName = nextName;
    console.info(`[MotionEngine] ▶ Odtwarzanie MoCap: "${nextName}" (tempo: ${timeScale.toFixed(2)}x)`);
  }
}
