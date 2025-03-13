import { GameObject } from "../../../simple-engine/core/gameobject";
import { Action, TransformData } from "./actions";
import { engine } from "../../../simple-engine/core/engine/engine";

export class ChangeTransformAction extends Action<{ gameObject: GameObject, transform: TransformData }> {
    override async executeUndo() {
        const { gameObject, transform } = this.state;
        
        // Restore the previous transform values
        gameObject.position.copy(transform.position);
        gameObject.rotation.copy(transform.rotation);
        gameObject.scale.copy(transform.scale);
    }
    
    override async executeRedo() {
        // No need to do anything for redo, as the current state is already the "redo" state
    }
}