import { PlayerControllerComponent } from "../player-controller.component";
import { PlayerBaseState } from "./base.state";

export class ThrowState extends PlayerBaseState {
    constructor(playerController: PlayerControllerComponent) {
        super(playerController, "Throw");
    }

    override update(delta): void {
        super.update(delta);
    }

    onStateEnter(): void {}

    override onInput(keys, shiftPressed): void {
        super.onInput(keys, shiftPressed);
    }
}
