import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SMPL_JOINT_MAP } from './aiTrainerService';

interface ThreeDViewerProps {
  currentFrame: number;
  animationFrames: THREE.Quaternion[][] | null;
  isMirrorMode: boolean;
  cameraMode: 'front' | 'back' | 'profile' | 'feet';
}

export default function ThreeDViewer({
  currentFrame,
  animationFrames,
  isMirrorMode,
  cameraMode
}: ThreeDViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Keep refs for updates inside loop without rebuilding scene
  const paramsRef = useRef({ currentFrame, animationFrames, isMirrorMode, cameraMode });
  paramsRef.current = { currentFrame, animationFrames, isMirrorMode, cameraMode };

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
    camera.position.set(0, 1.4, 3);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Clear previous canvas if any
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // Grid Floor & Reflective Mirror Floor styling
    const gridHelper = new THREE.GridHelper(20, 20, '#f472b6', '#27272a');
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

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 5, 3);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Stylized fuchsia side lights for stage feeling
    const pinkLight = new THREE.PointLight(0xf472b6, 1.5, 10);
    pinkLight.position.set(-2, 1, 1);
    scene.add(pinkLight);

    const blueLight = new THREE.PointLight(0x3b82f6, 1.5, 10);
    blueLight.position.set(2, 1, -1);
    scene.add(blueLight);

    // Model loading
    let yBotModel: THREE.Group | null = null;
    let bonesMap = new Map<string, THREE.Bone>();
    let hipsBone: THREE.Bone | null = null;

    const loader = new GLTFLoader();
    loader.load(
      '/Y-Bot.glb',
      (gltf) => {
        yBotModel = gltf.scene;
        yBotModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Premium glowing material styling
            const mesh = child as THREE.Mesh;
            mesh.material = new THREE.MeshStandardMaterial({
              color: 0xe4e4e7,
              roughness: 0.3,
              metalness: 0.2,
              skinning: true
            });
          }
          if ((child as THREE.Bone).isBone) {
            const bone = child as THREE.Bone;
            bonesMap.set(bone.name, bone);
            if (bone.name === 'mixamorig:Hips') {
              hipsBone = bone;
            }
          }
        });
        
        // Scale and position model appropriately (Xbot.glb is in meters, so 1.0 is correct)
        yBotModel.scale.set(1, 1, 1);
        yBotModel.position.set(0, 0, 0);
        scene.add(yBotModel);
      },
      undefined,
      (err) => console.error('Error loading Y-Bot.glb:', err)
    );

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
    
    const animate = () => {
      requestID = requestAnimationFrame(animate);

      const { currentFrame, animationFrames, isMirrorMode, cameraMode } = paramsRef.current;

      // 1. Mirror Mode
      if (yBotModel) {
        if (isMirrorMode) {
          yBotModel.scale.set(-1, 1, 1); // Mirror on X axis
        } else {
          yBotModel.scale.set(1, 1, 1);
        }
      }

      // 2. Apply Joint Rotations (6-DOF data mapping)
      if (animationFrames && animationFrames.length > 0) {
        const frameIdx = currentFrame % animationFrames.length;
        const currentRotations = animationFrames[frameIdx];
        
        if (currentRotations) {
          currentRotations.forEach((quat, jointIdx) => {
            const boneName = SMPL_JOINT_MAP[jointIdx];
            if (boneName) {
              const bone = bonesMap.get(boneName);
              if (bone) {
                bone.quaternion.copy(quat);
              }
            }
          });
        }
      }

      // 3. Camera presets relative to Hips tracking
      if (yBotModel) {
        yBotModel.updateMatrixWorld(true);
        const hipsWorldPos = new THREE.Vector3();
        if (hipsBone) {
          hipsBone.getWorldPosition(hipsWorldPos);
        } else {
          yBotModel.getWorldPosition(hipsWorldPos);
        }

        // Apply camera presets based on current mode
        const targetLookAt = hipsWorldPos.clone();
        
        switch (cameraMode) {
          case 'front':
            camera.position.set(hipsWorldPos.x, hipsWorldPos.y + 0.2, hipsWorldPos.z + 2.8);
            break;
          case 'back':
            camera.position.set(hipsWorldPos.x, hipsWorldPos.y + 0.2, hipsWorldPos.z - 2.8);
            break;
          case 'profile':
            camera.position.set(hipsWorldPos.x + 2.6, hipsWorldPos.y + 0.2, hipsWorldPos.z);
            break;
          case 'feet':
            camera.position.set(hipsWorldPos.x, hipsWorldPos.y - 0.2, hipsWorldPos.z + 2.0);
            targetLookAt.y -= 0.6; // look down at feet
            break;
        }
        
        camera.lookAt(targetLookAt);
      }

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
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
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
