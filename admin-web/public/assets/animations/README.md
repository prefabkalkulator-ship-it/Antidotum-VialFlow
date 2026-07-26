# Y-Bot 3D Animation Asset Guide

This directory contains individual **GLB animation files** for the **Y-Bot** Mixamo 3D character in the **Antidotum-VialFlow** web application. These animations are designed to be loaded by Three.js `GLTFLoader` and played using `THREE.AnimationMixer`.

---

## 📁 Directory Structure & Included Files

| Filename | Type | Description | Source |
| :--- | :--- | :--- | :--- |
| `dance.glb` | **Dance** | Procedural Fallback Dance Animation (Looping 4s) | Generated |
| `dance_hiphop.glb` | **Dance** | Procedural Hip Hop Rhythm Animation (Looping 4s) | Generated |
| `idle.glb` | **MoCap** | Y-Bot Standing Idle Loop | Extracted from `Y-Bot.glb` |
| `walk.glb` | **MoCap** | Y-Bot Walking Forward Loop | Extracted from `Y-Bot.glb` |
| `run.glb` | **MoCap** | Y-Bot Running Forward Loop | Extracted from `Y-Bot.glb` |
| `agree.glb` | **MoCap** | Head Nod / Agree Gesture | Extracted from `Y-Bot.glb` |
| `headShake.glb` | **MoCap** | Head Shake / Disagree Gesture | Extracted from `Y-Bot.glb` |
| `sad_pose.glb` | **MoCap** | Sad / Depressed Standing Pose | Extracted from `Y-Bot.glb` |
| `sneak_pose.glb` | **MoCap** | Sneaking Stealth Pose | Extracted from `Y-Bot.glb` |

---

## 💃 How to Add Custom Dance Animations from Mixamo

To add official Mixamo Motion Capture (MoCap) dance animations (e.g. Hip Hop, Breakdance, Samba, House Dance):

### Step 1: Download Animation from Mixamo
1. Open [Mixamo.com](https://www.mixamo.com) and log in.
2. Select the **Y-Bot** (or **X-Bot**) avatar character.
3. Search for dance animations in the search bar:
   - `Hip Hop Dancing`
   - `Breakdance Freeze`
   - `Samba Dancing`
   - `House Dance`
   - `Macarena`
   - `Thriller Part 1`
4. Click **Download** and set the download options:
   - **Format**: `FBX Binary (.fbx)`
   - **Skin**: **`Without Skin`** *(Critical: reduces file size and exports animation tracks only)*
   - **Frames per Second (FPS)**: `30`
   - **Keyframe Reduction**: `Uniform` or `None`

---

### Step 2: Convert FBX to GLB

#### Option A: Using the Automated Blender Python Script (Recommended)
Run Blender from the command line using the automated converter script in `admin-web/scripts/fbx_to_glb.py`:

```bash
# Single file conversion
blender --background --python scripts/fbx_to_glb.py -- path/to/downloaded_dance.fbx public/assets/animations/dance_hiphop.glb

# Batch convert a directory of downloaded FBX files
blender --background --python scripts/fbx_to_glb.py -- path/to/fbx_folder/ public/assets/animations/
```

#### Option B: Manual Conversion in Blender GUI
1. Open Blender (v3.x or v4.x).
2. Delete default Cube/Light/Camera (`A` then `X` -> Delete).
3. Go to **File > Import > FBX (.fbx)** and select your downloaded FBX file.
4. Go to **File > Export > glTF 2.0 (.glb/.gltf)**.
5. In the export settings:
   - **Format**: `glTF Binary (.glb)`
   - **Include**: Check `Limit to Selected Objects` (or select armature).
   - **Animation**: Ensure `Animation` is checked.
6. Export the file to `admin-web/public/assets/animations/<animation_name>.glb`.

---

## 🛠️ Regenerating Extracted or Procedural Animations

If you modify `public/Y-Bot.glb` or need to regenerate the animation files, run the provided Node.js scripts:

```bash
# Extract embedded animations from Y-Bot.glb into individual GLBs
node scripts/extract-animations.mjs

# Generate fallback procedural dance GLBs (dance.glb, dance_hiphop.glb)
node scripts/generate-procedural-dance.mjs
```

---

## 💻 Three.js Integration Example

Here is how to load `Y-Bot.glb` and apply an animation GLB in Three.js:

```typescript
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

// 1. Load Y-Bot Model Mesh & Skeleton
loader.load('/Y-Bot.glb', (ybotGltf) => {
  const ybotModel = ybotGltf.scene;
  scene.add(ybotModel);

  // 2. Create AnimationMixer for Y-Bot
  const mixer = new THREE.AnimationMixer(ybotModel);

  // 3. Load Separate Animation GLB file (e.g. dance.glb, walk.glb, run.glb)
  loader.load('/assets/animations/dance.glb', (animGltf) => {
    if (animGltf.animations.length > 0) {
      const clip = animGltf.animations[0];
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.play();
    }
  });

  // 4. Update Mixer in Animation Loop
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    mixer.update(delta);
    renderer.render(scene, camera);
  }
  animate();
});
```

---

## 🎯 Target Filename Conventions

For automatic loading in the VialFlow UI, use these standard lowercase filenames:

- `dance.glb` / `dance_hiphop.glb` / `dance_samba.glb` / `dance_breakdance.glb`
- `idle.glb`
- `walk.glb`
- `run.glb`
- `agree.glb`
- `headShake.glb`
