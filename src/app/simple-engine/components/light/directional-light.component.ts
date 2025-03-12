import * as THREE from "three";
import { Component, IHasHelper } from "../../core/component";
import { engine } from "../../core/engine/engine";

export class DirectionalLightComponent extends Component implements IHasHelper {

    isHelperVisible: boolean = true;
    color: THREE.ColorRepresentation = "#ffffff";
    intensity: number = 1;

    private light: THREE.DirectionalLight;
    private lightHelper: THREE.DirectionalLightHelper;

    constructor(color = "#ffffff", intensity = 1) {
        super("DirectionalLightComponent");
        this.color = color;
        this.intensity = intensity;
        Reflect.defineMetadata("isEditable", { type: "boolean", name: "Helper Visible", value: this.isHelperVisible }, this, "isHelperVisible");
        Reflect.defineMetadata("isEditable", { type: "color", name: "Color", value: this.color }, this, "color");
        Reflect.defineMetadata("isEditable", { type: "number", name: "Intensity", value: this.intensity }, this, "intensity");
    }

    public override set(key, value) {
        // Guardar el valor en la propiedad de la clase
        this[key] = value;
        
        // Actualizar la propiedad correspondiente en la luz
        if (key === 'color') {
            this.light.color = new THREE.Color(value);
        } else if (key === 'intensity') {
            this.light.intensity = value;
        } else if (key === 'isHelperVisible') {
            this.lightHelper.visible = value;
        } else {
            this.light[key] = value;
        }
        
        // Forzar la actualización de materiales en la escena
        this.updateSceneMaterials();
    }

    private updateSceneMaterials() {
        // Recorrer todos los objetos de la escena y actualizar sus materiales
        engine.scene.traverse((object) => {
            if (object instanceof THREE.Mesh && object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => {
                        if (material.needsUpdate !== undefined) {
                            material.needsUpdate = true;
                        }
                    });
                } else if (object.material.needsUpdate !== undefined) {
                    object.material.needsUpdate = true;
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

    public override start(): void {
        this.light = new THREE.DirectionalLight(this.color, this.intensity);
        this.gameObject.add(this.light);
        this.light.position.set(0, 0, 0);
        this.lightHelper = new THREE.DirectionalLightHelper(this.light, 5);
        this.lightHelper.visible = false;
        engine.scene.add(this.lightHelper);
    }

    public override update(deltaTime: number): void {
    }

    public override lateUpdate(deltaTime: number): void {

    }

    public override onDestroy(): void {
        engine.scene.remove(this.lightHelper);
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
        
        // Actualizar los metadatos
        Reflect.defineMetadata("isEditable", { type: "boolean", name: "Helper Visible", value: this.isHelperVisible }, this, "isHelperVisible");
        Reflect.defineMetadata("isEditable", { type: "color", name: "Color", value: this.color }, this, "color");
        Reflect.defineMetadata("isEditable", { type: "number", name: "Intensity", value: this.intensity }, this, "intensity");
        
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

    /**
     * Limpia los recursos asociados al componente
     */
    public cleanup(): void {
        console.log('DirectionalLightComponent.cleanup');
        
        // Eliminar el helper de la escena
        if (this.lightHelper) {
            engine.scene.remove(this.lightHelper);
            this.lightHelper.dispose();
            this.lightHelper = null;
        }
        
        // Eliminar la luz del gameObject
        if (this.light) {
            if (this.light.parent) {
                this.light.parent.remove(this.light);
            }
            
            // Limpiar sombras si existen
            if (this.light.shadow && this.light.shadow.map) {
                this.light.shadow.map.dispose();
            }
            
            this.light = null;
        }
    }

}

