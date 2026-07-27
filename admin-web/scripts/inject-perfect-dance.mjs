import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NodeIO, Document } from '@gltf-transform/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateDances() {
  const io = new NodeIO();
  const inputPath = path.resolve(__dirname, '../public/Y-Bot.glb');
  
  console.log('Loading clean Y-Bot.glb (must be 7 animations)...');
  const document = await io.read(inputPath);
  const root = document.getRoot();
  
  const animations = root.listAnimations();
  console.log(`Found ${animations.length} animations.`);
  if (animations.length !== 7) {
    console.error('Y-Bot.glb must have exactly 7 animations (run git checkout to reset it).');
    process.exit(1);
  }
  
  // Find 'walk' animation to use as a baseline/template
  const walkAnim = animations.find(a => a.getName() === 'walk');
  if (!walkAnim) throw new Error('Could not find walk animation');

  // We need to extract the "rest pose" translation for every node from the first frame of 'walk'
  const restTranslations = new Map(); // Node -> [x, y, z]
  for (const channel of walkAnim.listChannels()) {
    if (channel.getTargetPath() === 'translation') {
      const sampler = channel.getSampler();
      const node = channel.getTargetNode();
      const input = sampler.getInput();
      const output = sampler.getOutput();
      if (input && output && node) {
        // Get the very first keyframe value (3 floats)
        const val = [
          output.getScalar(0, 0),
          output.getScalar(0, 1),
          output.getScalar(0, 2)
        ];
        restTranslations.set(node, val);
      }
    }
  }
  
  console.log(`Captured rest-pose translations for ${restTranslations.size} bones.`);

  const DANCE_STYLES = [
    { name: 'hiphop_bounce', speed: 1.0, bounce: 0.15, armSway: 0.5 },
    { name: 'bboy_footwork', speed: 1.5, bounce: 0.05, armSway: 0.8 },
    { name: 'kpop_isolation', speed: 1.2, bounce: 0.02, armSway: 0.3 },
    { name: 'commercial_wave', speed: 0.8, bounce: 0.08, armSway: 0.6 },
    { name: 'heels_strut', speed: 0.9, bounce: 0.1, armSway: 0.2 }
  ];

  const FRAME_COUNT = 97; // exact match with walk's frame count
  const FPS = 24;

  for (const style of DANCE_STYLES) {
    console.log(`\nGenerating ${style.name}...`);
    // Create new animation
    const newAnim = document.createAnimation(style.name);
    
    // Create input accessor for Time (0 to ~4.0s)
    const timeAccessor = document.createAccessor()
      .setType('SCALAR')
      .setArray(new Float32Array(FRAME_COUNT))
      .setBuffer(root.listBuffers()[0]);
      
    for (let i = 0; i < FRAME_COUNT; i++) {
      timeAccessor.setScalar(i, i / FPS);
    }
    
    // For every bone that was animated in walk, create a channel in the new animation
    for (const walkChannel of walkAnim.listChannels()) {
      const path = walkChannel.getTargetPath();
      const node = walkChannel.getTargetNode();
      if (!node) continue;
      
      const newSampler = document.createAnimationSampler()
        .setInterpolation('LINEAR')
        .setInput(timeAccessor);
        
      const newChannel = document.createAnimationChannel()
        .setTargetPath(path)
        .setTargetNode(node)
        .setSampler(newSampler);
        
      newAnim.addSampler(newSampler);
      newAnim.addChannel(newChannel);
      
      // Determine output data
      if (path === 'scale') {
        const outAcc = document.createAccessor().setType('VEC3').setArray(new Float32Array(FRAME_COUNT * 3)).setBuffer(root.listBuffers()[0]);
        for(let f = 0; f < FRAME_COUNT; f++) {
          outAcc.setElement(f, [1, 1, 1]);
        }
        newSampler.setOutput(outAcc);
      } 
      else if (path === 'translation') {
        const outAcc = document.createAccessor().setType('VEC3').setArray(new Float32Array(FRAME_COUNT * 3)).setBuffer(root.listBuffers()[0]);
        const rest = restTranslations.get(node) || [0, 0, 0];
        
        for(let f = 0; f < FRAME_COUNT; f++) {
          let [x, y, z] = rest;
          if (node.getName().endsWith('Hips')) {
             y += Math.sin((f/FPS) * Math.PI * 2 * style.speed) * (style.bounce * 100);
          }
          outAcc.setElement(f, [x, y, z]);
        }
        newSampler.setOutput(outAcc);
      }
      else if (path === 'rotation') {
        const outAcc = document.createAccessor().setType('VEC4').setArray(new Float32Array(FRAME_COUNT * 4)).setBuffer(root.listBuffers()[0]);
        
        for(let f = 0; f < FRAME_COUNT; f++) {
          let qx = 0, qy = 0, qz = 0, qw = 1;
          const t = f / FPS;
          const nodeName = node.getName();
          
          if (nodeName.endsWith('Hips')) {
             qx = 0.1;
             qy = Math.sin(t * Math.PI * style.speed) * 0.1;
             qz = Math.cos(t * Math.PI * style.speed) * 0.1;
          }
          else if (nodeName.endsWith('LeftArm')) {
             qz = -0.5 - Math.sin(t * Math.PI * 2 * style.speed) * style.armSway * 0.2;
             qw = 0.8;
          }
          else if (nodeName.endsWith('RightArm')) {
             qz = 0.5 + Math.sin(t * Math.PI * 2 * style.speed) * style.armSway * 0.2;
             qw = 0.8;
          }
          else if (nodeName.endsWith('LeftUpLeg') || nodeName.endsWith('RightUpLeg')) {
             qx = -0.15;
             qy = 0.13;
             qz = -0.05;
          }
          else if (nodeName.endsWith('LeftLeg') || nodeName.endsWith('RightLeg')) {
             qx = 0.2 + Math.sin(t * Math.PI * style.speed) * 0.2;
             qw = 0.9;
          }
          // Normalize quaternion
          const len = Math.sqrt(qx*qx + qy*qy + qz*qz + qw*qw);
          outAcc.setElement(f, [qx/len, qy/len, qz/len, qw/len]);
        }
        newSampler.setOutput(outAcc);
      }
    }
  }

  // Remove empty buffers/views/accessors, build clean byte array
  // NodeIO write takes care of all the structural padding, offsets, bin lengths automatically
  console.log('\nWriting out clean generated Y-Bot.glb...');
  await io.write(inputPath, document);
  console.log('✅ Success! Y-Bot.glb is updated properly with @gltf-transform/core.');
}

generateDances().catch(console.error);
