import * as THREE from "three";
import { Object3D } from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { engineXR } from "../core/engine/engine.xr";
import { GameObject } from "../core/gameobject";
import { loadGLTF } from "../loaders/modelsLoader";

let hitTestSource: XRHitTestSource;
let hitTestSourceRequested = false;
let planeMarker: THREE.Mesh = createPlaneMarker();

function createPlaneMarker() {
    const planeMarkerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const planeMarkerGeometry = new THREE.RingGeometry(0.14, 0.15, 16).rotateX(
        -Math.PI / 2,
    );

    const planeMarker = new THREE.Mesh(planeMarkerGeometry, planeMarkerMaterial);

    planeMarker.matrixAutoUpdate = false;

    return planeMarker;
};

export function createARVipeRoomScene() {

    planeMarker = createPlaneMarker();

    document.body.appendChild(
        ARButton.createButton(engineXR.renderer, { requiredFeatures: ["hit-test"] }),
    );

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    engineXR.addGameObjects(new GameObject(ambientLight));

    let vipeRoom: Object3D;

    loadGLTF("assets/viperoom.glb", false, false).then((gameObject) => {
        vipeRoom = gameObject;
    });

    const controller = engineXR.renderer.xr.getController(0);
    controller.addEventListener("select", onSelect);
    engineXR.addGameObjects(new GameObject(controller));

    function onSelect() {
        if (planeMarker.visible) {
            // Create box
            const boxGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            const box = new THREE.Mesh(boxGeometry, boxMaterial);
            box.position.setFromMatrixPosition(planeMarker.matrix);

            engineXR.addGameObjects(new GameObject(box));

            if (!vipeRoom) return;

            const model = vipeRoom.clone();

            model.position.setFromMatrixPosition(planeMarker.matrix);

            model.rotation.y = Math.random() * (Math.PI * 2);
            model.visible = true;

            engineXR.addGameObjects(new GameObject(model));
        }
    }

    function onHitTestResultReady(hitPoseTransformed: Float32Array) {
        if (hitPoseTransformed) {
            planeMarker.visible = true;
            planeMarker.matrix.fromArray(hitPoseTransformed);
        }
    }

    function onHitTestResultEmpty() {
        planeMarker.visible = false;
    }

    function handleXRHitTest(
        renderer: THREE.WebGLRenderer,
        frame: XRFrame,
        onHitTestResultReady: (hitPoseMatrix: Float32Array) => void,
        onHitTestResultEmpty: () => void,
    ) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        let xrHitPoseMatrix: Float32Array | null | undefined;

        if (session && hitTestSourceRequested === false) {
            session.requestReferenceSpace("viewer").then((referenceSpace) => {
                if (session) {
                    session
                        .requestHitTestSource({ space: referenceSpace })
                        .then((source) => {
                            hitTestSource = source;
                        });
                }
            });

            hitTestSourceRequested = true;
        }

        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length) {
                const hit = hitTestResults[0];

                if (hit && hit !== null && referenceSpace) {
                    const xrHitPose = hit.getPose(referenceSpace);

                    if (xrHitPose) {
                        xrHitPoseMatrix = xrHitPose.transform.matrix;
                        onHitTestResultReady(xrHitPoseMatrix);
                    }
                }
            } else {
                onHitTestResultEmpty();
            }
        }
    };

    const renderLoop = (timestamp: any, frame?: XRFrame) => {
        if (engineXR.renderer.xr.isPresenting) {
            if (frame) {
                handleXRHitTest(
                    engineXR.renderer,
                    frame,
                    onHitTestResultReady,
                    onHitTestResultEmpty,
                );
            }
            engineXR.update();
            engineXR.renderer.render(engineXR.scene, engineXR.camera);
        }
    };

    engineXR.renderer.setAnimationLoop(renderLoop);
}