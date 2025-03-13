import { EditorEventsService } from "../../shared/editor-events.service";

export interface TransformData {
    position: THREE.Vector3,
    rotation: THREE.Euler,
    scale: THREE.Vector3;
}

export abstract class Action<T> {
    state: T;
    constructor(data: T) {
        this.state = data;
    }
    abstract executeUndo(): void;
    abstract executeRedo(): void;
}
