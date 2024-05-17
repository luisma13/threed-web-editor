import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { Component } from "../../core/component";
import { engine } from "../../core/engine/engine";
import { EditableObjectComponent } from "./editable-object.component";
import { BehaviorSubject } from "rxjs";
import { GameObject } from "../../core/gameobject";

export class EditableSceneComponent extends Component {

    transformControls: TransformControls;
    isSelectEnabled = true;
    history = [];
    redoStack = [];

    historySubject = new BehaviorSubject(this.history);
    redoStackSubject = new BehaviorSubject(this.redoStack);
    selectedObject = new BehaviorSubject(undefined);

    mousedownListener: any;
    mouseupListener: any;
    mousemoveListener: any;

    keysActions = {
        "1": this.changeTransformMode.bind(this, "translate"),
        "2": this.changeTransformMode.bind(this, "rotate"),
        "3": this.changeTransformMode.bind(this, "scale"),
        "Escape": this.unselectObject.bind(this),
        "Delete": () => {
            if (this.transformControls.object) {
                // engine.removeGameObjects(this.transformControls.object as GameObject);
                // this.saveHistory(this.transformControls.object);
                // this.unselectObject();
            }
        },
        "z": this.undo.bind(this),
        "y": this.redo.bind(this)
    };

    constructor() {
        super("EditableSceneComponent", undefined);
    }

    public start(): void {
        this.transformControls = new TransformControls(engine.camera, engine.renderer.domElement);
        this.mousemoveListener = (event) => { engine.draggingObject = event['value']; };
        this.mousedownListener = (event) => {
            this.isSelectEnabled = false;
            this.saveHistory(this.transformControls.object);
        }
        this.mouseupListener = (event) => {
            this.isSelectEnabled = true;
            if (engine.draggingObject) {
                this.saveHistory(this.transformControls.object);
                engine.draggingObject = false;
            }
        }

        this.transformControls.addEventListener("dragging-changed", this.mousemoveListener);
        this.transformControls.addEventListener("mouseDown", this.mousedownListener);
        this.transformControls.addEventListener("mouseUp", this.mouseupListener);

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
            this.onDocumentMouseDown();
        }

        for (let key in this.keysActions) {
            if (engine.input.keys.get(key)) {
                if (key === "z" || key === "y") {
                    if (engine.input.controlLeft)
                        this.keysActions[key]();
                    continue;
                }
                this.keysActions[key]();
            }
        }
    }

    public override lateUpdate(deltaTime: number): void {

    }
    public override onDestroy(): void {
        this.transformControls.removeEventListener("dragging-changed", this.mousemoveListener);
        this.transformControls.removeEventListener("mouseDown", this.mousedownListener);
        this.transformControls.removeEventListener("mouseUp", this.mouseupListener);
        this.transformControls.detach();
        engine.scene.remove(this.transformControls);
    }

    selectObject(object: GameObject) {
        if (!object)
            return;
        engine.outlinePass.selectedObjects = [object];
        this.transformControls.attach(object);
    }

    saveHistory(object) {
        if (!object)
            return;

        const currentState = {
            position: object.position.clone(),
            rotation: object.rotation.clone(),
            scale: object.scale.clone(),
            object: object
        };

        if (!this.history.length || !this.isStateSimilar(this.history[this.history.length - 1], currentState)) {
            this.history.push(currentState);
            this.historySubject.next(this.history);
            this.redoStack = [];
            this.redoStackSubject.next(this.redoStack);
        }
    }

    isStateSimilar(state1, state2) {
        return state1.position.equals(state2.position) &&
            state1.rotation.equals(state2.rotation) &&
            state1.scale.equals(state2.scale);
    }

    undo() {
        if (this.history.length > 1) {
            const state = this.history.pop();
            this.redoStack.push(state);
            const lastState = this.history[this.history.length - 1];
            this.applyState(lastState);
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const state = this.redoStack.pop();
            this.history.push(state);
            this.applyState(state);
        }
    }

    applyState(state) {
        if (!state.object)
            return;

        this.transformControls.attach(state.object);
        engine.outlinePass.selectedObjects = [state.object];
        this.selectedObject.next(state.object);

        state.object.position.copy(state.position);
        state.object.rotation.copy(state.rotation);
        state.object.scale.copy(state.scale);

        this.historySubject.next(this.history);
        this.redoStackSubject.next(this.redoStack);
    }

    onDocumentMouseDown() {
        const rect = engine.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((engine.input.mouse.x - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((engine.input.mouse.y - rect.top) / rect.height) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, engine.camera);
        const intersects = raycaster.intersectObjects(engine.gameObjects.filter(go => go.getComponent(EditableObjectComponent)), true);

        if (!this.isSelectEnabled) return;

        console.log(intersects, engine.input.mouse.x, engine.input.mouse.y, rect.left, rect.top, rect.width, rect.height);
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
        this.isSelectEnabled = true;
        this.transformControls.detach();
        engine.outlinePass.selectedObjects = [];
        this.selectedObject.next(undefined);
    }

    changeTransformMode(mode: "translate" | "rotate" | "scale") {
        this.transformControls.setMode(mode);
    }
}
