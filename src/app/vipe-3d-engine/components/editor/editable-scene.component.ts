import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { Component } from "../../core/component";
import { engine } from "../../core/engine/engine";
import { EditableObjectComponent } from "./editable-object.component";
import { BehaviorSubject } from "rxjs";
import { GameObject } from "../../core/gameobject";

export class EditableSceneComponent extends Component {

    transformControls: TransformControls;
    selectedObject = new BehaviorSubject(undefined);
    mousePressed = false;

    onChangeListener: BehaviorSubject<{ transform: { position, rotation, scale }, gameObject: GameObject }> = new BehaviorSubject(undefined);

    transformControlsMousedownListener = () => {
        engine.draggingObject = true;
        this.onChange(this.transformControls.object as GameObject);
    };
    
    transoformControlsMouseupListener = () => {
        if (engine.draggingObject) {
            this.onChange(this.transformControls.object as GameObject);
            setTimeout(() => {
                engine.draggingObject = false;
            }, 100);
        }
    };

    keyTimers = {};

    keysActions = {
        "1": this.changeTransformMode.bind(this, "translate"),
        "2": this.changeTransformMode.bind(this, "rotate"),
        "3": this.changeTransformMode.bind(this, "scale"),
        "Escape": this.unselectObject.bind(this)
    };

    constructor() {
        super("EditableSceneComponent", undefined);
    }

    public start(): void {
        this.transformControls = new TransformControls(engine.camera, engine.renderer.domElement);
        this.transformControls.addEventListener("mouseDown", this.transformControlsMousedownListener);
        this.transformControls.addEventListener("mouseUp", this.transoformControlsMouseupListener);

        this.selectedObject.subscribe(object => {
            if (!object) {
                this.transformControls.detach();
                engine.outlinePass.selectedObjects = [];
            }
        });

        engine.scene.add(this.transformControls);
    }

    public override update(deltaTime: number): void {
        if (engine.input.mouseLeftDown) {
            this.mousePressed = true;
        } else if (this.mousePressed) {
            this.mousePressed = false;
            this.onClick();
        }

        for (let key in this.keysActions) {
            if (engine.input.keys.get(key)) {
                if (!this.keyTimers[key]) {
                    this.keysActions[key]();
                    this.keyTimers[key] = setTimeout(() => {
                        delete this.keyTimers[key];
                    }, 300);
                }
            }
        }
    }

    public override lateUpdate(deltaTime: number): void { }

    public override onDestroy(): void {
        this.transformControls.removeEventListener("mouseDown", this.transformControlsMousedownListener);
        this.transformControls.removeEventListener("mouseUp", this.transoformControlsMouseupListener);
        this.transformControls.detach();
        engine.scene.remove(this.transformControls);
    }

    selectObject(object: GameObject) {
        if (!object)
            return;
        engine.outlinePass.selectedObjects = [object];
        this.transformControls.attach(object);
    }

    onChange(object: GameObject) {
        if (!object)
            return;

        const currentState = {
            transform: {
                position: object.position.clone(),
                rotation: object.rotation.clone(),
                scale: object.scale.clone(),
            },
            gameObject: object
        };

        this.onChangeListener.next(currentState);
    }

    isStateSimilar(state1, state2) {
        return state1.position.equals(state2.position) &&
            state1.rotation.equals(state2.rotation) &&
            state1.scale.equals(state2.scale);
    }

    onClick() {
        if (engine.draggingObject)
            return;

        const rect = engine.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((engine.input.mouse.x - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((engine.input.mouse.y - rect.top) / rect.height) * 2 + 1;

        // return if the click is outside the canvas
        if (mouse.x < -1 || mouse.x > 1 || mouse.y < -1 || mouse.y > 1) return;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, engine.camera);
        const intersects = raycaster.intersectObjects(engine.gameObjects.filter(go => go.getComponent(EditableObjectComponent)), true);

        if (intersects.length == 0) {
            //this.unselectObject();
            return;
        }

        const object = intersects[0].object;
        let selectedObject = object;
        object.traverseAncestors((parent) => {
            if (parent === engine.scene) return;
            selectedObject = parent;
        });

        this.selectObject(selectedObject as GameObject);
        this.selectedObject.next(selectedObject as GameObject);
    }

    unselectObject() {
        this.transformControls.detach();
        engine.outlinePass.selectedObjects = [];
        this.selectedObject.next(undefined);
    }

    changeTransformMode(mode: "translate" | "rotate" | "scale") {
        this.transformControls.setMode(mode);
    }
}
