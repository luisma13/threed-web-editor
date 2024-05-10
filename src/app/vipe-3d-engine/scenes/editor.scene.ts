import * as THREE from "three";
import { FirstPersonCameraComponent } from "../components/camera/free-camera.component";
import { engine } from "../core/engine/engine";
import { GameObject } from "../core/gameobject";

export async function createEditorScene() {

    const gridHelper = new THREE.GridHelper(50, 50);
    gridHelper.position.y = -0.5;
    engine.scene.add(gridHelper);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 10, 0);
    engine.scene.add(directionalLight);

    const freecam = new GameObject();
    freecam.addComponent(new FirstPersonCameraComponent());
    engine.addGameObjects(freecam);

}