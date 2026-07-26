import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ChoreographySequence } from '../utils/DanceMoveLibrary';
import { MotionEngine } from '../utils/MotionEngine';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

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
        // Zachowaj pauzę przy otwarciu modala
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
    } else {
      currentTimeRef.current = 0;
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => console.warn('Audio play blocked:', err));
      }
      setIsPlaying(true);
    }
  };

  const resetPlay = () => {
    currentTimeRef.current = 0;
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  // Three.js 3D Viewer Loop
  useEffect(() => {
    if (!mountRef.current) return;

    const width = Math.max(300, mountRef.current.clientWidth || 360);
    const height = 260;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0b0c);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 2.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = false; // Zapobiega przechwytywaniu kółka myszy w modalu
    controls.enablePan = false;
    controls.target.set(0, 1.0, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xff44aa, 2.0);
    dirLight.position.set(2, 4, 3);
    scene.add(dirLight);

    const grid = new THREE.GridHelper(10, 20, 0xf472b6, 0x27272a);
    grid.position.y = 0;
    scene.add(grid);

    let yBotModel: THREE.Object3D | null = null;

    loadGLTFOnce()
      .then((gltfData) => {
        if (!mountRef.current) return;
        const clonedScene = SkeletonUtils.clone(gltfData.scene) as THREE.Object3D;
        yBotModel = clonedScene;
        yBotModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        try {
          motionEngineRef.current.bindSkeleton(clonedScene, gltfData.animations);
          motionEngineRef.current.updatePose(paramsRef.current.sequence, 0, true);
        } catch (e) {
          console.warn('Error binding initial skeleton pose:', e);
        }
        yBotModel.position.set(0, 0, 0);
        scene.add(yBotModel);
        setIsLoadingModel(false);
      })
      .catch((err) => {
        console.error('Error loading Y-Bot in admin preview:', err);
        setIsLoadingModel(false);
      });

    let animId: number;
    let lastTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      
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
            true // Mirror view for instructor
          );
        } catch (e) {
          // Zapobiega zawieszaniu pętli renderującej przy błędach
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="bg-[#0B0B0C] border border-gray-800 rounded-xl p-3 mb-4 overflow-hidden relative">
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

      <div ref={mountRef} className="w-full h-[260px] rounded-lg overflow-hidden relative cursor-grab active:cursor-grabbing" />

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
