import * as CANNON from "cannon-es";
import { Group } from "three";
import { Component } from "../../core/component";
import { CollisionGroups, engine } from "../../core/engine/engine";
import { Editable } from "../../decorators/editable.decorator";
import 'reflect-metadata';

/**
 *
 * REQUIRE PLAYER COMPONENT ON GAMEOBJECT
 *
 */
export class PlayerPhysicsComponent extends Component {
    readonly MASS = 6;

    private rayHasHit: boolean = false;
    private rayResult: CANNON.RaycastResult;
    private inGround: boolean = false;

    @Editable({
        type: 'number',
        name: 'Jump Velocity',
        description: 'Initial velocity when jumping',
        min: 0,
        max: 20,
        step: 0.1
    })
    private jumpVelocity: number = 8;

    @Editable({
        type: 'number',
        name: 'Jump Height',
        description: 'Maximum jump height',
        min: 0,
        max: 10,
        step: 0.1
    })
    private jumpHeight: number = 2;

    @Editable({
        type: 'number',
        name: 'Ray Cast Length',
        description: 'Length of the ground detection ray',
        min: 0.1,
        max: 1,
        step: 0.01
    })
    private rayCastLength: number = 0.3;

    @Editable({
        type: 'number',
        name: 'Ray Safe Offset',
        description: 'Safe distance from ground',
        min: 0.01,
        max: 0.1,
        step: 0.01
    })
    private raySafeOffset: number = 0.03;

    raycastBox: Group;

    constructor() {
        super("PlayerPhysicsComponent");
        this.rayResult = new CANNON.RaycastResult();
    }

    public start(): void {
        this.gameObject.rigidbody = new CANNON.Body({ mass: this.MASS });
        this.gameObject.rigidbody.angularDamping = 1;

        const shapeSphere = new CANNON.Sphere(0.25);
        this.gameObject.rigidbody.addShape(shapeSphere, new CANNON.Vec3(0, 0.75, 0));
        this.gameObject.rigidbody.addShape(shapeSphere, new CANNON.Vec3(0, -0.25, 0));

        this.gameObject.rigidbody.collisionFilterGroup = CollisionGroups.Characters;

        engine.addBody(this.gameObject.rigidbody);

        // this.gameObject.rigidbody.addEventListener("collide", (event) => {
        // });
    }

    public update(deltaTime: number): void {
        this.checkGround();
    }

    public override lateUpdate(deltaTime: number): void {
        // No late update needed
    }

    feetRaycast(): void {
        const from = new CANNON.Vec3(this.gameObject.position.x, this.gameObject.position.y, this.gameObject.position.z);
        const to = new CANNON.Vec3(from.x, from.y - this.rayCastLength, from.z);

        const options = {
            collisionFilterGroup: CollisionGroups.Characters,
            collisionFilterMask: ~CollisionGroups.Characters,
            skipBackfaces: false,
        };

        this.rayHasHit = engine.world.raycastClosest(from, to, options, this.rayResult);
        this.inGround = this.rayHasHit;
    }

    jump() {
        if (!this.inGround) {
            return;
        }

        this.inGround = false;

        // Calculate the required velocity to achieve the desired jump height
        const velocityMagnitude = Math.sqrt(2 * this.jumpHeight * this.jumpVelocity);

        // Apply the velocity to the rigid body
        this.gameObject.rigidbody.velocity.y = velocityMagnitude;

        // Add a force to the rigid body to ensure it jumps straight up
        const force = new CANNON.Vec3(0, this.gameObject.rigidbody.mass * -9.81, 0);
        this.gameObject.rigidbody.applyLocalForce(force, new CANNON.Vec3(0, 0, 0));
    }

    public onDestroy(): void {
        // Limpiar recursos al destruir el componente
        this.cleanup();
    }

    /**
     * Resetea el componente a sus valores por defecto
     */
    public reset(): void {
        console.log('PlayerPhysicsComponent.reset');
        
        // Restaurar valores por defecto
        this.inGround = false;
        this.jumpVelocity = 8;
        this.jumpHeight = 2;
        this.rayCastLength = 0.3;
        this.raySafeOffset = 0.03;
        
        // Resetear el rigidbody si existe
        if (this.gameObject && this.gameObject.rigidbody) {
            // Detener cualquier movimiento
            this.gameObject.rigidbody.velocity.set(0, 0, 0);
            this.gameObject.rigidbody.angularVelocity.set(0, 0, 0);
            
            // Resetear la masa
            this.gameObject.rigidbody.mass = this.MASS;
            this.gameObject.rigidbody.updateMassProperties();
        }
        
        // Resetear el resultado del raycast
        this.rayHasHit = false;
        this.rayResult = new CANNON.RaycastResult();
    }

    /**
     * Limpia los recursos asociados al componente
     */
    public cleanup(): void {
        console.log('PlayerPhysicsComponent.cleanup');
        
        // Eliminar el rigidbody del mundo de física
        if (this.gameObject && this.gameObject.rigidbody) {
            engine.removeBody(this.gameObject.rigidbody);
            this.gameObject.rigidbody = null;
        }
        
        // Limpiar el resultado del raycast
        if (this.rayResult) {
            this.rayResult = new CANNON.RaycastResult();
            this.rayHasHit = false;
        }
        
        // Limpiar el raycastBox si existe
        if (this.raycastBox) {
            if (this.raycastBox.parent) {
                this.raycastBox.parent.remove(this.raycastBox);
            }
            this.raycastBox = null;
        }
    }

    /**
     * Verifica si el jugador está en el suelo
     */
    private checkGround(): void {
        if (!this.gameObject || !this.gameObject.rigidbody) return;

        const start = new CANNON.Vec3(
            this.gameObject.position.x,
            this.gameObject.position.y,
            this.gameObject.position.z
        );
        const end = new CANNON.Vec3(
            this.gameObject.position.x,
            this.gameObject.position.y - this.rayCastLength,
            this.gameObject.position.z
        );

        this.rayHasHit = false;
        this.rayResult.reset();

        this.gameObject.rigidbody.world.raycastClosest(start, end, {}, this.rayResult);

        if (this.rayResult.hasHit) {
            this.rayHasHit = true;
            this.inGround = this.rayResult.distance <= this.raySafeOffset;
        } else {
            this.inGround = false;
        }
    }

    /**
     * Verifica si el jugador está en el suelo
     */
    public isGrounded(): boolean {
        return this.inGround;
    }

    public override set(key: string, value: any): void {
        this[key] = value;
    }
}
