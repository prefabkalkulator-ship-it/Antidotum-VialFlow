import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.resolve(__dirname, '../public/Y-Bot.glb');
const outputDir = path.resolve(__dirname, '../public/assets/animations');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`[Animation Extractor] Reading ${inputPath}...`);
const fileBuffer = fs.readFileSync(inputPath);

// Parse GLB Header
const magicStr = fileBuffer.toString('utf8', 0, 4);
if (magicStr !== 'glTF') {
  throw new Error(`Invalid GLB magic header: ${magicStr}`);
}
const version = fileBuffer.readUInt32LE(4);
const totalLength = fileBuffer.readUInt32LE(8);
console.log(`[Animation Extractor] GLB Version: ${version}, Total size: ${(totalLength / 1024 / 1024).toFixed(2)} MB`);

// Read JSON Chunk (Chunk 0)
const jsonChunkLength = fileBuffer.readUInt32LE(12);
const jsonChunkType = fileBuffer.readUInt32LE(16);
if (jsonChunkType !== 0x4E4F534A) {
  throw new Error('Chunk 0 is not JSON');
}
const jsonString = fileBuffer.toString('utf8', 20, 20 + jsonChunkLength);
const gltfJson = JSON.parse(jsonString);

// Read BIN Chunk (Chunk 1)
const binHeaderOffset = 20 + jsonChunkLength;
let binBuffer = Buffer.alloc(0);
if (binHeaderOffset < fileBuffer.length) {
  const binChunkLength = fileBuffer.readUInt32LE(binHeaderOffset);
  const binChunkType = fileBuffer.readUInt32LE(binHeaderOffset + 4);
  if (binChunkType === 0x0042494E) {
    binBuffer = fileBuffer.subarray(binHeaderOffset + 8, binHeaderOffset + 8 + binChunkLength);
  }
}

const animations = gltfJson.animations || [];
console.log(`[Animation Extractor] Found ${animations.length} animations:`);
animations.forEach((a, i) => console.log(`  ${i + 1}. "${a.name}"`));

// Helper to assemble GLB buffer
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
  outBuf.write('glTF', 0, 4, 'ascii'); // Magic 'glTF'
  outBuf.writeUInt32LE(2, 4);          // Version 2
  outBuf.writeUInt32LE(totalGlbLen, 8); // Total length

  let offset = 12;
  outBuf.writeUInt32LE(jsonBuf.length, offset);
  outBuf.writeUInt32LE(0x4E4F534A, offset + 4); // 'JSON'
  offset += 8;
  jsonBuf.copy(outBuf, offset);
  offset += jsonBuf.length;

  if (binPadded.length > 0) {
    outBuf.writeUInt32LE(binPadded.length, offset);
    outBuf.writeUInt32LE(0x0042494E, offset + 4); // 'BIN'
    offset += 8;
    binPadded.copy(outBuf, offset);
  }

  return outBuf;
}

// Function to extract individual animation
function extractAnimation(animIndex) {
  const anim = animations[animIndex];
  const rawName = anim.name || `anim_${animIndex}`;
  const safeName = rawName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeName}.glb`;
  const outPath = path.join(outputDir, filename);

  const clonedJson = JSON.parse(JSON.stringify(gltfJson));
  clonedJson.animations = [anim];

  delete clonedJson.meshes;
  delete clonedJson.materials;
  delete clonedJson.textures;
  delete clonedJson.images;

  if (clonedJson.nodes) {
    clonedJson.nodes.forEach(node => {
      delete node.mesh;
      delete node.skin;
    });
  }
  delete clonedJson.skins;

  const usedAccessors = new Set();
  anim.samplers.forEach(sampler => {
    usedAccessors.add(sampler.input);
    usedAccessors.add(sampler.output);
  });

  const oldAccessors = clonedJson.accessors || [];
  const oldBufferViews = clonedJson.bufferViews || [];

  const newAccessors = [];
  const newBufferViews = [];
  const accessorRemap = new Map();
  const bufferViewRemap = new Map();
  const binChunks = [];
  let currentByteOffset = 0;

  usedAccessors.forEach(oldAccIdx => {
    const acc = oldAccessors[oldAccIdx];
    if (!acc) return;

    const oldBvIdx = acc.bufferView;
    let newBvIdx;

    if (!bufferViewRemap.has(oldBvIdx)) {
      const bv = oldBufferViews[oldBvIdx];
      if (bv) {
        const bvByteOffset = bv.byteOffset || 0;
        const bvByteLength = bv.byteLength;
        const bvData = binBuffer.subarray(bvByteOffset, bvByteOffset + bvByteLength);

        const padLen = (4 - (currentByteOffset % 4)) % 4;
        if (padLen > 0) {
          binChunks.push(Buffer.alloc(padLen));
          currentByteOffset += padLen;
        }

        const newBv = {
          buffer: 0,
          byteOffset: currentByteOffset,
          byteLength: bvByteLength
        };
        if (bv.byteStride !== undefined) newBv.byteStride = bv.byteStride;
        if (bv.target !== undefined) newBv.target = bv.target;

        newBvIdx = newBufferViews.length;
        newBufferViews.push(newBv);
        bufferViewRemap.set(oldBvIdx, newBvIdx);

        binChunks.push(bvData);
        currentByteOffset += bvByteLength;
      }
    } else {
      newBvIdx = bufferViewRemap.get(oldBvIdx);
    }

    const newAcc = { ...acc, bufferView: newBvIdx };
    delete newAcc.byteOffset;
    if (acc.byteOffset) newAcc.byteOffset = acc.byteOffset;

    const newAccIdx = newAccessors.length;
    newAccessors.push(newAcc);
    accessorRemap.set(oldAccIdx, newAccIdx);
  });

  anim.samplers.forEach(sampler => {
    sampler.input = accessorRemap.get(sampler.input);
    sampler.output = accessorRemap.get(sampler.output);
  });

  const newBinBuffer = Buffer.concat(binChunks);

  clonedJson.accessors = newAccessors;
  clonedJson.bufferViews = newBufferViews;
  clonedJson.buffers = [{ byteLength: newBinBuffer.length }];

  const glbBuf = buildGLB(clonedJson, newBinBuffer);
  fs.writeFileSync(outPath, glbBuf);
  console.log(`[Animation Extractor] Saved: ${filename} (${(glbBuf.length / 1024).toFixed(1)} KB)`);
}

for (let i = 0; i < animations.length; i++) {
  extractAnimation(i);
}

console.log('[Animation Extractor] All animations extracted successfully!');
