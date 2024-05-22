import { engine } from "../../../vipe-3d-engine/core/engine/engine";
import { GameObject } from "../../../vipe-3d-engine/core/gameobject";
import { EditorService } from "../../editor.service";
import { Action } from "./actions";

export class RemoveGameObjectAction extends Action<{ ext: string, url: string, gameObject: GameObject }> {
    override async executeUndo(editorService: EditorService) {
        const gameObject = await editorService.addModelToScene(this.state.ext, this.state.url);
        // update the gameObject in all actions
        if (this.state.gameObject.parentGameObject) {
            this.state.gameObject.parentGameObject.addGameObject(gameObject, true);
        }
        this.state.gameObject = gameObject;
        editorService.editableSceneComponent?.selectedObject.next(gameObject);
    }
    override async executeRedo() {
        engine.removeGameObjects(this.state.gameObject);
    }
}