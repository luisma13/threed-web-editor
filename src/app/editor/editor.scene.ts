import * as THREE from "three";
import { FirstPersonCameraComponent } from "../vipe-3d-engine/components/camera/free-camera.component";
import { engine } from "../vipe-3d-engine/core/engine/engine";
import { GameObject } from "../vipe-3d-engine/core/gameobject";
import { loadFBX, loadGLB, loadObj, loadVRM } from "../vipe-3d-engine/loaders/modelsLoader";
import { EditableObjectComponent } from "../vipe-3d-engine/components/editor/editable-object.component";
import { EditableSceneComponent } from "../vipe-3d-engine/components/editor/editable-scene.component";
import { GridHelperComponent } from "../vipe-3d-engine/components/helpers/grid-helper.component";
import { DirectionalLightComponent } from "../vipe-3d-engine/components/light/directional-light.component";

export class EditorScene {

    editableSceneComponent: EditableSceneComponent;

    async createEditorScene() {
        const gridHelper = new GameObject();
        gridHelper.name = 'GridHelper';
        gridHelper.addComponent(new GridHelperComponent(50, 50, 0x535353, 0x737373));
        gridHelper.addComponent(new FirstPersonCameraComponent());
        const directionalLight = new GameObject();
        directionalLight.position.set(0, 10, 0);
        directionalLight.name = 'DirectionalLight';
        directionalLight.addComponent(new DirectionalLightComponent(0xffffff, 1));
        directionalLight.addComponent(new EditableObjectComponent());

        this.editableSceneComponent = new EditableSceneComponent();
        gridHelper.addComponent(this.editableSceneComponent);

        engine.addGameObjects(gridHelper);
        engine.addGameObjects(directionalLight);
    }

    async loadModel(extension: ".gltf" | ".glb" | ".fbx" | ".obj" | ".vrm" | string, url: string) {
        if (extension !== ".gltf" && extension !== ".glb" && extension !== ".fbx" && extension !== ".obj" && extension !== ".vrm") {
            console.error("Invalid file format");
            return;
        }
        const loaders = {
            ".gltf": loadGLB,
            ".fbx": loadFBX,
            ".obj": loadObj,
            ".vrm": async (url: string) => new GameObject((await loadVRM(url)).scene)
        }

        let gameObject = await loaders[extension](url);
        gameObject.name = 'Object_' + THREE.MathUtils.randInt(0, 1000);
        const editableObjectComponent = new EditableObjectComponent();
        gameObject.addComponent(editableObjectComponent);
        console.log(gameObject);
        engine.addGameObjects(gameObject);
    }
}