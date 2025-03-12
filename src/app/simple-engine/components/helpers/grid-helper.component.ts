import * as THREE from "three";
import { Component } from "../../core/component";

export class GridHelperComponent extends Component {

    private gridHelper: THREE.GridHelper;

    size: number;
    divisions: number;
    color1: THREE.ColorRepresentation;
    color2: THREE.ColorRepresentation;

    constructor(size?: number, divisions?: number, color1?: THREE.ColorRepresentation, color2?: THREE.ColorRepresentation) {
        super("GridHelperComponent");
        this.size = size || 50;
        this.divisions = divisions || 50;
        this.color1 = color1 || "#535353";
        this.color2 = color2 || "#737373";
    }

    public override set(key, value) {
        this[key] = value;
        this.createOrUpdateGridHelper(this.size, this.divisions, this.color1, this.color2);
    }

    public override start(): void {
        this.createOrUpdateGridHelper(this.size, this.divisions, this.color1, this.color2);
    }

    public override update(deltaTime: number): void {

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
        console.log('GridHelperComponent.reset');
        
        // Restaurar valores por defecto
        this.size = 50;
        this.divisions = 50;
        this.color1 = "#535353";
        this.color2 = "#737373";
        
        // Actualizar los metadatos
        Reflect.defineMetadata("isEditable", { type: "number", name: "Size", value: this.size }, this, "size");
        Reflect.defineMetadata("isEditable", { type: "number", name: "Divisions", value: this.divisions }, this, "divisions");
        Reflect.defineMetadata("isEditable", { type: "color", name: "Color 1", value: this.color1 }, this, "color1");
        Reflect.defineMetadata("isEditable", { type: "color", name: "Color 2", value: this.color2 }, this, "color2");
        
        // Recrear el grid helper con los valores por defecto
        this.createOrUpdateGridHelper(this.size, this.divisions, this.color1, this.color2);
    }

    /**
     * Limpia los recursos asociados al componente
     */
    public cleanup(): void {
        console.log('GridHelperComponent.cleanup');
        
        // Eliminar el grid helper del gameObject
        if (this.gridHelper) {
            if (this.gridHelper.parent) {
                this.gridHelper.parent.remove(this.gridHelper);
            }
            
            // Limpiar geometría y material si existen
            if (this.gridHelper.geometry) {
                this.gridHelper.geometry.dispose();
            }
            
            if (this.gridHelper.material) {
                if (Array.isArray(this.gridHelper.material)) {
                    this.gridHelper.material.forEach(material => material.dispose());
                } else {
                    this.gridHelper.material.dispose();
                }
            }
            
            this.gridHelper = null;
        }
    }

    createOrUpdateGridHelper(size: number, divisions: number, color1: THREE.ColorRepresentation, color2: THREE.ColorRepresentation) {
        this.size = size;
        this.divisions = divisions;
        this.color1 = color1;
        this.color2 = color2;
        Reflect.defineMetadata("isEditable", { type: "number", name: "Size", value: this.size }, this, "size");
        Reflect.defineMetadata("isEditable", { type: "number", name: "Divisions", value: this.divisions }, this, "divisions");
        Reflect.defineMetadata("isEditable", { type: "color", name: "Color 1", value: this.color1 }, this, "color1");
        Reflect.defineMetadata("isEditable", { type: "color", name: "Color 2", value: this.color2 }, this, "color2");
        this.gameObject.remove(this.gridHelper);
        this.gridHelper = new THREE.GridHelper(size, divisions, color1, color2);
        if (this.gameObject) {
            this.gridHelper.position.copy(this.gameObject.position);
            this.gridHelper.rotation.copy(this.gameObject.rotation);
            this.gameObject.add(this.gridHelper);
        }
    }

}

