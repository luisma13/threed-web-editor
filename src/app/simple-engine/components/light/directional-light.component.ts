import * as THREE from "three";
import { Component, IHasHelper } from "../../core/component";
import { engine } from "../../core/engine/engine";
import { Editable } from "../../decorators/editable.decorator";
import 'reflect-metadata';

export class DirectionalLightComponent extends Component implements IHasHelper {
    private light: THREE.DirectionalLight;
    private lightHelper: THREE.DirectionalLightHelper;

    @Editable({
        type: 'boolean',
        name: 'Helper Visible',
        description: 'Show/hide the light helper'
    })
    isHelperVisible: boolean = true;

    @Editable({
        type: 'color',
        name: 'Color',
        description: 'Color of the directional light'
    })
    color: THREE.ColorRepresentation = "#ffffff";

    @Editable({
        type: 'number',
        name: 'Intensity',
        description: 'Light intensity',
        min: 0,
        max: 10,
        step: 0.1
    })
    intensity: number = 1;

    constructor(color = "#ffffff", intensity = 1) {
        super("DirectionalLightComponent");
        this.color = color;
        this.intensity = intensity;
    }

    start(): void {
        this.light = new THREE.DirectionalLight(this.color, this.intensity);
        this.lightHelper = new THREE.DirectionalLightHelper(this.light);
        this.lightHelper.visible = this.isHelperVisible;
        
        this.gameObject.add(this.light);
        this.gameObject.add(this.lightHelper);
    }

    update(deltaTime: number): void {
        if (this.lightHelper) {
            this.lightHelper.update();
        }
    }

    lateUpdate(deltaTime: number): void {
        // No late update needed
    }

    onDestroy(): void {
        if (this.light) {
            this.gameObject.remove(this.light);
            this.light.dispose();
        }
        if (this.lightHelper) {
            this.gameObject.remove(this.lightHelper);
            this.lightHelper.dispose();
        }
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
                case 'isHelperVisible':
                    if (this.lightHelper) {
                        this.lightHelper.visible = value;
                    }
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

    /**
     * Resetea el componente a sus valores por defecto
     */
    public reset(): void {
        console.log('DirectionalLightComponent.reset');
        
        // Restaurar valores por defecto
        this.color = "#ffffff";
        this.intensity = 1;
        this.isHelperVisible = true;
        
        // Actualizar la luz con los valores por defecto
        if (this.light) {
            this.light.color = new THREE.Color(this.color);
            this.light.intensity = this.intensity;
        }
        
        // Actualizar el helper
        if (this.lightHelper) {
            this.lightHelper.visible = this.isHelperVisible;
            this.lightHelper.update();
        }
        
        // Forzar la actualización de materiales en la escena
        this.updateSceneMaterials();
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
}

