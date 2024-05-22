import { Injectable } from "@angular/core";
import { EditorService } from "../editor.service";
import { Action, TransformData } from "./actions/actions";
import { ChangeTransformAction } from "./actions/change-transform.action";

@Injectable({ providedIn: 'root' })
export class HistoryService {

    historyActions: Action<any>[] = [];
    redoActions: Action<any>[] = [];
    lastState: any;

    constructor(private editorService: EditorService) {
        this.editorService.editableSceneComponent.onChangeListener.subscribe((data) => {
            if (!data) return;
            if (this.isTransformStateSimilar(data, this.lastState)) return;
            this.lastState = data;
            this.addAction(new ChangeTransformAction({ gameobject: data.gameObject, transform: data.transform }));
        });
    }

    isTransformStateSimilar(go1: any, go2: any) {
        if (go1 !== go2) return false;
        const state1 = go1.transform;
        const state2 = go2.transform;
        if (!state2) return false;
        return state1.position.equals(state2.position) && state1.rotation.equals(state2.rotation) && state1.scale.equals(state2.scale);
    }

    addAction(action: Action<any>) {
        this.historyActions.push(action);
        this.redoActions = [];
    }

    undo() {
        let action = this.historyActions.pop();
        if (!action) return;
        action.executeUndo(this.editorService);
        this.redoActions.push(action);
    }

    redo() {
        let action = this.redoActions.pop();
        if (!action) return;
        action.executeRedo(this.editorService);
        this.historyActions.push(action);
    }

}