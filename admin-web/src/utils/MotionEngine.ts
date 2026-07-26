import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ChoreographySequence, DanceMoveBlock } from './DanceMoveLibrary';

/**
 * Katalog mapujący nazwy klipów na ścieżki do plików GLB z animacjami MoCap.
 * Klucze to `clipName` z DanceMoveBlock, wartości to URL do pliku GLB.
 */
const CLIP_CATALOG: Record<string, string> = {
  // Animacje osadzone w Y-Bot.glb (nie wymagają osobnego pliku)
  idle: '__embedded__',
  walk: '__embedded__',
  run: '__embedded__',
  agree: '__embedded__',
  headshake: '__embedded__',
  sad_pose: '__embedded__',
  sneak_pose: '__embedded__',

  // Animacje taneczne z osobnych plików GLB (Mixamo MoCap)
  hiphop_bounce: '/assets/animations/hiphop_bounce.glb',
  bboy_footwork: '/assets/animations/bboy_footwork.glb',
  kpop_isolation: '/assets/animations/kpop_isolation.glb',
  commercial_wave: '/assets/animations/commercial_wave.glb',
  heels_strut: '/assets/animations/heels_strut.glb',
};

/**
 * Mapowanie styl taneczny → preferowany clipName (fallback jeśli brak dedykowanego klipu)
 */
const STYLE_FALLBACKS: Record<string, string[]> = {
  'Hip-Hop': ['hiphop_bounce', 'run', 'walk'],
  'Breakdance': ['bboy_footwork', 'hiphop_bounce', 'run'],
  'K-Pop': ['kpop_isolation', 'hiphop_bounce', 'walk'],
  'Commercial': ['commercial_wave', 'walk', 'idle'],
  'High Heels': ['heels_strut', 'commercial_wave', 'walk'],
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
   * Rejestruje węzły szkieletu awatara 3D oraz inicjalizuje THREE.AnimationMixer.
   * Osadzone animacje z Y-Bot.glb są natychmiast rejestrowane jako dostępne akcje.
   */
  public bindSkeleton(scene: THREE.Object3D, embeddedAnimations: THREE.AnimationClip[] = []): void {
    this.embeddedActions.clear();
    this.loadedActions.clear();
    this.currentActionName = null;
    this.avatarScene = scene;
    this.mixer = new THREE.AnimationMixer(scene);

    // Rejestracja osadzonych animacji z Y-Bot.glb (idle, walk, run, etc.)
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

    // Domyślnie odtwarzaj animację "idle" jako naturalną pozę spoczynkową
    this.playClipByName('idle', 1.0);
  }

  /**
   * Odtwarza klip animacyjny po nazwie z płynnym przenikaniem (crossFade).
   * Jeśli klip jest osadzony — odtwarza natychmiast.
   * Jeśli klip to zewnętrzny GLB — ładuje asynchronicznie, potem odtwarza.
   */
  public playClipByName(clipName: string, timeScale: number = 1.0, crossFadeDuration: number = 0.3): void {
    if (!this.mixer) return;
    const key = clipName.toLowerCase();

    // Jeśli już odtwarzamy ten klip, dostosuj jedynie tempo
    if (this.currentActionName === key) {
      const action = this.loadedActions.get(key);
      if (action) action.setEffectiveTimeScale(timeScale);
      return;
    }

    // Sprawdź czy klip jest już załadowany (osadzony lub wcześniej pobrany)
    const existingAction = this.loadedActions.get(key);
    if (existingAction) {
      this.crossFadeToAction(existingAction, key, timeScale, crossFadeDuration);
      return;
    }

    // Klip zewnętrzny — załaduj GLB asynchronicznie
    const clipUrl = CLIP_CATALOG[key];
    if (!clipUrl || clipUrl === '__embedded__') {
      // Brak pliku GLB, użyj fallbacku
      console.warn(`[MotionEngine] Klip "${key}" niedostępny, fallback na "idle"`);
      const fallback = this.loadedActions.get('idle');
      if (fallback && this.currentActionName !== 'idle') {
        this.crossFadeToAction(fallback, 'idle', 1.0, crossFadeDuration);
      }
      return;
    }

    // Unikaj wielokrotnego ładowania tego samego klipu
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
          console.info(`[MotionEngine] ✅ Załadowano klip "${key}" (${clip.duration.toFixed(1)}s, ${clip.tracks.length} tracków)`);
          this.crossFadeToAction(action, key, timeScale, crossFadeDuration);
        } else {
          console.warn(`[MotionEngine] Plik ${clipUrl} nie zawiera animacji`);
        }
      },
      undefined,
      (err) => {
        this.loadingClips.delete(key);
        console.warn(`[MotionEngine] Nie udało się załadować "${key}" z ${clipUrl}:`, err);
        // Fallback: spróbuj odtworzyć osadzony klip
        const fallbackName = this.findFallbackClipName(key);
        if (fallbackName && this.currentActionName !== fallbackName) {
          const fallback = this.loadedActions.get(fallbackName);
          if (fallback) this.crossFadeToAction(fallback, fallbackName, timeScale, crossFadeDuration);
        }
      }
    );
  }

  /**
   * Główna metoda aktualizacji — wywoływana co klatkę renderowania.
   * Obsługuje oś czasu sekwencji choreograficznej i przełącza klipy MoCap.
   */
  public updatePose(
    sequence: ChoreographySequence,
    delta: number,
    _isMirrorMode: boolean = false
  ): void {
    if (!this.mixer) return;

    // Aktualizuj AnimationMixer o delta czasu (kluczowe dla płynności!)
    this.mixer.update(delta);

    if (!sequence || !sequence.blocks || sequence.blocks.length === 0) return;

    // Znajdź aktywny blok w sekwencji na podstawie czasu
    const bpm = sequence.targetBPM || 100;
    const block = sequence.blocks[0]; // Na razie odtwarzamy pierwszy blok
    if (!block) return;

    // Określ nazwę klipu do odtworzenia
    const clipName = (block as any).clipName || this.resolveClipNameForBlock(block);
    const timeScale = bpm / (block.nativeBPM || 100);

    this.playClipByName(clipName, timeScale);
  }

  /**
   * Tick mixera bez zmiany klipu (do użycia gdy isPlaying=false ale scena potrzebuje idle)
   */
  public tick(delta: number): void {
    if (this.mixer) this.mixer.update(delta);
  }

  /**
   * Zwraca mixer do zewnętrznej inspekcji (diagnostyka)
   */
  public getMixer(): THREE.AnimationMixer | null {
    return this.mixer;
  }

  /**
   * Mapuje blok taneczny na nazwę klipu MoCap na podstawie stylu
   */
  private resolveClipNameForBlock(block: DanceMoveBlock): string {
    const style = block.style || 'Hip-Hop';
    const fallbacks = STYLE_FALLBACKS[style] || STYLE_FALLBACKS['Hip-Hop'];

    for (const candidate of fallbacks) {
      if (this.loadedActions.has(candidate) || CLIP_CATALOG[candidate]) {
        return candidate;
      }
    }

    // Ostateczny fallback — którakolwiek dostępna animacja
    if (this.loadedActions.size > 0) {
      return this.loadedActions.keys().next().value!;
    }
    return 'idle';
  }

  /**
   * Znajduje najlepszy dostępny klip zastępczy
   */
  private findFallbackClipName(failedKey: string): string | null {
    // Szukaj w osadzonych klipach: preferuj walk > run > idle
    for (const fallback of ['walk', 'run', 'idle']) {
      if (this.loadedActions.has(fallback)) return fallback;
    }
    return null;
  }

  /**
   * Płynne przejście z aktywnego klipu na nowy z crossFade
   */
  private crossFadeToAction(
    nextAction: THREE.AnimationAction,
    nextName: string,
    timeScale: number,
    crossFadeDuration: number
  ): void {
    const prevAction = this.currentActionName ? this.loadedActions.get(this.currentActionName) : null;

    nextAction.reset();
    nextAction.enabled = true;
    nextAction.setEffectiveTimeScale(timeScale);
    nextAction.setLoop(THREE.LoopRepeat, Infinity);
    nextAction.clampWhenFinished = false;
    nextAction.play();

    if (prevAction && prevAction !== nextAction) {
      prevAction.crossFadeTo(nextAction, crossFadeDuration, true);
    }

    this.currentActionName = nextName;
    console.info(`[MotionEngine] ▶ Odtwarzanie: "${nextName}" (tempo: ${timeScale.toFixed(2)}x)`);
  }
}
