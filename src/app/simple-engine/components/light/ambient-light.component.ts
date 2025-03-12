import * as THREE from "three";
import { Component } from "../../core/component";

export class AmbientLightComponent extends Component {

    private light: THREE.AmbientLight;

    constructor(color?: THREE.ColorRepresentation, intensity?: number) {
        super("AmbientLightComponent");
        this.light = new THREE.AmbientLight(color, intensity);
    }

    public setIntensity(intensity: number) {
        this.light.intensity = intensity;
    }

    public setColor(color: THREE.ColorRepresentation) {
        this.light.color = new THREE.Color(color);
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

