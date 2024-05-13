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
    selectedObject = new BehaviorSubject(null);

    constructor() {
        super("EditableSceneComponent", undefined);
        this.start();
    }

    public start(): void {
        this.transformControls = new TransformControls(engine.camera, engine.renderer.domElement);
        this.transformControls.addEventListener("dragging-changed", (event) => {
            engine.draggingObject = event['value'];
            if (event['value'] && !this.transformControls.userData['transforming']) {
                this.transformControls.userData['transforming'] = true;
                this.saveHistory(this.transformControls.object, true);
            }
        });
        this.transformControls.addEventListener("mouseDown", (event) => {
            this.isSelectEnabled = false;
        });
        this.transformControls.addEventListener("mouseUp", (event) => {
            this.isSelectEnabled = true;
            if (this.transformControls.userData['transforming']) {
                this.transformControls.userData['transforming'] = false;
                this.saveHistory(this.transformControls.object);
            }
        });

        engine.scene.add(this.transformControls);

        document.addEventListener("mousedown", this.onDocumentMouseDown.bind(this), false);
    }

    public override update(deltaTime: number): void {
        if (engine.input.keys.get('1')) {
            this.changeTransformMode("translate");

        } else if (engine.input.keys.get('2')) {
            this.changeTransformMode("rotate");

        } else if (engine.input.keys.get('3')) {
            this.changeTransformMode("scale");

        } else if (engine.input.keys.get('Escape')) {
            this.unselectObject();

        } else if (engine.input.keys.get('Delete') && this.transformControls.object) {
            // engine.removeGameObjects(this.transformControls.object as GameObject);
            // this.saveHistory(this.transformControls.object);
            // this.unselectObject();

        } else if (engine.input.controlLeft && engine.input.keys.get('z')) {
            this.undo();

        } else if (engine.input.controlLeft && engine.input.keys.get('y')) {
            this.redo();
        }
    }

    public override lateUpdate(deltaTime: number): void {

    }
    public override onDestroy(): void {

    }

    selectObject(object: GameObject) {
        if (!object)
            return;
        engine.outlinePass.selectedObjects = [object];
        this.transformControls.attach(object);
    }

    saveHistory(object, initialState = false) {
        if (!object)
            return;

        const currentState = {
            position: object.position.clone(),
            rotation: object.rotation.clone(),
            scale: object.scale.clone(),
            object: object
        };

        if (initialState) {
            this.history.push(currentState);
            this.redoStack = [];
            this.redoStackSubject.next(this.redoStack);
        } else {
            this.history.push(currentState);
            this.historySubject.next(this.history);
        }
    }

    undo() {
        if (this.history.length > 1) {
            const state = this.history.pop();
            this.redoStack.push(state);
            const lastState = this.history[this.history.length - 1];
            this.applyState(lastState);
        }
        this.historySubject.next(this.history);
        this.redoStackSubject.next(this.redoStack);
    }

    redo() {
        if (this.redoStack.length > 0) {
            const state = this.redoStack.pop();
            this.history.push(state);
            this.applyState(state);
        }
        this.historySubject.next(this.history);
        this.redoStackSubject.next(this.redoStack);
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
    }

    onDocumentMouseDown(event) {
        event.preventDefault();

        const rect = engine.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, engine.camera);
        const intersects = raycaster.intersectObjects(engine.gameObjects.filter(go => go.getComponent(EditableObjectComponent)), true);

        if (!this.isSelectEnabled) return;

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
        this.selectedObject.next(null);
    }

    changeTransformMode(mode: "translate" | "rotate" | "scale") {
        this.transformControls.setMode(mode);
    }
}
