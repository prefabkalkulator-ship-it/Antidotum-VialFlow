import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NodeIO } from '@gltf-transform/core';
import { prune, mergeDocuments } from '@gltf-transform/functions';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateDances() {
  const io = new NodeIO();
  const inputPath = path.resolve(__dirname, '../public/Y-Bot.glb');
  
  console.log('Loading clean Y-Bot.glb...');
  const document = await io.read(inputPath);
  const root = document.getRoot();
  
  const animations = root.listAnimations();
  if (animations.length !== 7) {
    console.error('Y-Bot.glb must have exactly 7 animations.');
    process.exit(1);
  }

  // Define original nodes BEFORE any merge operations to guarantee pure Y-Bot references
  const originalNodes = new Map();
  root.listNodes().forEach(n => {
    if (!originalNodes.has(n.getName())) {
      originalNodes.set(n.getName(), n);
    }
  });

  const DANCE_MAPPING = [
    { target: 'hiphop_bounce', sourceFile: 'hiphop_bounce.glb' },
    { target: 'bboy_footwork', sourceFile: 'bboy_footwork.glb' },
    { target: 'kpop_isolation', sourceFile: 'kpop_isolation.glb' },
    { target: 'commercial_wave', sourceFile: 'commercial_wave.glb' },
    { target: 'heels_strut', sourceFile: 'heels_strut.glb' }
  ];

  for (const mapping of DANCE_MAPPING) {
    const fbxGltfPath = path.resolve(__dirname, '../public/assets/animations', mapping.sourceFile);
    if (!fs.existsSync(fbxGltfPath)) {
      console.warn(`Missing converted GLB: ${fbxGltfPath}`);
      continue;
    }

    const sourceDoc = await io.read(fbxGltfPath);
    console.log(`Injecting true MOCAP dance: ${mapping.sourceFile} -> ${mapping.target}`);
    
    // We append the source document into our main document
    mergeDocuments(document, sourceDoc);

    // After merge, the new animation is at the end of the array
    const mergedAnims = root.listAnimations();
    const injectedAnim = mergedAnims[mergedAnims.length - 1];
    
    // Rename it so MotionEngine.ts can play it
    injectedAnim.setName(mapping.target);
  }

  // Retarget channels to original nodes
  const allAnims = root.listAnimations();
  for (let i = 7; i < allAnims.length; i++) {
    const anim = allAnims[i];
    
    // We must collect channels to remove, since modifying the array during iteration can cause issues
    const channelsToRemove = [];
    
    for (const channel of anim.listChannels()) {
      const targetNode = channel.getTargetNode();
      const path = channel.getTargetPath();
      
      if (targetNode) {
        let nodeName = targetNode.getName();
        if (!originalNodes.has(nodeName)) {
           const withColon = nodeName.replace('mixamorig', 'mixamorig:');
           if (originalNodes.has(withColon)) nodeName = withColon;
        }

        const correctNode = originalNodes.get(nodeName);
        if (correctNode) {
          // CRITICAL: Prevent skeleton collapse!
          // Only the Hips (or root) should ever have their 'translation' animated by Mixamo FBX clips.
          // Other bones must maintain their original translation (which defines bone length).
          // Scale channels from FBX should also be ignored to avoid weird squishing.
          const isHips = correctNode.getName().includes('Hips');
          
          if (path === 'scale' || (path === 'translation' && !isHips)) {
            channelsToRemove.push(channel);
          } else {
            channel.setTargetNode(correctNode);
          }
        } else {
          // No mapping found
          channelsToRemove.push(channel);
        }
      } else {
        channelsToRemove.push(channel);
      }
    }
    
    // Remove the bad channels from the animation
    channelsToRemove.forEach(ch => ch.dispose());
  }

  // Now we can safely remove all the new nodes/meshes that were merged in, 
  // because the channels have been mapped to original nodes.
  root.listNodes().forEach(n => {
    if (!Array.from(originalNodes.values()).includes(n)) {
      n.dispose(); // Removes it and its children from the graph
    }
  });
  
  // Prune unused materials, meshes, accessors etc. that came from the FBX GLBs
  await document.transform(prune());

  // Consolidation: GLB format only supports a single buffer. Move all accessors to the primary buffer.
  const primaryBuffer = root.listBuffers()[0];
  root.listAccessors().forEach((a) => a.setBuffer(primaryBuffer));
  root.listBuffers().forEach((b, index) => {
    if (index > 0) b.dispose();
  });

  console.log('\nWriting out fully integrated MOCAP Y-Bot.glb...');
  await io.write(inputPath, document);
  console.log('✅ Success! Authentic Mixamo dances injected.');
}

generateDances().catch(console.error);
