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

    }

}

