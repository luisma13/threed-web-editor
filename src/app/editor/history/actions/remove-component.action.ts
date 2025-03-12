import { GameObject } from "../../../simple-engine/core/gameobject";
import { EditorService } from "../../editor.service";
import { Action } from "./actions";

export class RemoveComponentAction extends Action<{ gameObject: GameObject, component: any }> {
    override async executeUndo(editorService: EditorService) {
        editorService.editableSceneComponent?.selectedObject.next(this.state.gameObject);
        this.state.gameObject.addComponent(this.state.component);
    }
    override async executeRedo(editorService: EditorService) {
        editorService.editableSceneComponent?.selectedObject.next(this.state.gameObject);
        this.state.gameObject.removeComponent(this.state.component);
    }
}