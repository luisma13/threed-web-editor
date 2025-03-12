import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { Body, Quaternion, Vec3 } from "cannon-es";
import * as THREE from "three";
import { AnimationClip, ObjectLoader } from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { EditableObjectComponent } from "../components/editor/editable-object.component.js";
import { GameObject } from "../core/gameobject.js";
import { getCannonShapeFromMesh } from "../utils/bodies.physics.factory.js";

//GLTF Loader
// const ktx2Loader = new KTX2Loader().setTranscoderPath("three/examples/jsm/libs/basis/");
// const dracoLoader = new DRACOLoader();
// dracoLoader.setDecoderConfig({ type: 'js' });
// dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
// const gltfLoader = new GLTFLoader();
// gltfLoader.crossOrigin = "anonymous";
// gltfLoader.setKTX2Loader(ktx2Loader)
//     .setDRACOLoader(dracoLoader)
//     .setMeshoptDecoder(MeshoptDecoder);

const manager = new THREE.LoadingManager();

const dracoLoader = new DRACOLoader(manager)
    .setDecoderPath("three/examples/js/libs/draco/gltf/");

const ktx2Loader = new KTX2Loader(manager)
    .setTranscoderPath("three/examples/jsm/libs/basis/")
// .detectSupport(renderer);

const gltfLoader = new GLTFLoader(manager)
    .setCrossOrigin('anonymous')
    .setDRACOLoader(dracoLoader)
    .setKTX2Loader(ktx2Loader)
    .setMeshoptDecoder(MeshoptDecoder);

export async function loadObj(modelObj): Promise<GameObject> {
    const loader = new ObjectLoader();
    const obj = await loader.loadAsync(modelObj);
    return new GameObject(obj);
}

export async function loadVRM(modelUrl: string, helperRoot?: THREE.Group): Promise<{ vrm: VRM, scene: THREE.Group }> {
    const loader = new GLTFLoader();
    loader.crossOrigin = "anonymous";

    loader.register((parser) => {
        return new VRMLoaderPlugin(parser, { helperRoot });
    });

    const gltf = await loader.loadAsync(modelUrl);
    const vrm: VRM = gltf.userData.vrm;

    // Disable frustum culling
    vrm.scene.traverse((obj) => {
        obj.frustumCulled = false;
    });

    // Improve performance
    VRMUtils.removeUnnecessaryVertices(vrm.scene);
    VRMUtils.removeUnnecessaryJoints(vrm.scene);

    // rotate if the VRM is VRM0.0
    VRMUtils.rotateVRM0(vrm);
    return { vrm, scene: vrm.scene };
}

export async function loadFBX(url): Promise<GameObject> {
    const loader = new FBXLoader();
    const asset = await loader.loadAsync(url);
    return new GameObject(asset);
}

export async function loadFBXAnimation(animationUrl): Promise<AnimationClip> {
    const loader = new FBXLoader();
    const fbxObj = await loader.loadAsync(animationUrl);
    const animClip = fbxObj.animations[0];
    return animClip;
}

export async function loadGLB(url): Promise<GameObject> {
    const gltf = await gltfLoader.loadAsync(url);
    const gameObject = new GameObject(gltf.scene);
    gameObject.animations = gltf.animations;
    return gameObject;
}

export async function loadGLTF(url: string, addColliders = false, editable = false): Promise<GameObject> {
    const gltf = await gltfLoader.loadAsync(url);

    const body = new Body({ mass: 0 });

    const sceneObject = new GameObject();
    sceneObject.position.copy(gltf.scene.position);
    sceneObject.rigidbody = body;

    gltf.scene.traverse((object) => {
        const clonedObject = object.clone(false);
        object.getWorldPosition(clonedObject.position);
        object.getWorldQuaternion(clonedObject.quaternion);
        object.getWorldScale(clonedObject.scale);

        if (clonedObject instanceof THREE.Mesh && addColliders) {
            const shape = getCannonShapeFromMesh(clonedObject);
            body.addShape(
                shape,
                new Vec3(clonedObject.position.x, clonedObject.position.y, clonedObject.position.z),
                new Quaternion(clonedObject.quaternion.x, clonedObject.quaternion.y, clonedObject.quaternion.z, clonedObject.quaternion.w),
            );
        }

        sceneObject.add(clonedObject);
    });

    if (editable) {
        const editableObjectComponent = new EditableObjectComponent();
        sceneObject.addComponent(editableObjectComponent);
    }

    return sceneObject;
}
