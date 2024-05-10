import * as THREE from "three";
import { Component } from "../../core/component";
import { engine } from "../../core/engine/engine";

export class ColliderCameraComponent extends Component {

    distanceCharacterToCamera: number = 0;
    raycaster = new THREE.Raycaster();
    private elapsedUpdateTime: number = 0;

    private readonly updateInterval: number = 0.05;

    public override start(): void {

    }

    public override update(deltaTime: number): void {
        this.elapsedUpdateTime += deltaTime;

        // this.distanceCharacterToCamera = engine.camera.position.distanceTo(engine.controls.target);
        // console.log("update");
        if (this.elapsedUpdateTime < this.updateInterval) {
            return;
        }

        this.elapsedUpdateTime = 0;

        const rayDirection = engine.camera.position.sub(engine.controls.target).normalize();
        this.raycaster.set(engine.controls.target, rayDirection);
        this.raycaster.near = 1;
        this.raycaster.far = 5;
        const intersects = this.raycaster.intersectObjects([], false);
        if (intersects.length > 0) {
            console.log(intersects);
            const hitPoint = intersects[0].point;
            engine.camera.position.set(hitPoint.x, hitPoint.y, hitPoint.z);
        }
    }

    public override lateUpdate(deltaTime: number): void {

    }

    public override onDestroy(): void {

    }

}