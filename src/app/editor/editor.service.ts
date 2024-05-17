import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { EditableSceneComponent } from "../vipe-3d-engine/components/editor/editable-scene.component";
import { FirstPersonCameraComponent } from "../vipe-3d-engine/components/camera/first-camera.component";
import { EditableObjectComponent } from "../vipe-3d-engine/components/editor/editable-object.component";
import { GridHelperComponent } from "../vipe-3d-engine/components/helpers/grid-helper.component";
import { DirectionalLightComponent } from "../vipe-3d-engine/components/light/directional-light.component";
import { SpotLightComponent } from "../vipe-3d-engine/components/light/spot-light.component";
import { engine } from "../vipe-3d-engine/core/engine/engine";
import { GameObject } from "../vipe-3d-engine/core/gameobject";
import { loadGLB, loadFBX, loadObj, loadVRM } from "../vipe-3d-engine/loaders/modelsLoader";
import { loadDefaultEquirectangularHDR } from "../vipe-3d-engine/loaders/hdrLoader";
import * as THREE from "three";

@Injectable({ providedIn: 'root' })
export class EditorService {

    input: HTMLInputElement;

    // Global Components to manage the editor scene
    gridHelperComponent: GridHelperComponent = new GridHelperComponent();
    editableSceneComponent: EditableSceneComponent = new EditableSceneComponent();
    firstPersonCameraComponent: FirstPersonCameraComponent = new FirstPersonCameraComponent();

    constructor() {

    }

    async createEditorScene() {
        const gridHelper = new GameObject();
        gridHelper.name = 'Environment';
        gridHelper.addComponent(this.gridHelperComponent);
        gridHelper.addComponent(this.firstPersonCameraComponent);
        gridHelper.addComponent(this.editableSceneComponent);

        const directionalLight = new GameObject();
        directionalLight.position.set(10, 10, 0);
        directionalLight.name = 'DirectionalLight';
        directionalLight.addComponent(new DirectionalLightComponent("#ffffff", 1));
        directionalLight.addComponent(new EditableObjectComponent());

        const SpotLight = new GameObject();
        SpotLight.position.set(6, 4, -3);
        SpotLight.name = 'SpotLight';
        SpotLight.addComponent(new SpotLightComponent());
        SpotLight.addComponent(new EditableObjectComponent());

        gridHelper.addGameObject(SpotLight);

        engine.addGameObjects(gridHelper);
        engine.addGameObjects(directionalLight);
        loadDefaultEquirectangularHDR();
    }

    async loadModel(extension: ".gltf" | ".glb" | ".fbx" | ".obj" | ".vrm" | string, url?: string) {

        if (extension !== ".gltf" && extension !== ".glb" && extension !== ".fbx" && extension !== ".obj" && extension !== ".vrm") {
            console.error("Invalid file format");
            return;
        }

        const addModelToEngine = async (url) => {
            const loaders = {
                ".gltf": loadGLB,
                ".fbx": loadFBX,
                ".obj": loadObj,
                ".vrm": async (url: string) => new GameObject((await loadVRM(url)).scene)
            }

            let gameObject: GameObject = await loaders[extension](url);
            gameObject.name = "New GameObject"
            const editableObjectComponent = new EditableObjectComponent();
            gameObject.addComponent(editableObjectComponent);
            engine.addGameObjects(gameObject);

            if (engine.castShadows) {
                engine.setCastShadows(gameObject)
            }

            if (extension === ".fbx" || extension === ".gltf") {
                const animations = gameObject.animations;
                if (!animations)
                    return gameObject;

                animations.forEach(clip => {
                    if (clip) {
                        const mixer = new THREE.AnimationMixer(gameObject.children[0]);
                        mixer.clipAction(clip).play();
                        engine.mixers.push(mixer);
                    }
                });
            }

            return gameObject;
        }

        let gameObject: GameObject = (url)
            ? await addModelToEngine(url)
            : await new Promise(resolve => {
                this.input.accept = extension === ".gltf" ? ".gltf,.glb" : extension;
                this.input.click();
                this.input.onchange = async () => {
                    const file = this.input.files[0];
                    if (!file) return;
                    const url = URL.createObjectURL(file);
                    resolve(await addModelToEngine(url));
                }
            });

        this.editableSceneComponent.selectedObject.next(gameObject);
    }

    exportScene() {

    }

    loadScene() {

    }


}