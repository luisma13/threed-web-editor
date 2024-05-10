import { PlayerControllerComponent } from "../player-controller.component";
import { DIRECTIONS, PlayerBaseState } from "./base.state";
import { FallState } from "./fall.state";
import { IdleState } from "./idle.state";
import { JumpState } from "./jump.state";
import { WalkState } from "./walk.state";

export class RunState extends PlayerBaseState {
    constructor(playerController: PlayerControllerComponent) {
        super(playerController, "Run");
    }

    override update(delta): void {
        super.update(delta);

        // Falling
        if (!this.playerPhysics.inGround) {
            this.playerController.changeState(new FallState(this.playerController));
        }
    }

    onStateEnter(): void {}

    override onInput(keys, shiftPressed): void {
        super.onInput(keys, shiftPressed);

        const directionPressed = DIRECTIONS.some((key) => this.keysPressed[key] == true);
        if (!directionPressed) {
            this.playerController.changeState(new IdleState(this.playerController));
            return;
        }

        if (shiftPressed) {
            this.playerController.changeState(new WalkState(this.playerController));
        }

        if (keys[" "] == true) this.playerController.changeState(new JumpState(this.playerController));
    }
}
