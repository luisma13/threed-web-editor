import { VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { mixamoVRMRigMap, normalizedVRMRigMap } from './mixamoVRMRigMap-PRO';

/**
 * Load animation, convert for three-vrm use, and return it.
 *
 * @param url A url of animation data
 * @param vrm A target VRM
 * @param options Options
 * @param options.clipName A name of clip to load
 * @returns {Promise<THREE.AnimationClip>} The converted AnimationClip
 */
export async function retargetAnimForVRM(url: string, vrm: VRM, options?: { clipName?: string, clipIndex?: number }): Promise<THREE.AnimationClip> {

    const loader = new FBXLoader();
    const asset = await loader.loadAsync(url);

    console.log(url, asset);

    const clip = options?.clipName != null
        ? THREE.AnimationClip.findByName(asset.animations, options.clipName)
        : asset.animations[options?.clipIndex ?? 0];

    const tracks = [];

    const restRotationInverse = new THREE.Quaternion();
    const parentRestWorldRotation = new THREE.Quaternion();
    const _quatA = new THREE.Quaternion();
    const _vec3 = new THREE.Vector3();

    let motionHipsHeight = asset.getObjectByName("mixamorigHips")?.position.y;
    if (motionHipsHeight == null) {
        motionHipsHeight = asset.getObjectByName("Hips")?.position.y;
    }
    const vrmHipsY = vrm.humanoid?.getNormalizedBoneNode("hips").getWorldPosition(_vec3).y;
    const vrmRootY = vrm.scene.getWorldPosition(_vec3).y;
    const vrmHipsHeight = Math.abs(vrmHipsY - vrmRootY);
    const hipsPositionScale = vrmHipsHeight / motionHipsHeight;

    clip.tracks = clip.tracks.filter((track) =>
        track.name.toLowerCase().includes(".quaternion")//);
        || (track.name.toLowerCase().includes(".position") && track.name.toLowerCase().includes("hips")));

    clip.tracks.forEach((track) => {

        const trackSplitted = track.name.split(".");
        const mixamoRigName = trackSplitted[0];
        let vrmBoneName = mixamoVRMRigMap[mixamoRigName];
        if (!vrmBoneName) {
            vrmBoneName = normalizedVRMRigMap[mixamoRigName];
        }

        let vrmNodeName = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName)?.name;

        console.log(vrmBoneName, vrmNodeName);
        vrmNodeName = vrmNodeName?.replace("Normalized_", "")
        if (vrmNodeName) {
            const mixamoRigNode = asset.getObjectByName(mixamoRigName);
            const propertyName = trackSplitted[1];

            // Store rotations of rest-pose.
            mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
            mixamoRigNode.parent.getWorldQuaternion(parentRestWorldRotation);

            if (track instanceof THREE.QuaternionKeyframeTrack) {
                // Retarget rotation of mixamoRig to NormalizedBone.
                for (let i = 0; i < track.values.length; i += 4) {
                    const flatQuaternion = track.values.slice(i, i + 4);

                    _quatA.fromArray(flatQuaternion);
                    _quatA
                        .premultiply(parentRestWorldRotation)
                        .multiply(restRotationInverse);

                    _quatA.toArray(flatQuaternion);

                    flatQuaternion.forEach((v, index) => {
                        track.values[index + i] = v;
                    });
                }

                tracks.push(
                    new THREE.QuaternionKeyframeTrack(
                        `${vrmNodeName}.${propertyName}`,
                        track.times,
                        track.values.map((v, i) => (vrm.meta?.metaVersion === "0" && i % 2 === 0 ? - v : v)),
                    ),
                );

            } else if (track instanceof THREE.VectorKeyframeTrack) {
                const value = track.values.map((v, i) => (vrm.meta?.metaVersion === "0" && i % 3 !== 1 ? - v : v) * hipsPositionScale);
                tracks.push(new THREE.VectorKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, value));
            }
        }

    });

    return new THREE.AnimationClip("vrmAnimation", clip.duration, tracks);
}