import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatePath = path.resolve(__dirname, '../public/Y-Bot.glb');
const outputDir = path.resolve(__dirname, '../public/assets/animations');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read template Y-Bot GLB
const fileBuffer = fs.readFileSync(templatePath);
const jsonChunkLength = fileBuffer.readUInt32LE(12);
const gltfJson = JSON.parse(fileBuffer.toString('utf8', 20, 20 + jsonChunkLength));

// Map node names to indices
const nodeMap = new Map();
gltfJson.nodes.forEach((n, i) => nodeMap.set(n.name, i));

function getExactNodeName(rawName) {
  if (nodeMap.has(rawName)) return rawName;
  if (nodeMap.has(`mixamorig:${rawName}`)) return `mixamorig:${rawName}`;
  const clean = rawName.replace('mixamorig:', '').replace('mixamorig', '');
  if (nodeMap.has(`mixamorig:${clean}`)) return `mixamorig:${clean}`;
  if (nodeMap.has(clean)) return clean;
  return rawName;
}

// Euler angles (radians) to Quaternion [x, y, z, w]
function eulerToQuaternion(x, y, z) {
  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);

  return [
    s1 * c2 * c3 - c1 * s2 * s3,
    c1 * s2 * c3 + s1 * c2 * s3,
    c1 * c2 * s3 - s1 * s2 * c3,
    c1 * c2 * c3 + s1 * s2 * s3
  ];
}

// Helper to build GLB
function buildGLB(jsonObj, binBuf) {
  let jsonStr = JSON.stringify(jsonObj);
  while (Buffer.byteLength(jsonStr, 'utf8') % 4 !== 0) {
    jsonStr += ' ';
  }
  const jsonBuf = Buffer.from(jsonStr, 'utf8');

  let binPadded = binBuf;
  if (binBuf.length % 4 !== 0) {
    const padLen = 4 - (binBuf.length % 4);
    binPadded = Buffer.concat([binBuf, Buffer.alloc(padLen)]);
  }

  const headerLen = 12;
  const jsonChunkHeaderLen = 8;
  const binChunkHeaderLen = binPadded.length > 0 ? 8 : 0;
  const totalGlbLen = headerLen + jsonChunkHeaderLen + jsonBuf.length + binChunkHeaderLen + binPadded.length;

  const outBuf = Buffer.alloc(totalGlbLen);
  outBuf.write('glTF', 0, 4, 'ascii');
  outBuf.writeUInt32LE(2, 4);
  outBuf.writeUInt32LE(totalGlbLen, 8);

  let offset = 12;
  outBuf.writeUInt32LE(jsonBuf.length, offset);
  outBuf.writeUInt32LE(0x4E4F534A, offset + 4);
  offset += 8;
  jsonBuf.copy(outBuf, offset);
  offset += jsonBuf.length;

  if (binPadded.length > 0) {
    outBuf.writeUInt32LE(binPadded.length, offset);
    outBuf.writeUInt32LE(0x0042494E, offset + 4);
    offset += 8;
    binPadded.copy(outBuf, offset);
  }

  return outBuf;
}

function generateCustomDanceGLB(animName, styleType, durationSec = 4.0, fps = 30) {
  const totalFrames = Math.floor(durationSec * fps);
  const timeStep = durationSec / totalFrames;

  const times = new Float32Array(totalFrames + 1);
  for (let i = 0; i <= totalFrames; i++) {
    times[i] = i * timeStep;
  }

  const channels = [];
  const samplers = [];
  const binBuffers = [];

  const timesBuf = Buffer.from(times.buffer);
  binBuffers.push(timesBuf);

  const accessors = [
    {
      bufferView: 0,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: times.length,
      type: 'SCALAR',
      min: [0.0],
      max: [durationSec]
    }
  ];

  const timeAccessorIdx = 0;

  function addTrack(rawNodeName, pathType, valuesArray, componentsPerKeyframe) {
    const nodeName = getExactNodeName(rawNodeName);
    const nodeIdx = nodeMap.get(nodeName);
    if (nodeIdx === undefined) return;

    const valBuf = Buffer.from(valuesArray.buffer);
    const bvIdx = binBuffers.length;
    binBuffers.push(valBuf);

    const accIdx = accessors.length;
    accessors.push({
      bufferView: bvIdx,
      byteOffset: 0,
      componentType: 5126,
      count: times.length,
      type: componentsPerKeyframe === 3 ? 'VEC3' : 'VEC4'
    });

    const samplerIdx = samplers.length;
    samplers.push({
      input: timeAccessorIdx,
      interpolation: 'LINEAR',
      output: accIdx
    });

    channels.push({
      sampler: samplerIdx,
      target: {
        node: nodeIdx,
        path: pathType
      }
    });
  }

  const numFrames = times.length;
  const hipsPos = new Float32Array(numFrames * 3);
  const hipsRot = new Float32Array(numFrames * 4);
  const spineRot = new Float32Array(numFrames * 4);
  const spine1Rot = new Float32Array(numFrames * 4);
  const spine2Rot = new Float32Array(numFrames * 4);
  const neckRot = new Float32Array(numFrames * 4);
  const rArmRot = new Float32Array(numFrames * 4);
  const rForeArmRot = new Float32Array(numFrames * 4);
  const lArmRot = new Float32Array(numFrames * 4);
  const lForeArmRot = new Float32Array(numFrames * 4);
  const rUpLegRot = new Float32Array(numFrames * 4);
  const rLegRot = new Float32Array(numFrames * 4);
  const lUpLegRot = new Float32Array(numFrames * 4);
  const lLegRot = new Float32Array(numFrames * 4);

  const freq = (2 * Math.PI) / durationSec;

  for (let i = 0; i < numFrames; i++) {
    const t = times[i];
    const phase = t * freq * 2; // 2 full beats per 4s loop

    if (styleType === 'hiphop_bounce') {
      // 1. Hip-Hop Bounce: Deep hip drops, torso bounce, arm grooves
      hipsPos[i * 3 + 0] = Math.sin(phase) * 0.12;
      hipsPos[i * 3 + 1] = -Math.abs(Math.sin(phase * 2)) * 0.12; // Bounce down
      hipsPos[i * 3 + 2] = Math.cos(phase) * 0.06;

      hipsRot.set(eulerToQuaternion(0.1, Math.sin(phase) * 0.15, Math.cos(phase) * 0.1), i * 4);
      spineRot.set(eulerToQuaternion(0.2 + Math.abs(Math.sin(phase * 2)) * 0.2, -Math.sin(phase) * 0.1, 0), i * 4);
      spine2Rot.set(eulerToQuaternion(0.15, 0, 0), i * 4);
      neckRot.set(eulerToQuaternion(-Math.abs(Math.sin(phase * 2)) * 0.15, 0, 0), i * 4);

      lArmRot.set(eulerToQuaternion(0.4, 0.3, -1.0 + Math.sin(phase * 2) * 0.4), i * 4);
      lForeArmRot.set(eulerToQuaternion(0.8 + Math.sin(phase * 2) * 0.3, 0, 0), i * 4);
      rArmRot.set(eulerToQuaternion(0.4, -0.3, 1.0 - Math.sin(phase * 2) * 0.4), i * 4);
      rForeArmRot.set(eulerToQuaternion(0.8 + Math.sin(phase * 2) * 0.3, 0, 0), i * 4);

      lUpLegRot.set(eulerToQuaternion(-0.2 + Math.sin(phase) * 0.2, 0.2, -0.1), i * 4);
      lLegRot.set(eulerToQuaternion(Math.abs(Math.sin(phase * 2)) * 0.6, 0, 0), i * 4);
      rUpLegRot.set(eulerToQuaternion(-0.2 - Math.sin(phase) * 0.2, -0.2, 0.1), i * 4);
      rLegRot.set(eulerToQuaternion(Math.abs(Math.sin(phase * 2)) * 0.6, 0, 0), i * 4);

    } else if (styleType === 'bboy_footwork') {
      // 2. B-Boy Toprock & Footwork: Wide arm crosses, torso rotations, step-outs
      hipsPos[i * 3 + 0] = Math.sin(phase) * 0.25; // Wide lateral steps
      hipsPos[i * 3 + 1] = -Math.abs(Math.cos(phase * 2)) * 0.08;
      hipsPos[i * 3 + 2] = 0;

      hipsRot.set(eulerToQuaternion(0.1, Math.sin(phase) * 0.4, Math.cos(phase) * 0.2), i * 4);
      spineRot.set(eulerToQuaternion(0.15, -Math.sin(phase) * 0.3, 0), i * 4);
      spine2Rot.set(eulerToQuaternion(0.2, 0, 0), i * 4);
      neckRot.set(eulerToQuaternion(0, -Math.sin(phase) * 0.2, 0), i * 4);

      // Arm crosses: left arm swings across body, right swings out
      lArmRot.set(eulerToQuaternion(1.2 + Math.cos(phase) * 0.5, 0.5, 0.4 * Math.sin(phase)), i * 4);
      lForeArmRot.set(eulerToQuaternion(0.5, 0, 0), i * 4);
      rArmRot.set(eulerToQuaternion(-0.4 - Math.cos(phase) * 0.5, -0.5, -0.4 * Math.sin(phase)), i * 4);
      rForeArmRot.set(eulerToQuaternion(0.5, 0, 0), i * 4);

      lUpLegRot.set(eulerToQuaternion(Math.sin(phase) * 0.5, 0.3, -0.2), i * 4);
      lLegRot.set(eulerToQuaternion(Math.max(0, Math.sin(phase)) * 0.7, 0, 0), i * 4);
      rUpLegRot.set(eulerToQuaternion(-Math.sin(phase) * 0.5, -0.3, 0.2), i * 4);
      rLegRot.set(eulerToQuaternion(Math.max(0, -Math.sin(phase)) * 0.7, 0, 0), i * 4);

    } else if (styleType === 'kpop_isolation') {
      // 3. K-Pop Sharp Isolation: Sharp chest pops, elbow locks, rigid isolation
      const sharpStep = Math.sign(Math.sin(phase * 2));
      hipsPos[i * 3 + 0] = sharpStep * 0.05;
      hipsPos[i * 3 + 1] = -Math.abs(sharpStep) * 0.04;
      hipsPos[i * 3 + 2] = 0;

      hipsRot.set(eulerToQuaternion(0, sharpStep * 0.2, 0), i * 4);
      spineRot.set(eulerToQuaternion(sharpStep * 0.15, 0, 0), i * 4);
      spine2Rot.set(eulerToQuaternion(sharpStep * 0.25, 0, 0), i * 4);
      neckRot.set(eulerToQuaternion(-sharpStep * 0.1, 0, 0), i * 4);

      // Sharp right angle elbow locks
      lArmRot.set(eulerToQuaternion(1.4 * sharpStep, 0.8, 0.4), i * 4);
      lForeArmRot.set(eulerToQuaternion(1.2, 0, 0), i * 4);
      rArmRot.set(eulerToQuaternion(1.4 * -sharpStep, -0.8, -0.4), i * 4);
      rForeArmRot.set(eulerToQuaternion(1.2, 0, 0), i * 4);

      lUpLegRot.set(eulerToQuaternion(0, 0.2, -0.1), i * 4);
      lLegRot.set(eulerToQuaternion(0.3, 0, 0), i * 4);
      rUpLegRot.set(eulerToQuaternion(0, -0.2, 0.1), i * 4);
      rLegRot.set(eulerToQuaternion(0.3, 0, 0), i * 4);

    } else if (styleType === 'commercial_wave') {
      // 4. Commercial Fluid Body Wave: Spine roll, fluid arm waves, hip rolls
      hipsPos[i * 3 + 0] = Math.sin(phase) * 0.1;
      hipsPos[i * 3 + 1] = Math.sin(phase * 2) * 0.05;
      hipsPos[i * 3 + 2] = Math.cos(phase * 2) * 0.08;

      hipsRot.set(eulerToQuaternion(Math.sin(phase * 2) * 0.2, Math.cos(phase) * 0.2, 0), i * 4);
      spineRot.set(eulerToQuaternion(-Math.sin(phase * 2 - 0.5) * 0.25, 0, 0), i * 4);
      spine2Rot.set(eulerToQuaternion(-Math.sin(phase * 2 - 1.0) * 0.3, 0, 0), i * 4);
      neckRot.set(eulerToQuaternion(-Math.sin(phase * 2 - 1.5) * 0.2, 0, 0), i * 4);

      // Fluid arm waves
      lArmRot.set(eulerToQuaternion(0.3, 0.4, 1.2 + Math.sin(phase * 2) * 0.4), i * 4);
      lForeArmRot.set(eulerToQuaternion(0.4 + Math.sin(phase * 2 - 0.5) * 0.4, 0, 0), i * 4);
      rArmRot.set(eulerToQuaternion(0.3, -0.4, -1.2 - Math.sin(phase * 2) * 0.4), i * 4);
      rForeArmRot.set(eulerToQuaternion(0.4 + Math.sin(phase * 2 - 0.5) * 0.4, 0, 0), i * 4);

      lUpLegRot.set(eulerToQuaternion(Math.sin(phase) * 0.2, 0.1, -0.1), i * 4);
      lLegRot.set(eulerToQuaternion(Math.abs(Math.sin(phase)) * 0.4, 0, 0), i * 4);
      rUpLegRot.set(eulerToQuaternion(-Math.sin(phase) * 0.2, -0.1, 0.1), i * 4);
      rLegRot.set(eulerToQuaternion(Math.abs(Math.cos(phase)) * 0.4, 0, 0), i * 4);

    } else if (styleType === 'heels_strut') {
      // 5. High Heels Sassy Strut: Sassy hip pops, hand framing, posture
      hipsPos[i * 3 + 0] = Math.sin(phase) * 0.15; // Hip pop left/right
      hipsPos[i * 3 + 1] = -Math.abs(Math.sin(phase * 2)) * 0.05;
      hipsPos[i * 3 + 2] = Math.cos(phase) * 0.04;

      hipsRot.set(eulerToQuaternion(0.1, Math.sin(phase) * 0.35, -Math.sin(phase) * 0.25), i * 4);
      spineRot.set(eulerToQuaternion(-0.1, -Math.sin(phase) * 0.2, 0), i * 4);
      spine2Rot.set(eulerToQuaternion(-0.1, 0, Math.sin(phase) * 0.15), i * 4);
      neckRot.set(eulerToQuaternion(0.15, -Math.sin(phase) * 0.25, 0), i * 4);

      // Sassy arm positions: hand to waist/hip, other arm framing face
      lArmRot.set(eulerToQuaternion(1.6 + Math.sin(phase) * 0.3, 0.6, 0.4), i * 4);
      lForeArmRot.set(eulerToQuaternion(1.4, 0, 0), i * 4);
      rArmRot.set(eulerToQuaternion(0.3 - Math.sin(phase) * 0.3, -0.4, -0.8), i * 4);
      rForeArmRot.set(eulerToQuaternion(0.8, 0, 0), i * 4);

      lUpLegRot.set(eulerToQuaternion(0.2, 0.2, -0.1), i * 4);
      lLegRot.set(eulerToQuaternion(Math.abs(Math.sin(phase)) * 0.5, 0, 0), i * 4);
      rUpLegRot.set(eulerToQuaternion(-0.2, -0.2, 0.1), i * 4);
      rLegRot.set(eulerToQuaternion(Math.abs(Math.cos(phase)) * 0.5, 0, 0), i * 4);
    }
  }

  addTrack('mixamorig:Hips', 'translation', hipsPos, 3);
  addTrack('mixamorig:Hips', 'rotation', hipsRot, 4);
  addTrack('mixamorig:Spine', 'rotation', spineRot, 4);
  addTrack('mixamorig:Spine1', 'rotation', spine1Rot, 4);
  addTrack('mixamorig:Spine2', 'rotation', spine2Rot, 4);
  addTrack('mixamorig:Neck', 'rotation', neckRot, 4);
  addTrack('mixamorig:RightArm', 'rotation', rArmRot, 4);
  addTrack('mixamorig:RightForeArm', 'rotation', rForeArmRot, 4);
  addTrack('mixamorig:LeftArm', 'rotation', lArmRot, 4);
  addTrack('mixamorig:LeftForeArm', 'rotation', lForeArmRot, 4);
  addTrack('mixamorig:RightUpLeg', 'rotation', rUpLegRot, 4);
  addTrack('mixamorig:RightLeg', 'rotation', rLegRot, 4);
  addTrack('mixamorig:LeftUpLeg', 'rotation', lUpLegRot, 4);
  addTrack('mixamorig:LeftLeg', 'rotation', lLegRot, 4);

  const bufferViews = [];
  const binChunks = [];
  let currentOffset = 0;

  binBuffers.forEach(buf => {
    const pad = (4 - (currentOffset % 4)) % 4;
    if (pad > 0) {
      binChunks.push(Buffer.alloc(pad));
      currentOffset += pad;
    }
    bufferViews.push({
      buffer: 0,
      byteOffset: currentOffset,
      byteLength: buf.length
    });
    binChunks.push(buf);
    currentOffset += buf.length;
  });

  const finalBinBuffer = Buffer.concat(binChunks);

  const cleanNodes = JSON.parse(JSON.stringify(gltfJson.nodes));
  cleanNodes.forEach(node => {
    delete node.mesh;
    delete node.skin;
  });

  const outJson = {
    asset: { version: '2.0', generator: 'MoCap Dance Generator' },
    scenes: gltfJson.scenes,
    scene: gltfJson.scene,
    nodes: cleanNodes,
    animations: [
      {
        name: animName,
        channels: channels,
        samplers: samplers
      }
    ],
    accessors: accessors,
    bufferViews: bufferViews,
    buffers: [{ byteLength: finalBinBuffer.length }]
  };

  const glbBuf = buildGLB(outJson, finalBinBuffer);
  const outPath = path.join(outputDir, `${animName}.glb`);
  fs.writeFileSync(outPath, glbBuf);
  console.log(`[MoCap Generator] Created ${animName}.glb (${(glbBuf.length / 1024).toFixed(1)} KB)`);
}

// Generate all 5 dedicated MoCap dance GLB files
generateCustomDanceGLB('hiphop_bounce', 'hiphop_bounce', 4.0);
generateCustomDanceGLB('bboy_footwork', 'bboy_footwork', 4.0);
generateCustomDanceGLB('kpop_isolation', 'kpop_isolation', 4.0);
generateCustomDanceGLB('commercial_wave', 'commercial_wave', 4.0);
generateCustomDanceGLB('heels_strut', 'heels_strut', 4.0);

// Generate legacy fallbacks too
generateCustomDanceGLB('dance_hiphop', 'hiphop_bounce', 4.0);
generateCustomDanceGLB('dance', 'commercial_wave', 4.0);

console.log('[MoCap Generator] ✅ All 5 dedicated MoCap dance GLB files created successfully!');
