import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NodeIO } from '@gltf-transform/core';

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

  // The 7 animations are: agree, headShake, idle, run, sad_pose, sneak_pose, walk
  const animMap = {};
  for (const a of animations) {
    animMap[a.getName()] = a;
  }

  // Map MVP dance sequences to anatomically correct Mixamo animations.
  // Avoid 'agree', 'headShake', 'sad_pose', 'sneak_pose' as they are either too subtle or only 2 frames long (causing epileptic shaking).
  // We strictly use 'idle' (60 frames), 'walk' (30 frames), and 'run' (20 frames) for fluid looping.
  const DANCE_MAPPING = [
    { name: 'hiphop_bounce', source: 'idle' },       // Deep breath / groove
    { name: 'bboy_footwork', source: 'run' },        // Fast footwork
    { name: 'kpop_isolation', source: 'idle' },      // Static pose / waiting for beat
    { name: 'commercial_wave', source: 'idle' },     // Slow body groove
    { name: 'heels_strut', source: 'walk' }          // Strutting
  ];

  for (const style of DANCE_MAPPING) {
    console.log(`\nCloning ${style.source} -> ${style.name}...`);
    const sourceAnim = animMap[style.source];
    if (!sourceAnim) {
      console.warn(`Source ${style.source} not found!`);
      continue;
    }

    // Deep clone the animation
    const newAnim = sourceAnim.clone();
    newAnim.setName(style.name);
  }

  console.log('\nWriting out clean generated Y-Bot.glb with anatomically correct cloned dances...');
  await io.write(inputPath, document);
  console.log('✅ Success! Y-Bot.glb is updated properly with @gltf-transform/core.');
}

generateDances().catch(console.error);
