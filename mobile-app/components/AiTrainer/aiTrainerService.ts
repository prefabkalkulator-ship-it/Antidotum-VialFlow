import * as THREE from 'three';

/**
 * Zhou's Gram-Schmidt Orthonormalization (6-DOF to 3D Rotation Matrix)
 * Converts two 3D vectors representing 6-DOF joint rotations into a Three.js Quaternion.
 * 
 * @param a1 First 3D vector (x direction)
 * @param a2 Second 3D vector (y direction)
 */
export function orthonormalizeZhou(a1: THREE.Vector3, a2: THREE.Vector3): THREE.Quaternion {
  const b1 = a1.clone().normalize();
  
  const dotProduct = b1.dot(a2);
  const proj = b1.clone().multiplyScalar(dotProduct);
  const b2 = a2.clone().sub(proj).normalize();
  
  const b3 = new THREE.Vector3().crossVectors(b1, b2).normalize();
  
  // Create rotation matrix columns
  const matrix = new THREE.Matrix4();
  matrix.set(
    b1.x, b2.x, b3.x, 0,
    b1.y, b2.y, b3.y, 0,
    b1.z, b2.z, b3.z, 0,
    0,    0,    0,    1
  );
  
  const quaternion = new THREE.Quaternion();
  quaternion.setFromRotationMatrix(matrix);
  return quaternion;
}

/**
 * Converts a raw binary ArrayBuffer (containing float32 6-DOF data)
 * into a structured frame-by-frame animation representation.
 * 
 * Data structure: numFrames x numJoints x 6 floats
 */
export function parse6DofBuffer(buffer: ArrayBuffer, numJoints: number = 24): THREE.Quaternion[][] {
  const floatView = new Float32Array(buffer);
  const floatsPerFrame = numJoints * 6;
  const numFrames = Math.floor(floatView.length / floatsPerFrame);
  
  const animationFrames: THREE.Quaternion[][] = [];
  
  let offset = 0;
  for (let f = 0; f < numFrames; f++) {
    const frameRotations: THREE.Quaternion[] = [];
    for (let j = 0; j < numJoints; j++) {
      const a1_x = floatView[offset++];
      const a1_y = floatView[offset++];
      const a1_z = floatView[offset++];
      const a2_x = floatView[offset++];
      const a2_y = floatView[offset++];
      const a2_z = floatView[offset++];
      
      const a1 = new THREE.Vector3(a1_x, a1_y, a1_z);
      const a2 = new THREE.Vector3(a2_x, a2_y, a2_z);
      
      // If vectors are zero (uninitialized), use identity rotation
      if (a1.lengthSq() < 0.0001 || a2.lengthSq() < 0.0001) {
        frameRotations.push(new THREE.Quaternion());
      } else {
        frameRotations.push(orthonormalizeZhou(a1, a2));
      }
    }
    animationFrames.push(frameRotations);
  }
  
  return animationFrames;
}

/**
 * Map of joint index to SMPL joint names (standard Mixamo bone names mapping)
 */
export const SMPL_JOINT_MAP: { [key: number]: string } = {
  0: 'mixamorig:Hips',
  1: 'mixamorig:LeftUpLeg',
  2: 'mixamorig:RightUpLeg',
  3: 'mixamorig:Spine',
  4: 'mixamorig:LeftLeg',
  5: 'mixamorig:RightLeg',
  6: 'mixamorig:Spine1',
  7: 'mixamorig:LeftFoot',
  8: 'mixamorig:RightFoot',
  9: 'mixamorig:Spine2',
  10: 'mixamorig:LeftToeBase',
  11: 'mixamorig:RightToeBase',
  12: 'mixamorig:Neck',
  13: 'mixamorig:LeftShoulder',
  14: 'mixamorig:RightShoulder',
  15: 'mixamorig:Head',
  16: 'mixamorig:LeftArm',
  17: 'mixamorig:RightArm',
  18: 'mixamorig:LeftForeArm',
  19: 'mixamorig:RightForeArm',
  20: 'mixamorig:LeftHand',
  21: 'mixamorig:RightHand',
  22: 'mixamorig:LeftHandIndex1',
  23: 'mixamorig:RightHandIndex1'
};
