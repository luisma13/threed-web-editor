import { PlayerControllerComponent } from "../player-controller.component";
import { PlayerBaseState } from "./base.state";
import { IdleState } from "./idle.state";

export class FallHightState extends PlayerBaseState {
    constructor(playerController: PlayerControllerComponent) {
        super(playerController, "FallHigh");
    }

    override update(delta): void {
        super.update(delta);

        if (this.gameobject.rigidbody.velocity.y >= 0) this.playerController.changeState(new IdleState(this.playerController));
    }

    onStateEnter(): void {}

    override onInput(keys, shiftPressed): void {
        super.onInput(keys, shiftPressed);
    }
}
