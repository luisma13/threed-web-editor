import { engine } from "../../../simple-engine/core/engine/engine";
import { GameObject } from "../../../simple-engine/core/gameobject";
import { ModelCacheService } from "../../resource-manager/model-cache.service";
import { Action } from "./actions";

/**
 * Action state for model operations
 */
export interface ModelActionState {
    modelUuid: string;
    gameObject: GameObject;
    url: string;
    modelType: string;
    name: string;
}

/**
 * Action for adding a model to the scene
 */
export class AddModelAction extends Action<ModelActionState> {
    constructor(
        state: ModelActionState,
        private modelCacheService: ModelCacheService
    ) {
        super(state);
    }
    
    override async executeUndo() {
        // Remove the GameObject from the scene
        if (this.state.gameObject.parentGameObject) {
            this.state.gameObject.parentGameObject.removeGameObject(this.state.gameObject);
        } else {
            engine.removeGameObjects(this.state.gameObject);
        }
    }
    
    override async executeRedo() {
        // Re-add the GameObject to the scene
        engine.addGameObjects(this.state.gameObject);
    }
}

/**
 * Action for removing a model from the scene
 */
export class RemoveModelAction extends Action<ModelActionState> {
    constructor(
        state: ModelActionState,
        private modelCacheService: ModelCacheService
    ) {
        super(state);
    }
    
    override async executeUndo() {
        // Re-add the GameObject to the scene
        engine.addGameObjects(this.state.gameObject);
    }
    
    override async executeRedo() {
        // Remove the GameObject from the scene
        if (this.state.gameObject.parentGameObject) {
            this.state.gameObject.parentGameObject.removeGameObject(this.state.gameObject);
        } else {
            engine.removeGameObjects(this.state.gameObject);
        }
    }
} 