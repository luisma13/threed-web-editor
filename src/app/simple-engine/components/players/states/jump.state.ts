import { PlayerControllerComponent } from "../player-controller.component";
import { PlayerBaseState } from "./base.state";
import { FallState } from "./fall.state";
import { IdleState } from "./idle.state";

export class JumpState extends PlayerBaseState {
    constructor(playerController: PlayerControllerComponent) {
        super(playerController, "Jump");
    }

    override update(delta): void {
        super.update(delta);

        if (this.gameobject.rigidbody.velocity.y < 0) this.playerController.changeState(new FallState(this.playerController));

        if (this.playerPhysics.isGrounded()) this.playerController.changeState(new IdleState(this.playerController));
    }

    onStateEnter(): void {
        this.playerPhysics.jump();
    }

    override onInput(keys, shiftPressed): void {
        super.onInput(keys, shiftPressed);
    }
}
