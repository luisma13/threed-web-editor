import { GameObject } from "../../../simple-engine/core/gameobject";
import { Action } from "./actions";

export class ChangeHierarchyAction extends Action<{ parent: GameObject, child: GameObject }> {
    override async executeUndo() {
        this.state.parent.removeGameObject(this.state.child);
    }
    override async executeRedo() {
        this.state.parent.addGameObject(this.state.child, false);
    }
}