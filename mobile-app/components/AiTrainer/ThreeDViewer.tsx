import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MotionEngine } from './MotionEngine';
import { ChoreographySequence } from './DanceMoveLibrary';

interface ThreeDViewerProps {
  currentFrame: number;
  animationFrames: THREE.Quaternion[][] | null;
  isMirrorMode: boolean;
  cameraMode: 'front' | 'back' | 'profile' | 'feet';
  sequence?: ChoreographySequence | null;
  audioTimeSeconds?: number;
  playbackSpeed?: number;
}

export default function ThreeDViewer({
  currentFrame,
  animationFrames,
  isMirrorMode,
  cameraMode,
  sequence,
  audioTimeSeconds = 0,
  playbackSpeed = 1.0
}: ThreeDViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const motionEngineRef = useRef<MotionEngine>(new MotionEngine());
  
  const paramsRef = useRef({ currentFrame, animationFrames, isMirrorMode, cameraMode, sequence, audioTimeSeconds, playbackSpeed });
  paramsRef.current = { currentFrame, animationFrames, isMirrorMode, cameraMode, sequence, audioTimeSeconds, playbackSpeed };

  // Ładowanie zewnętrznej animacji GLB z AI EDGE w locie
  useEffect(() => {
    if (sequence?.customGlbUrl) {
      motionEngineRef.current.loadRemoteAnimations([
        { name: 'edge_custom_anim', url: sequence.customGlbUrl }
      ]).catch(e => console.warn('Błąd ładowania animacji EDGE', e));
    }
  }, [sequence?.customGlbUrl]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !mountRef.current) return;

    const width = mountRef.current.clientWidth || 300;
    const height = mountRef.current.clientHeight || 300;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0B0B0C');
    
    // Fog for depth
    scene.fog = new THREE.FogExp2('#0B0B0C', 0.08);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 2.8);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Clear previous canvas if any
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // Interactive OrbitControls (allows user to rotate, zoom, pan)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.5;
    controls.maxDistance = 15;
    controls.target.set(0, 1.0, 0);

    // Grid Floor & Reflective Mirror Floor styling
    const gridHelper = new THREE.GridHelper(20, 20, '#888888', '#444444');
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Subtle dance studio floor plane for shadows
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0x18181b,
      roughness: 0.4,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Oświetlenie neutralne (Szkoła tańca)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(3, 4, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xf0f0f0, 1.0);
    rimLight.position.set(-3, 2, -3);
    scene.add(rimLight);
    
    const fillLight = new THREE.DirectionalLight(0xe0e0e0, 1.0);
    fillLight.position.set(0, -1, 3);
    scene.add(fillLight);

    // Model loading
    let hipsBone: THREE.Bone | null = null;
    let wrapper: THREE.Group | null = null;

    const loader = new GLTFLoader();
    loader.load(
      '/assets/animations/female_hip_hop/kick_step.glb',
      (gltf) => {
        const yBotModel = gltf.scene;
        yBotModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            const mesh = child as THREE.Mesh;
            const matName = (mesh.material as THREE.Material).name || '';
            if (matName.toLowerCase().includes('joint')) {
              mesh.material = new THREE.MeshLambertMaterial({ color: 0x444444 });
            } else {
              mesh.material = new THREE.MeshLambertMaterial({ color: 0xffffff });
            }
          }
          if ((child as THREE.Bone).isBone) {
            const bone = child as THREE.Bone;
            if (bone.name === 'mixamorig:Hips') {
              hipsBone = bone;
            }
          }
        });
        
        try {
          motionEngineRef.current.bindSkeleton(gltf.scene, gltf.animations);
          
          const animsToLoad = [
            { name: 'arm_wave', url: '/assets/animations/female_hip_hop/arm_wave.glb' },
            { name: 'body_wave', url: '/assets/animations/female_hip_hop/body_wave.glb' },
            { name: 'hip_hop_quake', url: '/assets/animations/female_hip_hop/hip_hop_quake.glb' },
            { name: 'kick_step', url: '/assets/animations/female_hip_hop/kick_step.glb' },
            { name: 'rib_pops', url: '/assets/animations/female_hip_hop/rib_pops.glb' },
            { name: 'running_man', url: '/assets/animations/female_hip_hop/running_man.glb' },
            { name: 'side_step', url: '/assets/animations/female_hip_hop/side_step.glb' },
            { name: 'side_to_side', url: '/assets/animations/female_hip_hop/side_to_side.glb' },
            { name: 'step_hip_hop', url: '/assets/animations/female_hip_hop/step_hip_hop.glb' },
            { name: 'timid_dansing', url: '/assets/animations/female_hip_hop/timid_dansing.glb' }
          ];
          motionEngineRef.current.loadRemoteAnimations(animsToLoad).catch(e => console.warn(e));
        } catch (e) {
          console.warn('Failed to bind skeleton:', e);
        }

        wrapper = new THREE.Group();
        wrapper.add(yBotModel);
        wrapper.rotation.set(0, 0, 0); // Bez obrotu, natywna pozycja pionowa awatara
        wrapper.position.set(0, 0, 0);
        
        scene.add(wrapper);

        // Position camera to initial preset
        applyCameraPreset(paramsRef.current.cameraMode);
      },
      undefined,
      (err) => console.error('Error loading kick_step.glb:', err)
    );

    // Function to apply camera mode presets relative to hips
    const applyCameraPreset = (mode: string) => {
      const hipsWorldPos = new THREE.Vector3();
      if (hipsBone) {
        hipsBone.getWorldPosition(hipsWorldPos);
      } else {
        hipsWorldPos.set(0, 1.04, 0);
      }

      controls.target.copy(hipsWorldPos);
      
      switch (mode) {
        case 'front':
          camera.position.set(hipsWorldPos.x, hipsWorldPos.y + 0.1, hipsWorldPos.z + 2.8);
          break;
        case 'back':
          camera.position.set(hipsWorldPos.x, hipsWorldPos.y + 0.1, hipsWorldPos.z - 2.8);
          break;
        case 'profile':
          camera.position.set(hipsWorldPos.x + 2.6, hipsWorldPos.y + 0.1, hipsWorldPos.z);
          break;
        case 'feet':
          camera.position.set(hipsWorldPos.x, hipsWorldPos.y - 0.3, hipsWorldPos.z + 2.0);
          controls.target.y = Math.max(0.2, hipsWorldPos.y - 0.6); // look down at feet
          break;
      }
      controls.update();
    };

    // ResizeObserver handles mounting and layout changes robustly
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width || 300;
        const h = entry.contentRect.height || 300;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(mountRef.current);

    // Main animation loop
    let requestID: number;
    let lastCameraMode = cameraMode;
    
    let lastTime = performance.now();
    const animate = () => {
      requestID = requestAnimationFrame(animate);

      const now = performance.now();
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const { currentFrame, isMirrorMode, cameraMode, sequence, audioTimeSeconds, playbackSpeed } = paramsRef.current;

      // 1. Mirror Mode
      if (wrapper) {
        if (isMirrorMode) {
          wrapper.scale.set(-1, 1, 1);
        } else {
          wrapper.scale.set(1, 1, 1);
        }
      }

      // 2. Update Motion Engine with AnimationMixer
      try {
        if (sequence && sequence.blocks && sequence.blocks.length > 0) {
          // Kiedy odtwarzamy właściwą sekwencję (delta decyduje o czasie awatara proporcjonalnie do tempa)
          motionEngineRef.current.updatePose(sequence, audioTimeSeconds, delta * playbackSpeed, isMirrorMode);
        } else {
          // Zatrzymane: wymuszamy tick 0, czyli oddychanie idle
          motionEngineRef.current.tick(0);
        }
      } catch (e) {}

      // 3. Check for cameraMode preset switches
      if (lastCameraMode !== cameraMode) {
        lastCameraMode = cameraMode;
        applyCameraPreset(cameraMode);
      }

      // 4. Update OrbitControls for interactive drag/zoom/pan
      controls.update();

      renderer.render(scene, camera);
    };

    animate();

    // Clean up WebGL resources to prevent memory leaks
    return () => {
      if (mountRef.current) {
        resizeObserver.unobserve(mountRef.current);
      }
      resizeObserver.disconnect();
      cancelAnimationFrame(requestID);
      controls.dispose();
      renderer.dispose();
      
      // Traverse and dispose materials and geometries
      scene.traverse((object) => {
        if (!(object as THREE.Mesh).isMesh) return;
        const mesh = object as THREE.Mesh;
        mesh.geometry.dispose();
        
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      });
    };
  }, []);

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
      ) : (
        <View style={styles.fallback} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0B0B0C'
  },
  fallback: {
    flex: 1,
    backgroundColor: '#0B0B0C'
  }
});
