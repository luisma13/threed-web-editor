import * as THREE from "three";
import { Component } from "../../core/component";

export class DirectionalLightComponent extends Component {

    private light: THREE.DirectionalLight;
    private directionalLightHelper: THREE.DirectionalLightHelper;

    constructor(color?: THREE.ColorRepresentation, intensity?: number) {
        super("DirectionalLightComponent");
        this.light = new THREE.DirectionalLight(color, intensity);
        this.directionalLightHelper = new THREE.DirectionalLightHelper(this.light, 5);
        this.directionalLightHelper.visible = false;
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
        this.gameObject.add(this.light);
        this.gameObject.add(this.directionalLightHelper);
    }

    public override update(deltaTime: number): void {
        
    }

    public override lateUpdate(deltaTime: number): void {
        
    }

    public override onDestroy(): void {
        
    }

}

