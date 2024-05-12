import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { GameObject } from "../vipe-3d-engine/core/gameobject";
import { EditableSceneComponent } from "../vipe-3d-engine/components/editor/editable-scene.component";

@Injectable({ providedIn: 'root' })
export class EditorService {
    
    contextMenuSelected: BehaviorSubject<{ action: string }> = new BehaviorSubject(null);
    editableSceneComponent: EditableSceneComponent;

    constructor() { }

}