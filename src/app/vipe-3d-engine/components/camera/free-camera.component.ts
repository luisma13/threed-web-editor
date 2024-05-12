import * as THREE from 'three';
import { Component } from '../../core/component';
import { engine } from '../../core/engine/engine';

export class FirstPersonCameraComponent extends Component {
    private camera: THREE.PerspectiveCamera;
    private velocity: THREE.Vector3 = new THREE.Vector3();

    private moveSpeed: number = 5;
    private lookSpeed: number = 0.002;

    private euler = new THREE.Euler(0, 0, 0, 'YXZ');
    private quaternion = new THREE.Quaternion();

    private lastMouseX = 0;
    private lastMouseY = 0;

    constructor() {
        super("FirstPersonCameraComponent");
    }

    public override start(): void {
        this.camera = engine.camera as THREE.PerspectiveCamera;
        engine.controls.enabled = false;
    }

    public override update(deltaTime: number): void {
        if (engine.draggingObject)
            return;
        
        this.handleInput(deltaTime);
    }

    private handleInput(deltaTime: number): void {
        const moveDirection = new THREE.Vector3();

        // console.log({a: engine.input.keys.get('a'), d: engine.input.keys.get('d'), w: engine.input.keys.get('w'), s: engine.input.keys.get('s')});

        if (engine.input.keys.get('w')) {

            this.euler.setFromQuaternion(this.camera.quaternion);
            moveDirection.add(this.camera.getWorldDirection(new THREE.Vector3()));
        }
        if (engine.input.keys.get('s')) {
            this.euler.setFromQuaternion(this.camera.quaternion);
            moveDirection.sub(this.camera.getWorldDirection(new THREE.Vector3()));
        }
        if (engine.input.keys.get('a') || engine.input.keys.get('d')) {
            this.euler.setFromQuaternion(this.camera.quaternion);
            const cameraDirection = this.camera.getWorldDirection(new THREE.Vector3());
            const horizontalDirection = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();

            if (engine.input.keys.get('a')) {
                horizontalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
            } else if (engine.input.keys.get('d')) {
                horizontalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
            }

            moveDirection.add(horizontalDirection);
        }

        if (moveDirection.length() > 0) moveDirection.normalize();

        this.velocity.copy(moveDirection).multiplyScalar(this.moveSpeed * deltaTime);
        this.camera.position.add(this.velocity);

        if (engine.input.mouseLeftDown) {
            const deltaX = engine.input.mouse.x - this.lastMouseX;
            const deltaY = engine.input.mouse.y - this.lastMouseY;

            this.euler.setFromQuaternion(this.camera.quaternion);
            this.euler.y -= deltaX * this.lookSpeed;
            this.euler.x -= deltaY * this.lookSpeed;

            this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));

            this.quaternion.setFromEuler(this.euler);
            this.camera.quaternion.copy(this.quaternion);
        }

        this.lastMouseX = engine.input.mouse.x;
        this.lastMouseY = engine.input.mouse.y;
    }

    public override lateUpdate(deltaTime: number): void { }

    public override onDestroy(): void {
        engine.controls.enabled = true;
    }
}
