import * as THREE from "three";
import { Component, IHasHelper } from "../../core/component";
import { engine } from "../../core/engine/engine";
import { Editable } from "../../decorators/editable.decorator";
import 'reflect-metadata';

export class SpotLightComponent extends Component implements IHasHelper {

    private light: THREE.SpotLight;
    private lightHelper: THREE.SpotLightHelper;

    @Editable({
        type: 'color',
        name: 'Color',
        description: 'Color of the spotlight'
    })
    private color: THREE.ColorRepresentation = "#ffffff";

    @Editable({
        type: 'number',
        name: 'Intensity',
        description: 'Light intensity',
        min: 0,
        max: 10,
        step: 0.1
    })
    private intensity: number = 1;

    @Editable({
        type: 'number',
        name: 'Distance',
        description: 'Maximum range of the light',
        min: 0,
        max: 100,
        step: 0.5
    })
    private distance: number = 10;

    @Editable({
        type: 'number',
        name: 'Angle',
        description: 'Angle of the spotlight cone',
        min: 0,
        max: Math.PI,
        step: 0.01
    })
    private angle: number = Math.PI / 10;

    @Editable({
        type: 'number',
        name: 'Penumbra',
        description: 'Softness of the spotlight edge',
        min: 0,
        max: 1,
        step: 0.01
    })
    private penumbra: number = 0.1;

    @Editable({
        type: 'number',
        name: 'Decay',
        description: 'Light falloff rate',
        min: 0,
        max: 10,
        step: 0.1
    })
    private decay: number = 2;

    constructor(
        color: THREE.ColorRepresentation = "#ffffff",
        intensity: number = 1,
        distance: number = 10,
        angle: number = Math.PI / 10,
        penumbra: number = 0.1,
        decay: number = 2) {
        super("SpotLightComponent");

        this.color = color || "#ffffff";
        this.intensity = intensity;
        this.distance = distance;
        this.angle = angle;
        this.penumbra = penumbra;
        this.decay = decay;
    }

    public override start(): void {
        this.light = new THREE.SpotLight(
            this.color,
            this.intensity,
            this.distance,
            this.angle,
            this.penumbra,
            this.decay
        );

        this.lightHelper = new THREE.SpotLightHelper(this.light);
        this.gameObject.add(this.light);
        this.gameObject.add(this.lightHelper);
    }

    public override set(key: string, value: any): void {
        this[key] = value;

        if (this.light) {
            switch (key) {
                case 'color':
                    this.light.color = new THREE.Color(value);
                    break;
                case 'intensity':
                    this.light.intensity = value;
                    break;
                case 'distance':
                    this.light.distance = value;
                    break;
                case 'angle':
                    this.light.angle = value;
                    break;
                case 'penumbra':
                    this.light.penumbra = value;
                    break;
                case 'decay':
                    this.light.decay = value;
                    break;
            }
        }

        // Actualizar el helper
        if (this.lightHelper) {
            this.lightHelper.update();
        }

        // Forzar la actualización de materiales en la escena
        this.updateSceneMaterials();
    }

    private updateSceneMaterials() {
        engine.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                const material = object.material as THREE.Material;
                if (material) {
                    material.needsUpdate = true;
                }
            }
        });
    }

    public setHelperVisibility(isVisible): void {
        this.lightHelper.visible = isVisible;
    }

    public setIntensity(intensity: number) {
        this.light.intensity = intensity;
    }

    public setColor(color: THREE.ColorRepresentation) {
        this.light.color = new THREE.Color(color);
    }

    public setTarget(target: THREE.Object3D) {
        this.light.target = target;
    }

    public setDistance(distance: number) {
        this.light.distance = distance;
    }

    public setAngle(angle: number) {
        this.light.angle = angle;
    }

    public setPenumbra(penumbra: number) {
        this.light.penumbra = penumbra;
    }

    public setDecay(decay: number) {
        this.light.decay = decay;
    }

    public override update(deltaTime: number): void {
        if (this.lightHelper) {
            this.lightHelper.update();
        }
    }

    public override lateUpdate(deltaTime: number): void {
        // No late update needed
    }

    public override onDestroy(): void {
        if (this.light) {
            this.gameObject.remove(this.light);
            this.light.dispose();
        }
        if (this.lightHelper) {
            this.gameObject.remove(this.lightHelper);
            this.lightHelper.dispose();
        }
    }

    /**
     * Resetea el componente a sus valores por defecto
     */
    public reset(): void {
        console.log('SpotLightComponent.reset');
        
        // Restaurar valores por defecto
        this.color = "#ffffff";
        this.intensity = 1;
        this.distance = 10;
        this.angle = Math.PI / 10;
        this.penumbra = 0.1;
        this.decay = 2;
        
        // Actualizar la luz con los valores por defecto
        if (this.light) {
            this.light.color = new THREE.Color(this.color);
            this.light.intensity = this.intensity;
            this.light.distance = this.distance;
            this.light.angle = this.angle;
            this.light.penumbra = this.penumbra;
            this.light.decay = this.decay;
        }
        
        // Actualizar el helper
        if (this.lightHelper) {
            this.lightHelper.update();
        }
        
        // Forzar la actualización de materiales en la escena
        this.updateSceneMaterials();
    }
}

