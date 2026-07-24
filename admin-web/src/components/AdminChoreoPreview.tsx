import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ChoreographySequence } from '../utils/DanceMoveLibrary';
import { MotionEngine } from '../utils/MotionEngine';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface AdminChoreoPreviewProps {
  sequence: ChoreographySequence;
  audioUrl?: string;
}

export default function AdminChoreoPreview({ sequence, audioUrl }: AdminChoreoPreviewProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const motionEngineRef = useRef<MotionEngine>(new MotionEngine());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioTime, setAudioTime] = useState(0);

  const paramsRef = useRef({ sequence, isPlaying, audioTime });
  paramsRef.current = { sequence, isPlaying, audioTime };

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

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.warn('Audio autoplay blocked:', err));
      setIsPlaying(true);
    }
  };

  const resetPlay = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setAudioTime(0);
    }
  };

  // Three.js 3D Viewer Loop
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || 360;
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
    const loader = new GLTFLoader();

    loader.load(
      '/Y-Bot.glb',
      (gltf) => {
        yBotModel = gltf.scene;
        yBotModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        motionEngineRef.current.bindSkeleton(gltf.scene);
        yBotModel.position.set(0, 0, 0);
        scene.add(yBotModel);
      },
      undefined,
      (err) => console.error('Error loading Y-Bot in admin preview:', err)
    );

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      
      const delta = clock.getDelta();
      if (paramsRef.current.isPlaying && audioRef.current) {
        setAudioTime(audioRef.current.currentTime);
      }

      motionEngineRef.current.updatePose(
        paramsRef.current.sequence,
        audioRef.current ? audioRef.current.currentTime : 0,
        true // Mirror view for instructor
      );

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
