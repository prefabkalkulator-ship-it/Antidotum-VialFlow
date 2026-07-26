import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ChoreographySequence } from '../utils/DanceMoveLibrary';
import { MotionEngine } from '../utils/MotionEngine';
import { Play, Pause, RotateCcw, Loader2 } from 'lucide-react';

interface AdminChoreoPreviewProps {
  sequence: ChoreographySequence;
  audioUrl?: string;
}

let cachedGLTF: { scene: THREE.Object3D; animations: THREE.AnimationClip[] } | null = null;
let gltfLoadingPromise: Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[] }> | null = null;

function loadGLTFOnce(): Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[] }> {
  if (cachedGLTF) return Promise.resolve(cachedGLTF);
  if (gltfLoadingPromise) return gltfLoadingPromise;

  gltfLoadingPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      '/Y-Bot.glb',
      (gltf) => {
        cachedGLTF = { scene: gltf.scene, animations: gltf.animations };
        resolve(cachedGLTF);
      },
      undefined,
      (err) => {
        gltfLoadingPromise = null;
        reject(err);
      }
    );
  });
  return gltfLoadingPromise;
}

export default function AdminChoreoPreview({ sequence, audioUrl }: AdminChoreoPreviewProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const motionEngineRef = useRef<MotionEngine>(new MotionEngine());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(!cachedGLTF);
  const probeBoxRef = useRef<HTMLDivElement>(null);

  const logProbe = (msg: string, isError: boolean = false) => {
    const formatted = `${new Date().toLocaleTimeString()} - ${msg}`;
    if (isError) {
      console.error(`[3D PROBE ERROR] ${msg}`);
    } else {
      console.info(`%c[3D PROBE] ${msg}`, 'color: #00ff00; font-weight: bold;');
    }
    (window as any).__3dProbeLogs = (window as any).__3dProbeLogs || [];
    (window as any).__3dProbeLogs.unshift(formatted);
    // NAJNOWSZY WPIS ZAWSZE NA SAMEJ GÓRZE (NAJPIERW) - BEZ KONIECZNOŚCI SCROLLOWANIA
    setProbeLogs((prev) => [formatted, ...prev]);
  };

  const currentTimeRef = useRef(0);
  const paramsRef = useRef({ sequence, isPlaying });
  paramsRef.current = { sequence, isPlaying };

  // Audio initialization
  useEffect(() => {
    const defaultBeatUrl = 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=hip-hop-beat-112702.mp3';
    const audio = new Audio(audioUrl || defaultBeatUrl);
    audio.loop = true;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [audioUrl]);

  const initialSeqIdRef = useRef(sequence.id);

  // Automatyczne odtwarzanie animacji 3D tylko przy wygenerowaniu NOWEJ sekwencji (nie przy otwarciu modala)
  useEffect(() => {
    if (sequence && sequence.id) {
      if (sequence.id === initialSeqIdRef.current) {
        setIsPlaying(false);
        return;
      }
      currentTimeRef.current = 0;
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => console.warn('Audio autoplay blocked by browser policy:', err));
      }
    }
  }, [sequence.id]);

  const togglePlay = () => {
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
      logProbe('Odtwarzanie wstrzymane (Pauza)');
    } else {
      currentTimeRef.current = 0;
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => console.warn('Audio play blocked:', err));
      }
      setIsPlaying(true);
      logProbe('Odtwarzanie 3D uruchomione (Play)');
    }
  };

  const resetPlay = () => {
    currentTimeRef.current = 0;
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    logProbe('Zresetowano czas odtwarzania do 0.0s');
  };

  const [hasWebGLError, setHasWebGLError] = useState(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // 1. Inicjalizacja Sceny WebGL (uruchamiana TYLKO RAZ przy montowaniu montu)
  useEffect(() => {
    if (!mountRef.current) return;

    try {
      logProbe('Sonda gotowa, sprawdzanie obszaru montowania Canvas...');
      const width = Math.max(300, mountRef.current.clientWidth || 360);
      const height = 260;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0b0b0c);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, 1.2, 2.6);
      camera.lookAt(0, 1.0, 0);
      cameraRef.current = camera;

      logProbe('Tworzenie natywnego kontekstu THREE.WebGLRenderer...');
      const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(1);
      rendererRef.current = renderer;

      mountRef.current.appendChild(renderer.domElement);
      logProbe(`Płótno WebGL podpięte do DOM (${width}x${height}px)`);

      const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xff44aa, 1.8);
      dirLight.position.set(2, 4, 3);
      scene.add(dirLight);

      const grid = new THREE.GridHelper(10, 20, 0xf472b6, 0x27272a);
      grid.position.y = 0;
      scene.add(grid);

      logProbe('Rozpoczęcie natywnego pobierania fetch("/Y-Bot.glb")...');
      fetch('/Y-Bot.glb')
        .then((res) => {
          logProbe(`Odpowiedź HTTP dla Y-Bot.glb: Status ${res.status} ${res.statusText}`);
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.arrayBuffer();
        })
        .then((buffer) => {
          logProbe(`Pobrano bufor binarny: ${(buffer.byteLength / (1024 * 1024)).toFixed(2)} MB. Parsowanie GLTF...`);
          const loader = new GLTFLoader();
          loader.parse(
            buffer,
            '',
            (gltf) => {
              logProbe('Parsowanie GLTF ukończone! Podpinanie do sceny...');
              if (!mountRef.current) return;
              const yBotModel = gltf.scene;
              try {
                motionEngineRef.current.bindSkeleton(gltf.scene, gltf.animations);
                logProbe('Powiązano szkielet postaci w MotionEngine (24 kości)');
                motionEngineRef.current.updatePose(paramsRef.current.sequence, 0, true);
                logProbe('Ustawiono pozę początkową awatara');
              } catch (e: any) {
                logProbe(`⚠️ Ostrzeżenie przy wiązaniu kości: ${e?.message || e}`, true);
              }
              yBotModel.position.set(0, 0, 0);
              scene.add(yBotModel);
              setIsLoadingModel(false);
              renderer.render(scene, camera);
              logProbe('✅ Pierwsza klatka awatara zrenderowana pomyślnie!');
            },
            (parseErr: any) => {
              logProbe(`❌ Błąd parsowania GLTF: ${parseErr?.message || parseErr}`, true);
              setIsLoadingModel(false);
            }
          );
        })
        .catch((fetchErr: any) => {
          logProbe(`❌ Błąd pobierania pliku /Y-Bot.glb: ${fetchErr?.message || fetchErr}`, true);
          setIsLoadingModel(false);
        });
    } catch (err: any) {
      logProbe(`❌ Krytyczny błąd WebGL: ${err?.message || err}`, true);
      setHasWebGLError(true);
      return;
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (mountRef.current && rendererRef.current?.domElement) {
        try {
          mountRef.current.removeChild(rendererRef.current.domElement);
        } catch (e) {}
      }
    };
  }, []);

  // 2. Pętla Odtwarzania Animacji (sterowana wyłącznie flagą isPlaying)
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    let lastTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const now = performance.now();
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      if (audioRef.current && !audioRef.current.paused) {
        currentTimeRef.current = audioRef.current.currentTime;
      } else {
        currentTimeRef.current += delta;
      }

      try {
        motionEngineRef.current.updatePose(
          paramsRef.current.sequence,
          currentTimeRef.current,
          true
        );
      } catch (e: any) {
        logProbe(`⚠️ Błąd klatki animacji: ${e?.message || e}`, true);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying]);

  if (hasWebGLError) {
    return (
      <div className="bg-[#0B0B0C] border border-gray-800 rounded-xl p-4 mb-4 text-center text-gray-400 text-xs font-mono">
        🎭 Podgląd 3D Awatara (Sekwencja: {sequence.blocks.length} bloków, {sequence.targetBPM} BPM)
      </div>
    );
  }

  return (
    <div className="bg-[#0B0B0C] border border-gray-800 rounded-xl p-3 mb-4 overflow-hidden relative">
      {/* Sonda Diagnostyczna NA SAMEJ GÓRZE KOMPONENTU */}
      <div ref={probeBoxRef} className="mb-3 p-2.5 bg-[#000000]/95 border border-green-500/40 rounded-lg text-[10px] font-mono text-green-400 max-h-40 overflow-y-auto z-20 relative shadow-lg">
        <div className="font-bold text-gray-300 mb-1 border-b border-gray-800 pb-1 flex justify-between items-center">
          <span className="flex items-center gap-1.5 text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
            SONDA DIAGNOSTYCZNA 3D (Wszystkie wpisy są w konsoli F12)
          </span>
          <span className="text-[9px] bg-green-950 text-green-300 px-1.5 py-0.5 rounded">F12 Console</span>
        </div>
        {probeLogs.map((log, idx) => (
          <div key={idx} className="leading-tight py-0.5 border-b border-gray-900/60 last:border-0 font-mono">
            {log}
          </div>
        ))}
        {probeLogs.length === 0 && (
          <div className="text-gray-500 italic">Ładowanie rejestratora sondy 3D...</div>
        )}
      </div>

      {isLoadingModel && (
        <div className="absolute inset-0 bg-[#0B0B0C]/90 z-10 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs font-mono">
          <Loader2 size={24} className="animate-spin text-primary" />
          <span>Ładowanie awatara 3D...</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          Podgląd 3D Awatara dla Trenera
        </span>
        <span className="text-xs font-mono text-primary font-bold">
          {sequence.targetBPM} BPM | {sequence.blocks.length} x 8-liczeń
        </span>
      </div>

      <div ref={mountRef} className="w-full h-[260px] rounded-lg overflow-hidden relative pointer-events-none" />

      <div className="flex items-center justify-between mt-3 bg-[#18181B] p-2 rounded-lg border border-gray-800">
        <button
          type="button"
          onClick={togglePlay}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-1.5 rounded-md font-bold text-xs transition-colors"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          <span>{isPlaying ? 'Pauza' : 'Odtwórz Podgląd 3D'}</span>
        </button>

        <button
          type="button"
          onClick={resetPlay}
          className="text-gray-400 hover:text-white p-1.5 rounded-md transition-colors"
          title="Od nowa"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}
