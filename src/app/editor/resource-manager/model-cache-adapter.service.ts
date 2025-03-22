import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Object3D } from 'three';
import { ModelManager, CachedModelInfo } from '../../simple-engine/managers/model-manager';

@Injectable({
    providedIn: 'root'
})
export class ModelCacheAdapter {
    private modelManager: ModelManager;
    private _models = new BehaviorSubject<Map<string, CachedModelInfo>>(new Map());

    modelsObservable = this._models.asObservable();

    constructor() {
        this.modelManager = ModelManager.getInstance();
        this.updateModelsList();
    }

    private updateModelsList() {
        this._models.next(this.modelManager.getAllModels());
    }

    getModel(id: string): CachedModelInfo | undefined {
        return this.modelManager.getModel(id);
    }

    releaseModel(id: string) {
        this.modelManager.releaseModel(id);
        this.updateModelsList();
    }

    updateModel(id: string, modelInfo: CachedModelInfo) {
        const model = this.modelManager.getModel(id);
        if (model) {
            // Update only editable properties
            model.name = modelInfo.name;
            this.updateModelsList();
        }
    }

    async loadModel(path: string, modelType: string, fileName?: string): Promise<CachedModelInfo> {
        try {
            // Remove file extension from the name if present
            const cleanFileName = fileName ? fileName.split('.')[0] : undefined;
            console.log('ModelCacheAdapter loading model:', cleanFileName);
            
            const modelInfo = await this.modelManager.loadModel(path, modelType, cleanFileName);
            
            if (modelInfo && cleanFileName) {
                // Ensure the name is set in the model info
                modelInfo.name = cleanFileName;
                
                // Set the name only in the root object
                if (modelInfo.rootObject) {
                    modelInfo.rootObject.name = cleanFileName;
                }
            }
            
            console.log('Model loaded with name:', modelInfo?.name);
            this.updateModelsList();
            return modelInfo;
        } catch (error) {
            console.error('Error loading model:', error);
            throw error;
        }
    }

    getModelPreview(uuid: string): string | null {
        return this.modelManager.getModelPreview(uuid);
    }

    disposeAllModels(): void {
        this.modelManager.disposeAllResources();
    }

    getInternalManager(): ModelManager {
        return this.modelManager;
    }
} 