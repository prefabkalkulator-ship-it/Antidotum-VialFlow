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

// Strip any previously injected animations (keep only original 7)
if (gltfJson.animations.length > 7) {
  gltfJson.animations = gltfJson.animations.slice(0, 7);
}

const binChunkHeaderOffset = 20 + jsonChunkLength;
const binChunkLength = fileBuffer.readUInt32LE(binChunkHeaderOffset);
const origBinBuffer = fileBuffer.subarray(binChunkHeaderOffset + 8, binChunkHeaderOffset + 8 + binChunkLength);

const walkAnim = gltfJson.animations[6]; // 'walk' — 201 channels

// ─── Extract rest-pose translation for every bone from walk's first frame ───
const restTranslations = {}; // nodeIndex -> [x, y, z]
for (const chan of walkAnim.channels) {
  if (chan.target.path !== 'translation') continue;
  const sampler = walkAnim.samplers[chan.sampler];
  const acc = gltfJson.accessors[sampler.output];
  const bv = gltfJson.bufferViews[acc.bufferView];
  const offset = origBinBuffer.byteOffset + bv.byteOffset + (acc.byteOffset || 0);
  const vals = new Float32Array(origBinBuffer.buffer, offset, 3);
  restTranslations[chan.target.node] = [vals[0], vals[1], vals[2]];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function eulerToQuat(x, y, z) {
  const c1 = Math.cos(x/2), c2 = Math.cos(y/2), c3 = Math.cos(z/2);
  const s1 = Math.sin(x/2), s2 = Math.sin(y/2), s3 = Math.sin(z/2);
  return [
    s1*c2*c3 - c1*s2*s3,
    c1*s2*c3 + s1*c2*s3,
    c1*c2*s3 - s1*s2*c3,
    c1*c2*c3 + s1*s2*s3
  ];
}

function buildGLB(jsonObj, binBuf) {
  let js = JSON.stringify(jsonObj);
  while (Buffer.byteLength(js, 'utf8') % 4 !== 0) js += ' ';
  const jBuf = Buffer.from(js, 'utf8');
  let bPad = binBuf;
  if (binBuf.length % 4 !== 0) {
    bPad = Buffer.concat([binBuf, Buffer.alloc(4 - (binBuf.length % 4))]);
  }
  const total = 12 + 8 + jBuf.length + 8 + bPad.length;
  const out = Buffer.alloc(total);
  out.write('glTF', 0, 4, 'ascii');
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(total, 8);
  let o = 12;
  out.writeUInt32LE(jBuf.length, o); out.writeUInt32LE(0x4E4F534A, o+4); o += 8;
  jBuf.copy(out, o); o += jBuf.length;
  out.writeUInt32LE(bPad.length, o); out.writeUInt32LE(0x0042494E, o+4); o += 8;
  bPad.copy(out, o);
  return out;
}

// ─── State for appending binary data ─────────────────────────────────────────
const newBinParts = [origBinBuffer];
let binOffset = origBinBuffer.length;

function appendBuf(float32arr) {
  const buf = Buffer.from(new Uint8Array(float32arr.buffer, float32arr.byteOffset, float32arr.byteLength));
  const pad = (4 - (binOffset % 4)) % 4;
  if (pad > 0) { newBinParts.push(Buffer.alloc(pad)); binOffset += pad; }
  const bvIdx = gltfJson.bufferViews.length;
  gltfJson.bufferViews.push({ buffer: 0, byteOffset: binOffset, byteLength: buf.length });
  newBinParts.push(buf);
  binOffset += buf.length;
  return bvIdx;
}

// ─── Dance style definitions ─────────────────────────────────────────────────
// Each style defines how specific bones move ON TOP of their rest pose.
// Bones not listed here keep their rest pose exactly.
function getRotation(nodeName, styleType, phase) {
  const n = nodeName;

  // ── Hips ──
  if (n.endsWith('Hips')) {
    if (styleType === 'hiphop_bounce') return eulerToQuat(0.2, Math.sin(phase)*0.2, Math.cos(phase)*0.15);
    if (styleType === 'bboy_footwork') return eulerToQuat(0.15, Math.sin(phase)*0.6, Math.cos(phase)*0.25);
    if (styleType === 'kpop_isolation') return eulerToQuat(0, Math.sign(Math.sin(phase*2))*0.3, 0);
    if (styleType === 'commercial_wave') return eulerToQuat(Math.sin(phase*2)*0.3, Math.cos(phase)*0.3, 0);
    if (styleType === 'heels_strut') return eulerToQuat(0.12, Math.sin(phase)*0.45, -Math.sin(phase)*0.35);
  }
  // ── Spine / Spine1 / Spine2 ──
  if (n.endsWith('Spine') || n.endsWith('Spine1') || n.endsWith('Spine2')) {
    if (styleType === 'hiphop_bounce') return eulerToQuat(0.3+Math.abs(Math.sin(phase*2))*0.25, -Math.sin(phase)*0.15, Math.sin(phase*2)*0.1);
    if (styleType === 'bboy_footwork') return eulerToQuat(0.25, -Math.sin(phase)*0.5, Math.cos(phase)*0.15);
    if (styleType === 'kpop_isolation') return eulerToQuat(Math.sign(Math.sin(phase*2))*0.25, 0, Math.sign(Math.cos(phase*2))*0.15);
    if (styleType === 'commercial_wave') return eulerToQuat(-Math.sin(phase*2-0.5)*0.35, 0, Math.sin(phase)*0.2);
    if (styleType === 'heels_strut') return eulerToQuat(-0.2, -Math.sin(phase)*0.3, Math.sin(phase*2)*0.15);
  }
  // ── Neck ──
  if (n.endsWith('Neck')) {
    if (styleType === 'hiphop_bounce') return eulerToQuat(Math.sin(phase*2)*0.15, Math.cos(phase)*0.1, 0);
    if (styleType === 'bboy_footwork') return eulerToQuat(0, Math.sin(phase)*0.3, 0);
    if (styleType === 'kpop_isolation') return eulerToQuat(0, Math.sign(Math.sin(phase*2))*0.2, Math.sign(Math.cos(phase*2))*0.1);
    if (styleType === 'commercial_wave') return eulerToQuat(Math.sin(phase*2)*0.2, 0, 0);
    if (styleType === 'heels_strut') return eulerToQuat(-0.1, Math.sin(phase)*0.2, 0);
  }
  // ── Head ──
  if (n.endsWith('Head')) {
    if (styleType === 'kpop_isolation') return eulerToQuat(0, Math.sign(Math.sin(phase*2))*0.15, Math.sign(Math.cos(phase*2))*0.1);
    return eulerToQuat(Math.sin(phase*2)*0.08, Math.cos(phase)*0.05, 0);
  }
  // ── Left Shoulder ──
  if (n.endsWith('LeftShoulder')) {
    if (styleType === 'hiphop_bounce') return eulerToQuat(0, 0, Math.sin(phase*2)*0.15);
    return eulerToQuat(0, 0, Math.sin(phase*2)*0.1);
  }
  // ── Right Shoulder ──
  if (n.endsWith('RightShoulder')) {
    if (styleType === 'hiphop_bounce') return eulerToQuat(0, 0, -Math.sin(phase*2)*0.15);
    return eulerToQuat(0, 0, -Math.sin(phase*2)*0.1);
  }
  // ── Left Arm ──
  if (n.endsWith('LeftArm')) {
    if (styleType === 'hiphop_bounce') return eulerToQuat(0.6, 0.4, -1.0+Math.sin(phase*2)*0.6);
    if (styleType === 'bboy_footwork') return eulerToQuat(1.6+Math.cos(phase)*0.7, 0.7, 0.6*Math.sin(phase));
    if (styleType === 'kpop_isolation') return eulerToQuat(1.8*Math.sign(Math.sin(phase*2)), 1.0, 0.6);
    if (styleType === 'commercial_wave') return eulerToQuat(0.5, 0.6, 1.4+Math.sin(phase*2)*0.6);
    if (styleType === 'heels_strut') return eulerToQuat(2.0+Math.sin(phase)*0.5, 0.8, 0.6);
  }
  // ── Right Arm ──
  if (n.endsWith('RightArm')) {
    if (styleType === 'hiphop_bounce') return eulerToQuat(0.6, -0.4, 1.0-Math.sin(phase*2)*0.6);
    if (styleType === 'bboy_footwork') return eulerToQuat(-0.6-Math.cos(phase)*0.7, -0.7, -0.6*Math.sin(phase));
    if (styleType === 'kpop_isolation') return eulerToQuat(1.8*-Math.sign(Math.sin(phase*2)), -1.0, -0.6);
    if (styleType === 'commercial_wave') return eulerToQuat(0.5, -0.6, -1.4-Math.sin(phase*2)*0.6);
    if (styleType === 'heels_strut') return eulerToQuat(0.5-Math.sin(phase)*0.5, -0.6, -1.0);
  }
  // ── Forearms ──
  if (n.endsWith('LeftForeArm')) return eulerToQuat(0.8+Math.sin(phase*2)*0.4, 0, 0);
  if (n.endsWith('RightForeArm')) return eulerToQuat(0.8+Math.sin(phase*2)*0.4, 0, 0);
  // ── Left Upper Leg ──
  if (n.endsWith('LeftUpLeg')) {
    if (styleType === 'hiphop_bounce') return eulerToQuat(-0.4+Math.sin(phase)*0.25, 0.25, -0.15);
    if (styleType === 'bboy_footwork') return eulerToQuat(Math.sin(phase)*0.7, 0.45, -0.25);
    if (styleType === 'kpop_isolation') return eulerToQuat(-0.15+Math.sin(phase*2)*0.2, 0.35, -0.2);
    if (styleType === 'commercial_wave') return eulerToQuat(Math.sin(phase)*0.35, 0.2, -0.15);
    if (styleType === 'heels_strut') return eulerToQuat(0.35+Math.sin(phase)*0.2, 0.3, -0.15);
  }
  // ── Right Upper Leg ──
  if (n.endsWith('RightUpLeg')) {
    if (styleType === 'hiphop_bounce') return eulerToQuat(-0.4-Math.sin(phase)*0.25, -0.25, 0.15);
    if (styleType === 'bboy_footwork') return eulerToQuat(-Math.sin(phase)*0.7, -0.45, 0.25);
    if (styleType === 'kpop_isolation') return eulerToQuat(-0.15-Math.sin(phase*2)*0.2, -0.35, 0.2);
    if (styleType === 'commercial_wave') return eulerToQuat(-Math.sin(phase)*0.35, -0.2, 0.15);
    if (styleType === 'heels_strut') return eulerToQuat(-0.35-Math.sin(phase)*0.2, -0.3, 0.15);
  }
  // ── Lower Legs (knees) ──
  if (n.endsWith('LeftLeg') || n.endsWith('RightLeg')) {
    return eulerToQuat(Math.abs(Math.sin(phase*2))*0.8, 0, 0);
  }
  // ── Feet ──
  if (n.endsWith('LeftFoot') || n.endsWith('RightFoot')) {
    return eulerToQuat(-Math.abs(Math.sin(phase*2))*0.3, 0, 0);
  }

  // All other bones: identity rotation (no rotation applied)
  return null;
}

function getHipsTranslation(styleType, phase) {
  const BASE_Y = 101.8;
  if (styleType === 'hiphop_bounce') return [Math.sin(phase)*8, BASE_Y - Math.abs(Math.sin(phase*2))*14, Math.cos(phase)*5];
  if (styleType === 'bboy_footwork') return [Math.sin(phase)*18, BASE_Y - Math.abs(Math.cos(phase*2))*10, 0];
  if (styleType === 'kpop_isolation') { const s=Math.sign(Math.sin(phase*2)); return [s*6, BASE_Y - Math.abs(s)*5, 0]; }
  if (styleType === 'commercial_wave') return [Math.sin(phase)*8, BASE_Y + Math.sin(phase*2)*5, Math.cos(phase*2)*6];
  if (styleType === 'heels_strut') return [Math.sin(phase)*10, BASE_Y - Math.abs(Math.sin(phase*2))*5, Math.cos(phase)*4];
  return [0, BASE_Y, 0];
}

// ─── Create dance animation ─────────────────────────────────────────────────
function createDanceAnimation(animName, styleType, durationSec = 4.0, fps = 24) {
  const numFrames = Math.floor(durationSec * fps) + 1;
  const dt = durationSec / (numFrames - 1);
  const freq = (2 * Math.PI) / durationSec;

  // Shared time accessor
  const times = new Float32Array(numFrames);
  for (let i = 0; i < numFrames; i++) times[i] = i * dt;
  const timesBvIdx = appendBuf(times);
  const timesAccIdx = gltfJson.accessors.length;
  gltfJson.accessors.push({
    bufferView: timesBvIdx, byteOffset: 0,
    componentType: 5126, count: numFrames, type: 'SCALAR',
    min: [0], max: [durationSec]
  });

  const channels = [];
  const samplers = [];

  for (const templateChan of walkAnim.channels) {
    const nodeIdx = templateChan.target.node;
    const nodeObj = gltfJson.nodes[nodeIdx];
    if (!nodeObj) continue;
    const nodeName = nodeObj.name;
    const pathType = templateChan.target.path;

    let valuesArray;

    if (pathType === 'scale') {
      // All bones: scale = [1, 1, 1] (constant)
      valuesArray = new Float32Array(numFrames * 3);
      for (let i = 0; i < numFrames; i++) {
        valuesArray[i*3+0] = 1; valuesArray[i*3+1] = 1; valuesArray[i*3+2] = 1;
      }
    } else if (pathType === 'translation') {
      valuesArray = new Float32Array(numFrames * 3);
      if (nodeName.endsWith('Hips')) {
        // Hips get custom dance movement
        for (let i = 0; i < numFrames; i++) {
          const phase = times[i] * freq * 2;
          const [x, y, z] = getHipsTranslation(styleType, phase);
          valuesArray[i*3+0] = x; valuesArray[i*3+1] = y; valuesArray[i*3+2] = z;
        }
      } else {
        // ALL OTHER BONES: use rest-pose translation (bone structure!)
        const rest = restTranslations[nodeIdx] || [0, 0, 0];
        for (let i = 0; i < numFrames; i++) {
          valuesArray[i*3+0] = rest[0]; valuesArray[i*3+1] = rest[1]; valuesArray[i*3+2] = rest[2];
        }
      }
    } else if (pathType === 'rotation') {
      valuesArray = new Float32Array(numFrames * 4);
      for (let i = 0; i < numFrames; i++) {
        const phase = times[i] * freq * 2;
        const q = getRotation(nodeName, styleType, phase) || eulerToQuat(0, 0, 0);
        valuesArray[i*4+0] = q[0]; valuesArray[i*4+1] = q[1];
        valuesArray[i*4+2] = q[2]; valuesArray[i*4+3] = q[3];
      }
    }

    const valBvIdx = appendBuf(valuesArray);
    const valAccIdx = gltfJson.accessors.length;
    gltfJson.accessors.push({
      bufferView: valBvIdx, byteOffset: 0,
      componentType: 5126, count: numFrames,
      type: pathType === 'rotation' ? 'VEC4' : 'VEC3'
    });

    const samplerIdx = samplers.length;
    samplers.push({ input: timesAccIdx, interpolation: 'LINEAR', output: valAccIdx });
    channels.push({ sampler: samplerIdx, target: { node: nodeIdx, path: pathType } });
  }

  gltfJson.animations.push({ name: animName, channels, samplers });
  console.log(`[Dance] "${animName}" — ${channels.length} channels, ${numFrames} frames`);
}

// ─── Generate all 5 dances ───────────────────────────────────────────────────
createDanceAnimation('hiphop_bounce', 'hiphop_bounce');
createDanceAnimation('bboy_footwork', 'bboy_footwork');
createDanceAnimation('kpop_isolation', 'kpop_isolation');
createDanceAnimation('commercial_wave', 'commercial_wave');
createDanceAnimation('heels_strut', 'heels_strut');

// ─── Write GLB ───────────────────────────────────────────────────────────────
const finalBin = Buffer.concat(newBinParts);
gltfJson.buffers[0].byteLength = finalBin.length;
const glb = buildGLB(gltfJson, finalBin);
fs.writeFileSync(templatePath, glb);

console.log(`\n✅ Y-Bot.glb updated — ${(glb.length / (1024*1024)).toFixed(2)} MB`);
console.log(`   ${gltfJson.animations.length} animations: ${gltfJson.animations.map(a => a.name).join(', ')}`);
