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

// Read template Y-Bot GLB to copy node hierarchy & names
const fileBuffer = fs.readFileSync(templatePath);
const jsonChunkLength = fileBuffer.readUInt32LE(12);
const gltfJson = JSON.parse(fileBuffer.toString('utf8', 20, 20 + jsonChunkLength));

// Map node names to indices
const nodeMap = new Map();
gltfJson.nodes.forEach((n, i) => nodeMap.set(n.name, i));

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

function generateDanceGLB(animName, durationSec = 4.0, fps = 30) {
  const totalFrames = Math.floor(durationSec * fps);
  const timeStep = durationSec / totalFrames;

  // Time array float32
  const times = new Float32Array(totalFrames + 1);
  for (let i = 0; i <= totalFrames; i++) {
    times[i] = i * timeStep;
  }

  const channels = [];
  const samplers = [];
  const binBuffers = [];

  // Add times bufferView & accessor
  const timesBuf = Buffer.from(times.buffer);
  const timesBvIndex = 0;
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

  function addTrack(nodeName, pathType, valuesArray, componentsPerKeyframe) {
    const nodeIdx = nodeMap.get(nodeName);
    if (nodeIdx === undefined) return;

    const valBuf = Buffer.from(valuesArray.buffer);
    const bvIdx = binBuffers.length;
    binBuffers.push(valBuf);

    const accIdx = accessors.length;
    accessors.push({
      bufferView: bvIdx,
      byteOffset: 0,
      componentType: 5126, // FLOAT
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

  // Generate keyframes for Hip Hop / Wave Dance
  const numFrames = times.length;

  // 1. Hips Translation (Sway left-right, bounce up-down)
  const hipsPos = new Float32Array(numFrames * 3);
  // 2. Hips Rotation
  const hipsRot = new Float32Array(numFrames * 4);
  // 3. Spine Rotation
  const spineRot = new Float32Array(numFrames * 4);
  // 4. Right Arm / ForeArm
  const rArmRot = new Float32Array(numFrames * 4);
  const rForeArmRot = new Float32Array(numFrames * 4);
  // 5. Left Arm / ForeArm
  const lArmRot = new Float32Array(numFrames * 4);
  const lForeArmRot = new Float32Array(numFrames * 4);
  // 6. Legs
  const rLegRot = new Float32Array(numFrames * 4);
  const lLegRot = new Float32Array(numFrames * 4);

  const freq = 2 * Math.PI / durationSec; // 1 full cycle per duration

  for (let i = 0; i < numFrames; i++) {
    const t = times[i];
    const phase = t * freq * 2; // 2 beats per loop

    // Hips sway X = sin(phase)*0.15, bounce Y = Math.abs(cos(phase*2))*0.08
    hipsPos[i * 3 + 0] = Math.sin(phase) * 0.15;
    hipsPos[i * 3 + 1] = Math.abs(Math.cos(phase * 2)) * 0.08;
    hipsPos[i * 3 + 2] = Math.cos(phase) * 0.05;

    // Hips rotation (roll Z, yaw Y)
    const hQ = eulerToQuaternion(0, Math.sin(phase) * 0.1, Math.cos(phase) * 0.15);
    hipsRot.set(hQ, i * 4);

    // Spine twist (opposite to hips)
    const sQ = eulerToQuaternion(Math.sin(phase * 2) * 0.1, -Math.sin(phase) * 0.15, -Math.cos(phase) * 0.1);
    spineRot.set(sQ, i * 4);

    // Right Arm wave (pump up & down, rotate out)
    const raQ = eulerToQuaternion(
      Math.sin(phase * 2) * 0.5 - 0.5,
      Math.cos(phase) * 0.3,
      Math.sin(phase) * 0.4 - 0.5
    );
    rArmRot.set(raQ, i * 4);

    const rfaQ = eulerToQuaternion(0, 0, Math.sin(phase * 2) * 0.6 + 0.6);
    rForeArmRot.set(rfaQ, i * 4);

    // Left Arm wave (opposite phase)
    const laQ = eulerToQuaternion(
      -Math.sin(phase * 2) * 0.5 - 0.5,
      -Math.cos(phase) * 0.3,
      -Math.sin(phase) * 0.4 + 0.5
    );
    lArmRot.set(laQ, i * 4);

    const lfaQ = eulerToQuaternion(0, 0, -Math.sin(phase * 2) * 0.6 - 0.6);
    lForeArmRot.set(lfaQ, i * 4);

    // Leg knee bends
    const rlQ = eulerToQuaternion(Math.max(0, Math.sin(phase)) * 0.4, 0, 0);
    rLegRot.set(rlQ, i * 4);

    const llQ = eulerToQuaternion(Math.max(0, -Math.sin(phase)) * 0.4, 0, 0);
    lLegRot.set(llQ, i * 4);
  }

  addTrack('mixamorig:Hips', 'translation', hipsPos, 3);
  addTrack('mixamorig:Hips', 'rotation', hipsRot, 4);
  addTrack('mixamorig:Spine', 'rotation', spineRot, 4);
  addTrack('mixamorig:RightArm', 'rotation', rArmRot, 4);
  addTrack('mixamorig:RightForeArm', 'rotation', rForeArmRot, 4);
  addTrack('mixamorig:LeftArm', 'rotation', lArmRot, 4);
  addTrack('mixamorig:LeftForeArm', 'rotation', lForeArmRot, 4);
  addTrack('mixamorig:RightLeg', 'rotation', rLegRot, 4);
  addTrack('mixamorig:LeftLeg', 'rotation', lLegRot, 4);

  // Construct bufferViews
  const bufferViews = [];
  const binChunks = [];
  let currentOffset = 0;

  binBuffers.forEach(buf => {
    // Pad to 4 bytes
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
    asset: { version: '2.0', generator: 'Procedural Dance Generator' },
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
  console.log(`[Dance Generator] Created ${animName}.glb (${(glbBuf.length / 1024).toFixed(1)} KB)`);
}

generateDanceGLB('dance_hiphop', 4.0);
generateDanceGLB('dance', 4.0);

console.log('[Dance Generator] Procedural dance animations created successfully!');
