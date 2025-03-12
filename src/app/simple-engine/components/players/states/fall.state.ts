import { PlayerControllerComponent } from "../player-controller.component";
import { PlayerBaseState } from "./base.state";
import { FallHightState } from "./fall-high.state";
import { IdleState } from "./idle.state";

export class FallState extends PlayerBaseState {
    constructor(playerController: PlayerControllerComponent) {
        super(playerController, "Fall");
    }

    override update(delta): void {
        super.update(delta);

        if (this.playerPhysics.inGround) {
            this.playerController.changeState(new IdleState(this.playerController));
        }
        if (this.gameobject.rigidbody.velocity.y < -5) this.playerController.changeState(new FallHightState(this.playerController));
    }

    onStateEnter(): void {}

    override onInput(keys, shiftPressed): void {
        super.onInput(keys, shiftPressed);
    }
}
