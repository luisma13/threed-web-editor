import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { Component } from "../../core/component";
import { engine } from "../../core/engine/engine";
import { EditableObjectComponent } from "./editable-object.component";
import { BehaviorSubject } from "rxjs";
import { GameObject } from "../../core/gameobject";
import { FirstPersonCameraComponent } from "../camera/first-camera.component";

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
            
            // Verificar si el clic ocurrió dentro del contenedor de renderizado
            if (!this.isClickOnRendererContainer()) {
                console.log("Clic fuera del contenedor de renderizado, ignorando");
                return;
            }
            
            // Buscar el FirstPersonCameraComponent en todos los GameObjects
            let firstPersonCamera = null;
            
            // Primero intentar obtenerlo del gameObject actual
            if (this.gameObject) {
                firstPersonCamera = this.gameObject.getComponent(FirstPersonCameraComponent);
            }
            
            // Si no se encuentra, buscarlo en todos los GameObjects
            if (!firstPersonCamera) {
                for (const go of engine.gameObjects) {
                    if (go) {
                        const camera = go.getComponent(FirstPersonCameraComponent);
                        if (camera) {
                            firstPersonCamera = camera;
                            break;
                        }
                    }
                }
            }
            
            console.log("FirstPersonCamera found:", !!firstPersonCamera);
            
            // Solo evitamos la selección si la cámara estaba rotando
            if (firstPersonCamera && firstPersonCamera.wasRotating()) {
                console.log("Cámara estaba rotando, no seleccionamos objeto");
                firstPersonCamera.resetRotationFlag();
            } else {
                // Si no se estaba rotando la cámara, proceder con la selección de objetos
                console.log("Procesando clic para selección de objeto");
                this.onClick();
            }
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

    /**
     * Verifica si el clic ocurrió dentro del contenedor de renderizado y no en un elemento de UI superpuesto
     * @returns true si el clic está dentro del contenedor y no en un elemento de UI, false en caso contrario
     */
    private isClickOnRendererContainer(): boolean {
        // Si no hay contenedor de renderizado, asumimos que el clic es válido
        if (!engine.rendererContainer) return true;
        
        // Obtener las coordenadas del clic
        const x = engine.input.mouse.x;
        const y = engine.input.mouse.y;
        
        // Obtener las dimensiones y posición del contenedor
        const rect = engine.rendererContainer.getBoundingClientRect();
        
        // Verificar si el clic está dentro del contenedor
        const isInsideContainer = (
            x >= rect.left &&
            x <= rect.right &&
            y >= rect.top &&
            y <= rect.bottom
        );
        
        // Si el clic no está dentro del contenedor, retornar false
        if (!isInsideContainer) return false;
        
        // Verificar si el clic ocurrió en un elemento de UI superpuesto
        const elementAtPoint = document.elementFromPoint(x, y);
        if (!elementAtPoint) return true;
        
        // Verificar si el elemento o alguno de sus padres es el contenedor de renderizado
        let currentElement = elementAtPoint;
        while (currentElement) {
            // Si encontramos el contenedor de renderizado, el clic es válido
            if (currentElement === engine.rendererContainer || 
                currentElement === engine.renderer.domElement) {
                return true;
            }
            
            currentElement = currentElement.parentElement;
        }
        
        // Si llegamos aquí, el clic ocurrió en un elemento superpuesto
        console.log("Clic en elemento superpuesto:", elementAtPoint.tagName, elementAtPoint.className);
        return false;
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
        console.log("onClick called");
        
        if (engine.draggingObject) {
            console.log("Dragging object, ignoring click");
            return;
        }

        const rect = engine.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((engine.input.mouse.x - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((engine.input.mouse.y - rect.top) / rect.height) * 2 + 1;

        // return if the click is outside the canvas
        if (mouse.x < -1 || mouse.x > 1 || mouse.y < -1 || mouse.y > 1) {
            console.log("Click outside canvas, ignorando");
            return;
        }

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, engine.camera);
        
        // Filtrar objetos seleccionables
        const selectableObjects = engine.gameObjects.filter(go => go && go.getComponent(EditableObjectComponent));
        console.log("Selectable objects:", selectableObjects.length);
        
        const intersects = raycaster.intersectObjects(selectableObjects, true);
        console.log("Intersections:", intersects.length);

        if (intersects.length == 0) {
            console.log("No intersections found");
            //this.unselectObject();
            return;
        }

        const object = intersects[0].object;
        let selectedObject = object;
        object.traverseAncestors((parent) => {
            if (parent === engine.scene) return;
            selectedObject = parent;
        });

        console.log("Selected object:", selectedObject.name || "unnamed");
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
