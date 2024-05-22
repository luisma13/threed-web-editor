import { Injectable } from "@angular/core";
import { EditorService } from "../editor.service";
import { Action, TransformData } from "./actions/actions";
import { ChangeTransformAction } from "./actions/change-transform.action";

@Injectable({ providedIn: 'root' })
export class HistoryService {

    historyActions: Action<any>[] = [];
    redoActions: Action<any>[] = [];
    lastTransformState: { gameObject: any, transform: TransformData };

    constructor(private editorService: EditorService) {
        this.editorService.editableSceneComponent.onChangeListener.subscribe((data) => {
            if (!data) return;
            if (this.isStateEqualsToLastOne(data, this.lastTransformState)) return;
            this.addAction(new ChangeTransformAction({ gameObject: data.gameObject, transform: data.transform }));
            this.lastTransformState = data;
        });
    }

    isStateEqualsToLastOne(go1: any, go2: any) {
        if (go1.gameObject !== go2?.gameObject) return false;
        const state1 = go1.transform;
        const state2 = go2.transform;
        if (!state1 || !state2) return false;
        return state1.position.equals(state2.position) && state1.rotation.equals(state2.rotation) && state1.scale.equals(state2.scale);
    }

    addAction(action: Action<any>) {
        this.historyActions.push(action);
        this.redoActions = [];
    }

    undo() {
        let action = this.historyActions.pop();
        if (!action) return;
        this.redoActions.push(action);
        const lastAction = this.historyActions[this.historyActions.length - 1];
        if (!lastAction) return;
        lastAction.executeUndo(this.editorService);
    }

    redo() {
        let action = this.redoActions.pop();
        if (!action) return;
        this.historyActions.push(action);
        action.executeRedo(this.editorService);
    }

}