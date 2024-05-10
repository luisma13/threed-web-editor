import * as THREE from "three";
import { PlayerControllerComponent } from "../player-controller.component";
import { PlayerPhysicsComponent } from "../player-physics.component";
import { GameObject } from "../../../core/gameobject";
import { engine } from "../../../core/engine/engine";

export const W = "w";
export const A = "a";
export const S = "s";
export const D = "d";
export const SPACE = " ";
export const SHIFT = "shift";
export const DIRECTIONS = [W, A, S, D];

export abstract class PlayerBaseState {
    playerController: PlayerControllerComponent = null;
    playerPhysics: PlayerPhysicsComponent = null;

    gameobject: GameObject;
    action = "";
    isMovementEnabled = true;

    shiftPressed = false;
    keysPressed = {};

    walkDirection = new THREE.Vector3();
    YAxis = new THREE.Vector3(0, 1, 0);

    runVelocity = 5;
    walkVelocity = 2;

    constructor(playerController: PlayerControllerComponent, action: string, isMovementEnabled = true) {
        this.playerController = playerController;
        this.gameobject = this.playerController.gameObject;
        this.playerPhysics = this.gameobject.getComponent<PlayerPhysicsComponent>(PlayerPhysicsComponent);
        this.action = action;
        this.isMovementEnabled = isMovementEnabled;
    }

    update(deltaTime): void {
        if (!this.isMovementEnabled) return;

        const angleYCameraDirection = Math.atan2(engine.camera.position.x - this.gameobject.position.x, engine.camera.position.z - this.gameobject.position.z);

        const directionOffset = this.directionOffset(this.keysPressed);
        if (directionOffset !== -1) {
            const rotateQuaternion = new THREE.Quaternion();
            rotateQuaternion.setFromAxisAngle(this.YAxis, angleYCameraDirection + directionOffset);
            this.gameobject.quaternion.rotateTowards(rotateQuaternion, 0.2);

            engine.camera.getWorldDirection(this.walkDirection);
            this.walkDirection.y = 0;
            this.walkDirection.normalize();
            this.walkDirection.applyAxisAngle(this.YAxis, directionOffset);

            const velocity = this.shiftPressed ? this.walkVelocity : this.runVelocity;
            const moveX = this.walkDirection.x * velocity;
            const moveZ = this.walkDirection.z * velocity;

            this.gameobject.rigidbody.velocity.x = moveX;
            this.gameobject.rigidbody.velocity.z = moveZ;
        }
    }

    abstract onStateEnter(): void;

    onInput(keys, shiftPressed) {
        this.keysPressed = keys;
        this.shiftPressed = shiftPressed;
    }

    directionOffset(keysPressed: any) {
        if (keysPressed[W]) {
            if (keysPressed[A]) {
                return Math.PI / 4; // W + A
            }
            if (keysPressed[D]) {
                return -Math.PI / 4; // W + D
            }
            return 0; // W
        }
        if (keysPressed[S]) {
            if (keysPressed[A]) {
                return Math.PI / 4 + Math.PI / 2; // S + A
            }
            if (keysPressed[D]) {
                return -Math.PI / 4 - Math.PI / 2; // S + D
            }
            return Math.PI; // S
        }
        if (keysPressed[A]) {
            return Math.PI / 2; // A
        }
        if (keysPressed[D]) {
            return -Math.PI / 2; // D
        }

        return -1;
    }
}
