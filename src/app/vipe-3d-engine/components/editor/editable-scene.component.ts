import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { Component } from "../../core/component";
import { engine } from "../../core/engine/engine";

export class EditableSceneComponent extends Component {
    transformControls: TransformControls;

    isSelectEnabled = true;

    public start(): void {
        this.transformControls = new TransformControls(engine.camera, engine.renderer.domElement);
        this.transformControls.addEventListener("dragging-changed", (event) => {
            engine.controls.enabled = !event['value'];
        });
        this.transformControls.addEventListener("mouseDown", (event) => {
            this.isSelectEnabled = false;
        });
        this.transformControls.addEventListener("mouseUp", (event) => {
            this.isSelectEnabled = true;
        });

        engine.scene.add(this.transformControls);

        document.addEventListener("keydown", (event) => this.onKeyDown(event), false);
        document.addEventListener("mousedown", this.onDocumentMouseDown, false);
    }

    update() { }

    public override lateUpdate(): void { }

    onDestroy() {
        engine.scene.remove(this.transformControls);
    }

    changeTransformMode(mode: "translate" | "rotate" | "scale") {
        this.transformControls.setMode(mode);
    }

    unselectObject() {
        this.isSelectEnabled = true;
        this.transformControls.detach();
        engine.outlinePass.selectedObjects = [];
    }

    onKeyDown(event) {
        if (event.key.toLowerCase() == "1") {
            this.changeTransformMode("translate");
        }
        if (event.key.toLowerCase() == "2") {
            this.changeTransformMode("rotate");
        }
        if (event.key.toLowerCase() == "3") {
            this.changeTransformMode("scale");
        }
        if (event.key.toLowerCase() == "escape") {
            this.unselectObject();
        }
    }

    onDocumentMouseDown = (event) => {
        event.preventDefault();

        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / engine.renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = -(event.clientY / engine.renderer.domElement.clientHeight) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, engine.camera);

        const intersects = raycaster.intersectObjects(engine.gameObjects, true);

        if (!this.isSelectEnabled) return;

        if (intersects.length == 0) {
            this.unselectObject();
            return;
        }

        const object = intersects[0].object.parent;
        let selectedObject = object;
        object.traverseAncestors((parent) => {
            if (parent === engine.scene) return;
            selectedObject = parent;
        });
        engine.outlinePass.selectedObjects = [selectedObject];
        this.transformControls.attach(selectedObject);
    };
}
