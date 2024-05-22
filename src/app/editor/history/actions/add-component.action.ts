import { GameObject } from "../../../vipe-3d-engine/core/gameobject";
import { Action } from "./actions";

export class AddComponentAction extends Action<{ gameObject: GameObject, component: any }> {
    override async executeUndo() {
        this.state.gameObject.removeComponent(this.state.component);
    }
    override async executeRedo() {
        this.state.gameObject.addComponent(this.state.component);
    }
}