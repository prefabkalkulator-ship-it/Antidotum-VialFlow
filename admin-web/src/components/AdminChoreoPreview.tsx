import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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

  const logProbe = (msg: string, isError: boolean = false) => {
    if (isError) {
      console.error(`[3D PROBE ERROR] ${msg}`);
    } else {
      console.info(`%c[3D PROBE] ${msg}`, 'color: #00ff00; font-weight: bold;');
    }
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

  // Automatyczne odtwarzanie animacji 3D przy wygenerowaniu NOWEJ sekwencji z promptu
  useEffect(() => {
    if (sequence && sequence.id) {
      currentTimeRef.current = 0;
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => console.warn('Audio autoplay blocked by browser policy:', err));
      }
    }
  }, [sequence?.id]);

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
  const controlsRef = useRef<OrbitControls | null>(null);

  // 1. Inicjalizacja Sceny WebGL + OrbitControls (uruchamiana TYLKO RAZ przy montowaniu)
  useEffect(() => {
    if (!mountRef.current) return;

    try {
      logProbe('Inicjalizacja widżetu 3D...');
      const width = Math.max(300, mountRef.current.clientWidth || 360);
      const height = 380; // Powiększony obszar podglądu dla pełnej sylwetki 1.8 m

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0b0b0c);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      // Precyzyjne kadrowanie dla awatara 1.8m: cel w środku ciężkości y = 0.90m, kamera z odległości 3.6m
      camera.position.set(0, 1.05, 3.6);
      camera.lookAt(0, 0.90, 0);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      rendererRef.current = renderer;

      mountRef.current.appendChild(renderer.domElement);

      // OrbitControls - obrót 360°, wycentrowany na wysokości miednicy (y = 0.90 m)
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.target.set(0, 0.90, 0);
      controls.maxPolarAngle = Math.PI / 2 + 0.1;
      controls.update();
      controlsRef.current = controls;

      // Profesjonalne Oświetlenie 3D (Key Light + Pink Rim Light + Fill Light)
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
      keyLight.position.set(2, 4, 3);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0xf472b6, 1.5);
      rimLight.position.set(-2, 2, -2);
      scene.add(rimLight);

      const grid = new THREE.GridHelper(10, 20, 0xf472b6, 0x3f3f46);
      grid.position.y = 0;
      scene.add(grid);

      logProbe('Rozpoczęcie pobierania pliku /Y-Bot.glb...');
      fetch('/Y-Bot.glb')
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.arrayBuffer();
        })
        .then((buffer) => {
          const loader = new GLTFLoader();
          loader.parse(
            buffer,
            '',
            (gltf) => {
              if (!mountRef.current) return;
              const yBotModel = gltf.scene;

              yBotModel.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                  const mesh = child as THREE.Mesh;
                  if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                    const mat = mesh.material as THREE.MeshStandardMaterial;
                    mat.metalness = 0.2;
                    mat.roughness = 0.3;
                  }
                }
              });

              try {
                motionEngineRef.current.bindSkeleton(gltf.scene, gltf.animations);
                motionEngineRef.current.updatePose(paramsRef.current.sequence, 0, true);
              } catch (e: any) {
                logProbe(`Ostrzeżenie szkieletu: ${e?.message || e}`, true);
              }
              yBotModel.position.set(0, 0, 0);
              scene.add(yBotModel);
              setIsLoadingModel(false);
              renderer.render(scene, camera);
              logProbe('✅ Awatar 3D zrenderowany pomyślnie!');
            },
            (parseErr: any) => {
              logProbe(`Błąd parsowania GLTF: ${parseErr?.message || parseErr}`, true);
              setIsLoadingModel(false);
            }
          );
        })
        .catch((fetchErr: any) => {
          logProbe(`Błąd pobierania /Y-Bot.glb: ${fetchErr?.message || fetchErr}`, true);
          setIsLoadingModel(false);
        });
    } catch (err: any) {
      logProbe(`Krytyczny błąd WebGL: ${err?.message || err}`, true);
      setHasWebGLError(true);
      return;
    }

    return () => {
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
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

  // 2. Pętla Odtwarzania Animacji + Renderowania klatek (sterowana flagą isPlaying)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      const now = performance.now();
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      if (paramsRef.current.isPlaying) {
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
        } catch (e: any) {}
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
    <div className="bg-[#0B0B0C] border border-gray-800 rounded-xl p-3 mb-4 overflow-hidden relative shadow-2xl">
      {isLoadingModel && (
        <div className="absolute inset-0 bg-[#0B0B0C]/90 z-10 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs font-mono">
          <Loader2 size={24} className="animate-spin text-primary" />
          <span>Ładowanie awatara 3D...</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          Podgląd 3D Awatara dla Trenera (Przeciągnij myszą, aby obrócić widok 360°)
        </span>
        <span className="text-xs font-mono text-primary font-bold">
          {sequence.targetBPM} BPM | {sequence.blocks.length} x 8-liczeń
        </span>
      </div>

      <div ref={mountRef} className="w-full h-[380px] rounded-lg overflow-hidden relative cursor-grab active:cursor-grabbing" />

      <div className="flex items-center justify-between mt-3 bg-[#18181B] p-2 rounded-lg border border-gray-800">
        <button
          type="button"
          onClick={togglePlay}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-1.5 rounded-md font-bold text-xs transition-colors cursor-pointer"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          <span>{isPlaying ? 'Pauza' : 'Odtwórz Podgląd 3D'}</span>
        </button>

        <button
          type="button"
          onClick={resetPlay}
          className="text-gray-400 hover:text-white p-1.5 rounded-md transition-colors cursor-pointer"
          title="Od nowa"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}
