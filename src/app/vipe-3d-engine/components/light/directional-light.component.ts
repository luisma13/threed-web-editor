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
        this.light[key] = value;
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

}

