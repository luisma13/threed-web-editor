import { VRM } from "@pixiv/three-vrm";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { mixamoVRMRigMap, normalizedMixamoVRMRigMap } from "./mixamoVRMRigMap-PRO";

/**
 * Load Mixamo animation, convert for three-vrm use, and return it.
 *
 * @param url A url of mixamo animation data
 * @param vrm A target VRM
 * @returns {Promise<THREE.AnimationClip>} The converted AnimationClip
 */
export async function loadMixamoAnimation(url: string, vrm: VRM): Promise<THREE.AnimationClip> {
    const loader = new FBXLoader(); // A loader which loads FBX
    const asset = await loader.loadAsync(url);

    const clip = THREE.AnimationClip.findByName(asset.animations, "mixamo.com"); // extract the AnimationClip

    const tracks = []; // KeyframeTracks compatible with VRM will be added here

    const restRotationInverse = new THREE.Quaternion();
    const parentRestWorldRotation = new THREE.Quaternion();
    const _quatA = new THREE.Quaternion();
    const _vec3 = new THREE.Vector3();

    // Adjust with reference to hips height.
    let motionHipsHeight = asset.getObjectByName("mixamorigHips")?.position.y;
    if (motionHipsHeight == null) {
        motionHipsHeight = asset.getObjectByName("hips")?.position.y;
    }
    const vrmHipsY = vrm.humanoid?.getNormalizedBoneNode("hips").getWorldPosition(_vec3).y;
    const vrmRootY = vrm.scene.getWorldPosition(_vec3).y;
    const vrmHipsHeight = Math.abs(vrmHipsY - vrmRootY);
    const hipsPositionScale = vrmHipsHeight / motionHipsHeight;

    clip.tracks.forEach((track) => {
        // Convert each tracks for VRM use, and push to `tracks`
        const trackSplitted = track.name.split(".");
        const mixamoRigName = trackSplitted[0];
        let vrmBoneName = mixamoVRMRigMap[mixamoRigName];
        if (!vrmBoneName) {
            vrmBoneName = normalizedMixamoVRMRigMap[mixamoRigName];
        }

        let vrmNodeName = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName)?.name;

        // Maybe the VRM has not this bone, so skip it.
        vrmNodeName = vrmNodeName?.replace("Normalized_", "");

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
                    _quatA.premultiply(parentRestWorldRotation).multiply(restRotationInverse);

                    _quatA.toArray(flatQuaternion);

                    flatQuaternion.forEach((v, index) => {
                        track.values[index + i] = v;
                    });
                }

                tracks.push(
                    new THREE.QuaternionKeyframeTrack(
                        `${vrmNodeName}.${propertyName}`,
                        track.times,
                        track.values.map((v, i) => (vrm.meta?.metaVersion === "0" && i % 2 === 0 ? -v : v)),
                    ),
                );
            } else if (track instanceof THREE.VectorKeyframeTrack) {
                const value = track.values.map((v, i) => (vrm.meta?.metaVersion === "0" && i % 3 !== 1 ? -v : v) * hipsPositionScale);
                tracks.push(new THREE.VectorKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, value));
            }
        }
    });

    return new THREE.AnimationClip("vrmAnimation", clip.duration, tracks);
}
