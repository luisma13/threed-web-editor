import { PlayerControllerComponent } from "../player-controller.component";
import { DIRECTIONS, PlayerBaseState } from "./base.state";
import { FallState } from "./fall.state";
import { JumpState } from "./jump.state";
import { RunState } from "./run.state";

export class IdleState extends PlayerBaseState {
    constructor(playerController: PlayerControllerComponent) {
        super(playerController, "Idle");
    }

    override update(delta): void {
        super.update(delta);

        // Falling
        if (!this.playerPhysics.isGrounded()) {
            this.playerController.changeState(new FallState(this.playerController));
        }
    }

    onStateEnter(): void {}

    override onInput(keys, shiftPressed): void {
        super.onInput(keys, shiftPressed);

        if (keys[" "] == true) {
            this.playerController.changeState(new JumpState(this.playerController));
        }

        const directionPressed = DIRECTIONS.some((key) => keys[key] == true);
        if (directionPressed) {
            this.playerController.changeState(new RunState(this.playerController));
        }
    }
}
