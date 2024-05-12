import * as THREE from "three";
import * as CANNON from "cannon-es";
import { Component } from "../../core/component";
import { CollisionGroups, engine } from "../../core/engine/engine";

export class ColliderCameraComponent extends Component {

    private previousDistanceObjectToCamera: number = 3;
    private smoothFactor: number = 0.2;
    private cameraOffset: number = 0.4; 

    constructor() {
        super("ColliderCameraComponent");
    }

    public override start(): void {

    }

    public override update(deltaTime: number): void {
        if (engine.input.mouseWheel !== 0) {
            this.previousDistanceObjectToCamera += engine.input.mouseWheel * 0.001;
            this.previousDistanceObjectToCamera = THREE.MathUtils.clamp(this.previousDistanceObjectToCamera, 1, 10);
            console.log("Distance: ", this.previousDistanceObjectToCamera);
        }
        
        // Convertir THREE.Vector3 a CANNON.Vec3
        const rayFrom = new CANNON.Vec3(engine.camera.position.x, engine.camera.position.y, engine.camera.position.z);
        const rayTo = new CANNON.Vec3(engine.controls.target.x, engine.controls.target.y, engine.controls.target.z);
        const rayDirection = rayTo.vsub(rayFrom).unit();

        // Configurar el rayo en Cannon.js
        const ray = new CANNON.Ray(rayFrom, rayTo);
        ray.direction.copy(rayDirection);

        // Resultados del raycast
        const raycastResult = new CANNON.RaycastResult();

        // Realizar el raycast
        engine.world.raycastClosest(ray.from, ray.to, { collisionFilterMask: ~(CollisionGroups.Characters), skipBackfaces: true }, raycastResult);

        if (raycastResult.hasHit) {
            const hitPosition = new THREE.Vector3(
                raycastResult.hitPointWorld.x + rayDirection.x * this.cameraOffset,
                raycastResult.hitPointWorld.y + rayDirection.y * this.cameraOffset,
                raycastResult.hitPointWorld.z + rayDirection.z * this.cameraOffset,
            );
            const currentPosition = new THREE.Vector3(engine.camera.position.x, engine.camera.position.y, engine.camera.position.z);
            currentPosition.lerp(hitPosition, this.smoothFactor);
            engine.camera.position.set(currentPosition.x, currentPosition.y, currentPosition.z);
        } else {
            const idealPosition = new THREE.Vector3(
                engine.controls.target.x - rayDirection.x * (this.previousDistanceObjectToCamera),
                engine.controls.target.y - rayDirection.y * (this.previousDistanceObjectToCamera),
                engine.controls.target.z - rayDirection.z * (this.previousDistanceObjectToCamera)
            );
            engine.camera.position.lerp(idealPosition, this.smoothFactor);
        }
    }

    public override lateUpdate(deltaTime: number): void {

    }

    public override onDestroy(): void {

    }

}
