import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Re-read clean template Y-Bot.glb
const templatePath = path.resolve(__dirname, '../public/Y-Bot.glb');
const fileBuffer = fs.readFileSync(templatePath);

const jsonChunkLength = fileBuffer.readUInt32LE(12);
const jsonStr = fileBuffer.toString('utf8', 20, 20 + jsonChunkLength);
const gltfJson = JSON.parse(jsonStr);

// We slice up to initial 7 animations to ensure clean state
if (gltfJson.animations.length > 7) {
  gltfJson.animations = gltfJson.animations.slice(0, 7);
}

const binChunkHeaderOffset = 20 + jsonChunkLength;
const binChunkLength = fileBuffer.readUInt32LE(binChunkHeaderOffset);
const origBinBuffer = fileBuffer.subarray(binChunkHeaderOffset + 8, binChunkHeaderOffset + 8 + binChunkLength);

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

const newBinBuffers = [origBinBuffer];
let currentBinOffset = origBinBuffer.length;

const BASE_HIPS_Y = 101.8; // Mixamo Y-Bot natural standing pelvis height

function createDanceAnimation(animName, styleType, durationSec = 4.0, fps = 30) {
  const totalFrames = Math.floor(durationSec * fps);
  const timeStep = durationSec / totalFrames;

  const times = new Float32Array(totalFrames + 1);
  for (let i = 0; i <= totalFrames; i++) {
    times[i] = i * timeStep;
  }

  const timesBuf = Buffer.from(times.buffer);
  
  const timePad = (4 - (currentBinOffset % 4)) % 4;
  if (timePad > 0) {
    newBinBuffers.push(Buffer.alloc(timePad));
    currentBinOffset += timePad;
  }

  const timesBvIdx = gltfJson.bufferViews.length;
  gltfJson.bufferViews.push({
    buffer: 0,
    byteOffset: currentBinOffset,
    byteLength: timesBuf.length
  });
  newBinBuffers.push(timesBuf);
  currentBinOffset += timesBuf.length;

  const timesAccIdx = gltfJson.accessors.length;
  gltfJson.accessors.push({
    bufferView: timesBvIdx,
    byteOffset: 0,
    componentType: 5126,
    count: times.length,
    type: 'SCALAR',
    min: [0.0],
    max: [durationSec]
  });

  const channels = [];
  const samplers = [];

  function addTrack(rawNodeName, pathType, valuesArray, componentsPerKeyframe) {
    const nodeName = getExactNodeName(rawNodeName);
    const nodeIdx = nodeMap.get(nodeName);
    if (nodeIdx === undefined) return;

    const valBuf = Buffer.from(valuesArray.buffer);

    const pad = (4 - (currentBinOffset % 4)) % 4;
    if (pad > 0) {
      newBinBuffers.push(Buffer.alloc(pad));
      currentBinOffset += pad;
    }

    const valBvIdx = gltfJson.bufferViews.length;
    gltfJson.bufferViews.push({
      buffer: 0,
      byteOffset: currentBinOffset,
      byteLength: valBuf.length
    });
    newBinBuffers.push(valBuf);
    currentBinOffset += valBuf.length;

    const valAccIdx = gltfJson.accessors.length;
    gltfJson.accessors.push({
      bufferView: valBvIdx,
      byteOffset: 0,
      componentType: 5126,
      count: times.length,
      type: componentsPerKeyframe === 3 ? 'VEC3' : 'VEC4'
    });

    const samplerIdx = samplers.length;
    samplers.push({
      input: timesAccIdx,
      interpolation: 'LINEAR',
      output: valAccIdx
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
  const headRot = new Float32Array(numFrames * 4);

  const lShoulderRot = new Float32Array(numFrames * 4);
  const lArmRot = new Float32Array(numFrames * 4);
  const lForeArmRot = new Float32Array(numFrames * 4);
  const lHandRot = new Float32Array(numFrames * 4);

  const rShoulderRot = new Float32Array(numFrames * 4);
  const rArmRot = new Float32Array(numFrames * 4);
  const rForeArmRot = new Float32Array(numFrames * 4);
  const rHandRot = new Float32Array(numFrames * 4);

  const lUpLegRot = new Float32Array(numFrames * 4);
  const lLegRot = new Float32Array(numFrames * 4);
  const lFootRot = new Float32Array(numFrames * 4);
  const lToeRot = new Float32Array(numFrames * 4);

  const rUpLegRot = new Float32Array(numFrames * 4);
  const rLegRot = new Float32Array(numFrames * 4);
  const rFootRot = new Float32Array(numFrames * 4);
  const rToeRot = new Float32Array(numFrames * 4);

  const freq = (2 * Math.PI) / durationSec;
  const zeroQ = eulerToQuaternion(0, 0, 0);

  for (let i = 0; i < numFrames; i++) {
    const t = times[i];
    const phase = t * freq * 2; // 2 full beats per 4s loop

    lShoulderRot.set(zeroQ, i * 4);
    rShoulderRot.set(zeroQ, i * 4);
    lHandRot.set(zeroQ, i * 4);
    rHandRot.set(zeroQ, i * 4);
    spine1Rot.set(zeroQ, i * 4);
    headRot.set(zeroQ, i * 4);
    lFootRot.set(zeroQ, i * 4);
    rFootRot.set(zeroQ, i * 4);
    lToeRot.set(zeroQ, i * 4);
    rToeRot.set(zeroQ, i * 4);

    if (styleType === 'hiphop_bounce') {
      // Hip-Hop Bounce (Pelvis at Y = 101.8 + bounce)
      hipsPos[i * 3 + 0] = Math.sin(phase) * 6.0;
      hipsPos[i * 3 + 1] = BASE_HIPS_Y - Math.abs(Math.sin(phase * 2)) * 12.0; // Deep bounce down
      hipsPos[i * 3 + 2] = Math.cos(phase) * 4.0;

      hipsRot.set(eulerToQuaternion(0.2, Math.sin(phase) * 0.2, Math.cos(phase) * 0.15), i * 4);
      spineRot.set(eulerToQuaternion(0.3 + Math.abs(Math.sin(phase * 2)) * 0.25, -Math.sin(phase) * 0.15, 0), i * 4);
      spine2Rot.set(eulerToQuaternion(0.2, 0, 0), i * 4);
      neckRot.set(eulerToQuaternion(-Math.abs(Math.sin(phase * 2)) * 0.2, 0, 0), i * 4);

      lArmRot.set(eulerToQuaternion(0.6, 0.4, -1.0 + Math.sin(phase * 2) * 0.6), i * 4);
      lForeArmRot.set(eulerToQuaternion(1.0 + Math.sin(phase * 2) * 0.5, 0, 0), i * 4);
      rArmRot.set(eulerToQuaternion(0.6, -0.4, 1.0 - Math.sin(phase * 2) * 0.6), i * 4);
      rForeArmRot.set(eulerToQuaternion(1.0 + Math.sin(phase * 2) * 0.5, 0, 0), i * 4);

      lUpLegRot.set(eulerToQuaternion(-0.4 + Math.sin(phase) * 0.25, 0.25, -0.15), i * 4);
      lLegRot.set(eulerToQuaternion(Math.abs(Math.sin(phase * 2)) * 0.9, 0, 0), i * 4);
      rUpLegRot.set(eulerToQuaternion(-0.4 - Math.sin(phase) * 0.25, -0.25, 0.15), i * 4);
      rLegRot.set(eulerToQuaternion(Math.abs(Math.sin(phase * 2)) * 0.9, 0, 0), i * 4);

    } else if (styleType === 'bboy_footwork') {
      // Breakdance Toprock
      hipsPos[i * 3 + 0] = Math.sin(phase) * 15.0;
      hipsPos[i * 3 + 1] = BASE_HIPS_Y - Math.abs(Math.cos(phase * 2)) * 8.0;
      hipsPos[i * 3 + 2] = 0;

      hipsRot.set(eulerToQuaternion(0.15, Math.sin(phase) * 0.6, Math.cos(phase) * 0.25), i * 4);
      spineRot.set(eulerToQuaternion(0.25, -Math.sin(phase) * 0.5, 0), i * 4);
      spine2Rot.set(eulerToQuaternion(0.25, 0, 0), i * 4);
      neckRot.set(eulerToQuaternion(0, -Math.sin(phase) * 0.35, 0), i * 4);

      lArmRot.set(eulerToQuaternion(1.6 + Math.cos(phase) * 0.7, 0.7, 0.6 * Math.sin(phase)), i * 4);
      lForeArmRot.set(eulerToQuaternion(0.8, 0, 0), i * 4);
      rArmRot.set(eulerToQuaternion(-0.6 - Math.cos(phase) * 0.7, -0.7, -0.6 * Math.sin(phase)), i * 4);
      rForeArmRot.set(eulerToQuaternion(0.8, 0, 0), i * 4);

      lUpLegRot.set(eulerToQuaternion(Math.sin(phase) * 0.7, 0.45, -0.25), i * 4);
      lLegRot.set(eulerToQuaternion(Math.max(0, Math.sin(phase)) * 1.0, 0, 0), i * 4);
      rUpLegRot.set(eulerToQuaternion(-Math.sin(phase) * 0.7, -0.45, 0.25), i * 4);
      rLegRot.set(eulerToQuaternion(Math.max(0, -Math.sin(phase)) * 1.0, 0, 0), i * 4);

    } else if (styleType === 'kpop_isolation') {
      // K-Pop Sharp Isolation
      const sharpStep = Math.sign(Math.sin(phase * 2));
      hipsPos[i * 3 + 0] = sharpStep * 5.0;
      hipsPos[i * 3 + 1] = BASE_HIPS_Y - Math.abs(sharpStep) * 4.0;
      hipsPos[i * 3 + 2] = 0;

      hipsRot.set(eulerToQuaternion(0, sharpStep * 0.3, 0), i * 4);
      spineRot.set(eulerToQuaternion(sharpStep * 0.25, 0, 0), i * 4);
      spine2Rot.set(eulerToQuaternion(sharpStep * 0.4, 0, 0), i * 4);
      neckRot.set(eulerToQuaternion(-sharpStep * 0.2, 0, 0), i * 4);

      lArmRot.set(eulerToQuaternion(1.8 * sharpStep, 1.0, 0.6), i * 4);
      lForeArmRot.set(eulerToQuaternion(1.5, 0, 0), i * 4);
      rArmRot.set(eulerToQuaternion(1.8 * -sharpStep, -1.0, -0.6), i * 4);
      rForeArmRot.set(eulerToQuaternion(1.5, 0, 0), i * 4);

      lUpLegRot.set(eulerToQuaternion(-0.15, 0.35, -0.2), i * 4);
      lLegRot.set(eulerToQuaternion(0.5, 0, 0), i * 4);
      rUpLegRot.set(eulerToQuaternion(-0.15, -0.35, 0.2), i * 4);
      rLegRot.set(eulerToQuaternion(0.5, 0, 0), i * 4);

    } else if (styleType === 'commercial_wave') {
      // Commercial Body Wave
      hipsPos[i * 3 + 0] = Math.sin(phase) * 6.0;
      hipsPos[i * 3 + 1] = BASE_HIPS_Y + Math.sin(phase * 2) * 4.0;
      hipsPos[i * 3 + 2] = Math.cos(phase * 2) * 5.0;

      hipsRot.set(eulerToQuaternion(Math.sin(phase * 2) * 0.3, Math.cos(phase) * 0.3, 0), i * 4);
      spineRot.set(eulerToQuaternion(-Math.sin(phase * 2 - 0.5) * 0.35, 0, 0), i * 4);
      spine2Rot.set(eulerToQuaternion(-Math.sin(phase * 2 - 1.0) * 0.45, 0, 0), i * 4);
      neckRot.set(eulerToQuaternion(-Math.sin(phase * 2 - 1.5) * 0.3, 0, 0), i * 4);

      lArmRot.set(eulerToQuaternion(0.5, 0.6, 1.4 + Math.sin(phase * 2) * 0.6), i * 4);
      lForeArmRot.set(eulerToQuaternion(0.6 + Math.sin(phase * 2 - 0.5) * 0.6, 0, 0), i * 4);
      rArmRot.set(eulerToQuaternion(0.5, -0.6, -1.4 - Math.sin(phase * 2) * 0.6), i * 4);
      rForeArmRot.set(eulerToQuaternion(0.6 + Math.sin(phase * 2 - 0.5) * 0.6, 0, 0), i * 4);

      lUpLegRot.set(eulerToQuaternion(Math.sin(phase) * 0.35, 0.2, -0.15), i * 4);
      lLegRot.set(eulerToQuaternion(Math.abs(Math.sin(phase)) * 0.6, 0, 0), i * 4);
      rUpLegRot.set(eulerToQuaternion(-Math.sin(phase) * 0.35, -0.2, 0.15), i * 4);
      rLegRot.set(eulerToQuaternion(Math.abs(Math.cos(phase)) * 0.6, 0, 0), i * 4);

    } else if (styleType === 'heels_strut') {
      // High Heels Sassy Strut
      hipsPos[i * 3 + 0] = Math.sin(phase) * 8.0;
      hipsPos[i * 3 + 1] = BASE_HIPS_Y - Math.abs(Math.sin(phase * 2)) * 4.0;
      hipsPos[i * 3 + 2] = Math.cos(phase) * 3.0;

      hipsRot.set(eulerToQuaternion(0.12, Math.sin(phase) * 0.45, -Math.sin(phase) * 0.35), i * 4);
      spineRot.set(eulerToQuaternion(-0.2, -Math.sin(phase) * 0.3, 0), i * 4);
      spine2Rot.set(eulerToQuaternion(-0.2, 0, Math.sin(phase) * 0.25), i * 4);
      neckRot.set(eulerToQuaternion(0.25, -Math.sin(phase) * 0.35, 0), i * 4);

      lArmRot.set(eulerToQuaternion(2.0 + Math.sin(phase) * 0.5, 0.8, 0.6), i * 4);
      lForeArmRot.set(eulerToQuaternion(1.6, 0, 0), i * 4);
      rArmRot.set(eulerToQuaternion(0.5 - Math.sin(phase) * 0.5, -0.6, -1.0), i * 4);
      rForeArmRot.set(eulerToQuaternion(1.0, 0, 0), i * 4);

      lUpLegRot.set(eulerToQuaternion(0.35, 0.3, -0.15), i * 4);
      lLegRot.set(eulerToQuaternion(Math.abs(Math.sin(phase)) * 0.7, 0, 0), i * 4);
      rUpLegRot.set(eulerToQuaternion(-0.35, -0.3, 0.15), i * 4);
      rLegRot.set(eulerToQuaternion(Math.abs(Math.cos(phase)) * 0.7, 0, 0), i * 4);
    }
  }

  addTrack('mixamorig:Hips', 'translation', hipsPos, 3);
  addTrack('mixamorig:Hips', 'rotation', hipsRot, 4);
  addTrack('mixamorig:Spine', 'rotation', spineRot, 4);
  addTrack('mixamorig:Spine1', 'rotation', spine1Rot, 4);
  addTrack('mixamorig:Spine2', 'rotation', spine2Rot, 4);
  addTrack('mixamorig:Neck', 'rotation', neckRot, 4);
  addTrack('mixamorig:Head', 'rotation', headRot, 4);
  addTrack('mixamorig:LeftShoulder', 'rotation', lShoulderRot, 4);
  addTrack('mixamorig:LeftArm', 'rotation', lArmRot, 4);
  addTrack('mixamorig:LeftForeArm', 'rotation', lForeArmRot, 4);
  addTrack('mixamorig:LeftHand', 'rotation', lHandRot, 4);
  addTrack('mixamorig:RightShoulder', 'rotation', rShoulderRot, 4);
  addTrack('mixamorig:RightArm', 'rotation', rArmRot, 4);
  addTrack('mixamorig:RightForeArm', 'rotation', rForeArmRot, 4);
  addTrack('mixamorig:RightHand', 'rotation', rHandRot, 4);
  addTrack('mixamorig:LeftUpLeg', 'rotation', lUpLegRot, 4);
  addTrack('mixamorig:LeftLeg', 'rotation', lLegRot, 4);
  addTrack('mixamorig:LeftFoot', 'rotation', lFootRot, 4);
  addTrack('mixamorig:LeftToeBase', 'rotation', lToeRot, 4);
  addTrack('mixamorig:RightUpLeg', 'rotation', rUpLegRot, 4);
  addTrack('mixamorig:RightLeg', 'rotation', rLegRot, 4);
  addTrack('mixamorig:RightFoot', 'rotation', rFootRot, 4);
  addTrack('mixamorig:RightToeBase', 'rotation', rToeRot, 4);

  gltfJson.animations.push({
    name: animName,
    channels: channels,
    samplers: samplers
  });

  console.log(`[Embedded Generator] Embedded animation "${animName}" (${channels.length} tracks, BASE_HIPS_Y=${BASE_HIPS_Y})`);
}

createDanceAnimation('hiphop_bounce', 'hiphop_bounce');
createDanceAnimation('bboy_footwork', 'bboy_footwork');
createDanceAnimation('kpop_isolation', 'kpop_isolation');
createDanceAnimation('commercial_wave', 'commercial_wave');
createDanceAnimation('heels_strut', 'heels_strut');

const finalBinBuffer = Buffer.concat(newBinBuffers);
gltfJson.buffers[0].byteLength = finalBinBuffer.length;

const glbBuf = buildGLB(gltfJson, finalBinBuffer);

fs.writeFileSync(templatePath, glbBuf);

console.log('✅ Successfully updated Y-Bot.glb with BASE_HIPS_Y=101.8!');
console.log('  - Total file size:', (glbBuf.length / (1024 * 1024)).toFixed(2), 'MB');
console.log('  - Embedded animations (total 12):', gltfJson.animations.map(a => a.name));
