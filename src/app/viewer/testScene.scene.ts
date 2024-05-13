import * as CANNON from "cannon-es";
import * as THREE from "three";
import { PlayerControllerComponent } from "../vipe-3d-engine/components/players/player-controller.component";
import { PlayerPhysicsComponent } from "../vipe-3d-engine/components/players/player-physics.component";
import { PlayerComponent } from "../vipe-3d-engine/components/players/player.component";
import { engine } from "../vipe-3d-engine/core/engine/engine";
import { GameObject } from "../vipe-3d-engine/core/gameobject";
import { loadGLTF, loadVRM } from "../vipe-3d-engine/loaders/modelsLoader";
import { ColliderCameraComponent } from "../vipe-3d-engine/components/camera/collider-camera.component";

export async function createTestScene() {

    const gridHelper = new THREE.GridHelper(50, 50);
    gridHelper.position.y = -0.5;
    engine.scene.add(gridHelper);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 10, 0);
    engine.scene.add(directionalLight);

    // engine floor with cannon physics with same size of grid helper
    const body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(25, 0.1, 25)),
        position: new CANNON.Vec3(0, -0.5, 0),
        material: engine.PHYSIC_MATERIAL
    });

    const floor = new GameObject(null, body);
    engine.addGameObjects(floor);

    loadGLTF("assets/viperoom.glb", true, false).then((gameObject) => {
        gameObject.position.y = -0.5;
        gameObject.rigidbody.position.y = -0.5;
        engine.addGameObjects(gameObject);
    });

    // load VRM
    const { vrm } = await loadVRM("https://vipe.mypinata.cloud/ipfs/QmZGG9Rezixdw9jjGCWFD39CHLYqmaffPkfw19ihnYsXBU/default_356.vrm");

    const player = new GameObject();
    engine.addGameObjects(player);

    const playerComponent = new PlayerComponent(player);
    await playerComponent.changeAvatar(vrm);

    player.addComponent(playerComponent);
    player.addComponent(new PlayerPhysicsComponent());
    player.addComponent(new PlayerControllerComponent());

    const freecam = new GameObject();
    engine.addGameObjects(freecam);
    //freecam.addComponent(new FirstPersonCameraComponent());
    freecam.addComponent(new ColliderCameraComponent()); 

}