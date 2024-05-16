import * as THREE from "three";
import { Component, IHasHelper } from "../../core/component";

export class SpotLightComponent extends Component implements IHasHelper {

    private light: THREE.SpotLight;
    private spotLightHelper: THREE.SpotLightHelper;

    constructor(
        color?: THREE.ColorRepresentation,
        intensity?: number,
        distance?: number,
        angle?: number,
        penumbra?: number,
        decay?: number,) {
        super("SpotLightComponent");
        this.light = new THREE.SpotLight(color, intensity, distance, angle, penumbra, decay);
        this.spotLightHelper = new THREE.SpotLightHelper(this.light);
    }

    public setHelperVisibility(isVisible): void {
        this.spotLightHelper.visible = isVisible;
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

    public override start(): void {
        this.gameObject.add(this.light);
    }

    public override update(deltaTime: number): void {

    }

    public override lateUpdate(deltaTime: number): void {

    }

    public override onDestroy(): void {

    }

}

