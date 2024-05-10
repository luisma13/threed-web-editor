
import * as CANNON from "cannon-es";
import { Group } from "three";
import { Component } from "../../core/component";
import { CollisionGroups, engine } from "../../core/engine/engine";

/**
 *
 * REQUIRE PLAYER COMPONENT ON GAMEOBJECT
 *
 */
export class PlayerPhysicsComponent extends Component {
    readonly MASS = 6;

    inGround = false;
    jumpVelocity = 8;
    jumpHeight = 2;

    // Ray casting
    rayResult: CANNON.RaycastResult = new CANNON.RaycastResult();
    rayHasHit = false;
    public rayCastLength = 0.3;
    public raySafeOffset = 0.03;
    raycastBox: Group;

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

    }

    public override lateUpdate(deltaTime: number): void {
        this.feetRaycast();
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

    public onDestroy(): void { }
}
