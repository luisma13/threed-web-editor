import { engine } from "../../../simple-engine/core/engine/engine";
import { GameObject } from "../../../simple-engine/core/gameobject";
import { EditorService } from "../../editor.service";
import { Action } from "./actions";

export class AddGameObjectAction extends Action<{ ext: string, url: string, gameObject: GameObject }> {
    override async executeUndo() {
        engine.removeGameObjects(this.state.gameObject);
    }
    override async executeRedo(editorService: EditorService) {
        const gameObject = await editorService.addModelToScene(this.state.ext, this.state.url);
        this.state.gameObject = gameObject;
    }
}