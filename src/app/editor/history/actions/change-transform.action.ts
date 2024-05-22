import { GameObject } from "../../../vipe-3d-engine/core/gameobject";
import { EditorService } from "../../editor.service";
import { Action, TransformData } from "./actions";

export class ChangeTransformAction extends Action<{ gameobject: GameObject, transform: TransformData }> {
    execute = async (editorService: EditorService) => {
        editorService.editableSceneComponent?.selectedObject.next(this.state.gameobject);
        this.state.gameobject.position.copy(this.state.transform.position);
        this.state.gameobject.rotation.copy(this.state.transform.rotation);
        this.state.gameobject.scale.copy(this.state.transform.scale);
    }
    override async executeUndo(editorService: EditorService) {
        this.execute(editorService);
    }
    override async executeRedo(editorService: EditorService) {
        this.execute(editorService);
    }
}