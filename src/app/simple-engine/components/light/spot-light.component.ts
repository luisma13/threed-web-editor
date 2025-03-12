import * as THREE from "three";
import { Component, IHasHelper } from "../../core/component";
import { engine } from "../../core/engine/engine";

export class SpotLightComponent extends Component implements IHasHelper {

    private light: THREE.SpotLight;
    private lightHelper: THREE.SpotLightHelper;

    private color: THREE.ColorRepresentation;
    private intensity: number;
    private distance: number;
    private angle: number;
    private penumbra: number;
    private decay: number;

    constructor(
        color: THREE.ColorRepresentation = "#ffffff",
        intensity: number = 1,
        distance: number = 10,
        angle: number = Math.PI / 10,
        penumbra: number = 0.1,
        decay: number = 2) {
        super("SpotLightComponent");

        this.color = color || 0xffffff;
        this.intensity = intensity;
        this.distance = distance;
        this.angle = angle;
        this.penumbra = penumbra;
        this.decay = decay;

        Reflect.defineMetadata("isEditable", { type: "color", name: "Color", value: this.color }, this, "color");
        Reflect.defineMetadata("isEditable", { type: "number", name: "Intensity", value: this.intensity }, this, "intensity");
        Reflect.defineMetadata("isEditable", { type: "number", name: "Distance", value: this.distance }, this, "distance");
        Reflect.defineMetadata("isEditable", { type: "number", name: "Angle", value: this.angle }, this, "angle");
        Reflect.defineMetadata("isEditable", { type: "number", name: "Penumbra", value: this.penumbra }, this, "penumbra");
        Reflect.defineMetadata("isEditable", { type: "number", name: "Decay", value: this.decay }, this, "decay");
    }

    public override start(): void {
        this.light = new THREE.SpotLight(this.color, this.intensity, this.distance, this.angle, this.penumbra, this.decay);
        this.gameObject.add(this.light);
        this.light.position.set(0, 0, 0);
        this.lightHelper = new THREE.SpotLightHelper(this.light);
        this.lightHelper.visible = false;
        engine.scene.add(this.lightHelper);
    }

    public override set(key, value) {
        // Guardar el valor en la propiedad de la clase
        this[key] = value;
        
        // Actualizar la propiedad correspondiente en la luz
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
            default:
                this.light[key] = value;
                break;
        }
        
        // Actualizar el helper si existe
        if (this.lightHelper) {
            this.lightHelper.update();
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
        this.lightHelper.update();
    }

    public override lateUpdate(deltaTime: number): void {

    }

    public override onDestroy(): void {
        // Limpiar recursos al destruir el componente
        this.cleanup();
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
        
        // Actualizar los metadatos
        Reflect.defineMetadata("isEditable", { type: "color", name: "Color", value: this.color }, this, "color");
        Reflect.defineMetadata("isEditable", { type: "number", name: "Intensity", value: this.intensity }, this, "intensity");
        Reflect.defineMetadata("isEditable", { type: "number", name: "Distance", value: this.distance }, this, "distance");
        Reflect.defineMetadata("isEditable", { type: "number", name: "Angle", value: this.angle }, this, "angle");
        Reflect.defineMetadata("isEditable", { type: "number", name: "Penumbra", value: this.penumbra }, this, "penumbra");
        Reflect.defineMetadata("isEditable", { type: "number", name: "Decay", value: this.decay }, this, "decay");
        
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

    /**
     * Limpia los recursos asociados al componente
     */
    public cleanup(): void {
        console.log('SpotLightComponent.cleanup');
        
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

