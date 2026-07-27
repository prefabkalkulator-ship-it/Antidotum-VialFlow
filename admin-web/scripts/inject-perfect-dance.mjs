import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatePath = path.resolve(__dirname, '../public/Y-Bot.glb');
const fileBuffer = fs.readFileSync(templatePath);

const jsonChunkLength = fileBuffer.readUInt32LE(12);
const jsonStr = fileBuffer.toString('utf8', 20, 20 + jsonChunkLength);
const gltfJson = JSON.parse(jsonStr);

// Reset to original 7 animations
if (gltfJson.animations.length > 7) {
  gltfJson.animations = gltfJson.animations.slice(0, 7);
}

const binChunkHeaderOffset = 20 + jsonChunkLength;
const binChunkLength = fileBuffer.readUInt32LE(binChunkHeaderOffset);
const origBinBuffer = fileBuffer.subarray(binChunkHeaderOffset + 8, binChunkHeaderOffset + 8 + binChunkLength);

const walkAnimTemplate = gltfJson.animations[6]; // Embedded 'walk' (201 tracks)

const nodeMap = new Map();
gltfJson.nodes.forEach((n, i) => nodeMap.set(n.name, i));

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

const BASE_HIPS_Y = 101.8;

function createFullDanceAnimation(animName, styleType, durationSec = 4.0, fps = 20) {
  const totalFrames = Math.floor(durationSec * fps);
  const timeStep = durationSec / totalFrames;
  const numFrames = totalFrames + 1;

  const times = new Float32Array(numFrames);
  for (let i = 0; i < numFrames; i++) {
    times[i] = i * timeStep;
  }

  const timesBuf = Buffer.from(new Uint8Array(times.buffer, times.byteOffset, times.byteLength));
  
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

  const freq = (2 * Math.PI) / durationSec;
  const identityQ = eulerToQuaternion(0, 0, 0);

  walkAnimTemplate.channels.forEach((templateChan) => {
    const nodeObj = gltfJson.nodes[templateChan.target.node];
    if (!nodeObj) return;
    const nodeName = nodeObj.name;
    const pathType = templateChan.target.path;

    const valuesArray = new Float32Array(numFrames * (pathType === 'rotation' ? 4 : 3));

    for (let i = 0; i < numFrames; i++) {
      const t = times[i];
      const phase = t * freq * 2;

      if (pathType === 'scale') {
        valuesArray[i * 3 + 0] = 1.0;
        valuesArray[i * 3 + 1] = 1.0;
        valuesArray[i * 3 + 2] = 1.0;
      } else if (pathType === 'translation') {
        if (nodeName.endsWith('Hips')) {
          if (styleType === 'hiphop_bounce') {
            valuesArray[i * 3 + 0] = Math.sin(phase) * 8.0;
            valuesArray[i * 3 + 1] = BASE_HIPS_Y - Math.abs(Math.sin(phase * 2)) * 14.0;
            valuesArray[i * 3 + 2] = Math.cos(phase) * 5.0;
          } else if (styleType === 'bboy_footwork') {
            valuesArray[i * 3 + 0] = Math.sin(phase) * 18.0;
            valuesArray[i * 3 + 1] = BASE_HIPS_Y - Math.abs(Math.cos(phase * 2)) * 10.0;
            valuesArray[i * 3 + 2] = 0;
          } else if (styleType === 'kpop_isolation') {
            const sharpStep = Math.sign(Math.sin(phase * 2));
            valuesArray[i * 3 + 0] = sharpStep * 6.0;
            valuesArray[i * 3 + 1] = BASE_HIPS_Y - Math.abs(sharpStep) * 5.0;
            valuesArray[i * 3 + 2] = 0;
          } else if (styleType === 'commercial_wave') {
            valuesArray[i * 3 + 0] = Math.sin(phase) * 8.0;
            valuesArray[i * 3 + 1] = BASE_HIPS_Y + Math.sin(phase * 2) * 5.0;
            valuesArray[i * 3 + 2] = Math.cos(phase * 2) * 6.0;
          } else if (styleType === 'heels_strut') {
            valuesArray[i * 3 + 0] = Math.sin(phase) * 10.0;
            valuesArray[i * 3 + 1] = BASE_HIPS_Y - Math.abs(Math.sin(phase * 2)) * 5.0;
            valuesArray[i * 3 + 2] = Math.cos(phase) * 4.0;
          }
        } else {
          valuesArray[i * 3 + 0] = 0;
          valuesArray[i * 3 + 1] = 0;
          valuesArray[i * 3 + 2] = 0;
        }
      } else if (pathType === 'rotation') {
        let q = identityQ;

        if (nodeName.endsWith('Hips')) {
          if (styleType === 'hiphop_bounce') q = eulerToQuaternion(0.2, Math.sin(phase) * 0.2, Math.cos(phase) * 0.15);
          else if (styleType === 'bboy_footwork') q = eulerToQuaternion(0.15, Math.sin(phase) * 0.6, Math.cos(phase) * 0.25);
          else if (styleType === 'kpop_isolation') q = eulerToQuaternion(0, Math.sign(Math.sin(phase * 2)) * 0.3, 0);
          else if (styleType === 'commercial_wave') q = eulerToQuaternion(Math.sin(phase * 2) * 0.3, Math.cos(phase) * 0.3, 0);
          else if (styleType === 'heels_strut') q = eulerToQuaternion(0.12, Math.sin(phase) * 0.45, -Math.sin(phase) * 0.35);
        } else if (nodeName.endsWith('Spine')) {
          if (styleType === 'hiphop_bounce') q = eulerToQuaternion(0.3 + Math.abs(Math.sin(phase * 2)) * 0.25, -Math.sin(phase) * 0.15, 0);
          else if (styleType === 'bboy_footwork') q = eulerToQuaternion(0.25, -Math.sin(phase) * 0.5, 0);
          else if (styleType === 'kpop_isolation') q = eulerToQuaternion(Math.sign(Math.sin(phase * 2)) * 0.25, 0, 0);
          else if (styleType === 'commercial_wave') q = eulerToQuaternion(-Math.sin(phase * 2 - 0.5) * 0.35, 0, 0);
          else if (styleType === 'heels_strut') q = eulerToQuaternion(-0.2, -Math.sin(phase) * 0.3, 0);
        } else if (nodeName.endsWith('LeftArm')) {
          if (styleType === 'hiphop_bounce') q = eulerToQuaternion(0.6, 0.4, -1.0 + Math.sin(phase * 2) * 0.6);
          else if (styleType === 'bboy_footwork') q = eulerToQuaternion(1.6 + Math.cos(phase) * 0.7, 0.7, 0.6 * Math.sin(phase));
          else if (styleType === 'kpop_isolation') q = eulerToQuaternion(1.8 * Math.sign(Math.sin(phase * 2)), 1.0, 0.6);
          else if (styleType === 'commercial_wave') q = eulerToQuaternion(0.5, 0.6, 1.4 + Math.sin(phase * 2) * 0.6);
          else if (styleType === 'heels_strut') q = eulerToQuaternion(2.0 + Math.sin(phase) * 0.5, 0.8, 0.6);
        } else if (nodeName.endsWith('RightArm')) {
          if (styleType === 'hiphop_bounce') q = eulerToQuaternion(0.6, -0.4, 1.0 - Math.sin(phase * 2) * 0.6);
          else if (styleType === 'bboy_footwork') q = eulerToQuaternion(-0.6 - Math.cos(phase) * 0.7, -0.7, -0.6 * Math.sin(phase));
          else if (styleType === 'kpop_isolation') q = eulerToQuaternion(1.8 * -Math.sign(Math.sin(phase * 2)), -1.0, -0.6);
          else if (styleType === 'commercial_wave') q = eulerToQuaternion(0.5, -0.6, -1.4 - Math.sin(phase * 2) * 0.6);
          else if (styleType === 'heels_strut') q = eulerToQuaternion(0.5 - Math.sin(phase) * 0.5, -0.6, -1.0);
        } else if (nodeName.endsWith('LeftForeArm') || nodeName.endsWith('RightForeArm')) {
          q = eulerToQuaternion(0.8 + Math.sin(phase * 2) * 0.4, 0, 0);
        } else if (nodeName.endsWith('LeftUpLeg')) {
          if (styleType === 'hiphop_bounce') q = eulerToQuaternion(-0.4 + Math.sin(phase) * 0.25, 0.25, -0.15);
          else if (styleType === 'bboy_footwork') q = eulerToQuaternion(Math.sin(phase) * 0.7, 0.45, -0.25);
          else if (styleType === 'kpop_isolation') q = eulerToQuaternion(-0.15, 0.35, -0.2);
          else if (styleType === 'commercial_wave') q = eulerToQuaternion(Math.sin(phase) * 0.35, 0.2, -0.15);
          else if (styleType === 'heels_strut') q = eulerToQuaternion(0.35, 0.3, -0.15);
        } else if (nodeName.endsWith('RightUpLeg')) {
          if (styleType === 'hiphop_bounce') q = eulerToQuaternion(-0.4 - Math.sin(phase) * 0.25, -0.25, 0.15);
          else if (styleType === 'bboy_footwork') q = eulerToQuaternion(-Math.sin(phase) * 0.7, -0.45, 0.25);
          else if (styleType === 'kpop_isolation') q = eulerToQuaternion(-0.15, -0.35, 0.2);
          else if (styleType === 'commercial_wave') q = eulerToQuaternion(-Math.sin(phase) * 0.35, -0.2, 0.15);
          else if (styleType === 'heels_strut') q = eulerToQuaternion(-0.35, -0.3, 0.15);
        } else if (nodeName.endsWith('LeftLeg') || nodeName.endsWith('RightLeg')) {
          q = eulerToQuaternion(Math.abs(Math.sin(phase * 2)) * 0.8, 0, 0);
        }

        valuesArray[i * 4 + 0] = q[0];
        valuesArray[i * 4 + 1] = q[1];
        valuesArray[i * 4 + 2] = q[2];
        valuesArray[i * 4 + 3] = q[3];
      }
    }

    const valBuf = Buffer.from(new Uint8Array(valuesArray.buffer, valuesArray.byteOffset, valuesArray.byteLength));

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
      type: pathType === 'rotation' ? 'VEC4' : 'VEC3'
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
        node: templateChan.target.node,
        path: pathType
      }
    });
  });

  gltfJson.animations.push({
    name: animName,
    channels: channels,
    samplers: samplers
  });

  console.log(`[Full 201-Track Generator] Embedded animation "${animName}" (${channels.length} tracks)`);
}

createFullDanceAnimation('hiphop_bounce', 'hiphop_bounce', 4.0, 20);
createFullDanceAnimation('bboy_footwork', 'bboy_footwork', 4.0, 20);
createFullDanceAnimation('kpop_isolation', 'kpop_isolation', 4.0, 20);
createFullDanceAnimation('commercial_wave', 'commercial_wave', 4.0, 20);
createFullDanceAnimation('heels_strut', 'heels_strut', 4.0, 20);

const finalBinBuffer = Buffer.concat(newBinBuffers);
gltfJson.buffers[0].byteLength = finalBinBuffer.length;

const glbBuf = buildGLB(gltfJson, finalBinBuffer);

fs.writeFileSync(templatePath, glbBuf);

console.log('✅ Successfully updated Y-Bot.glb with 12 FULL 201-TRACK animations!');
console.log('  - Total file size:', (glbBuf.length / (1024 * 1024)).toFixed(2), 'MB');
console.log('  - Embedded animations (total 12):', gltfJson.animations.map(a => `${a.name} (${a.channels.length}ch)`));
