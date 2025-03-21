import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Object3D } from 'three';
import { ModelManager, CachedModelInfo } from '../../simple-engine/managers/model-manager';

@Injectable({
    providedIn: 'root'
})
export class ModelCacheAdapter {
    private modelManager: ModelManager;
    private modelsSubject = new BehaviorSubject<Map<string, CachedModelInfo>>(new Map());

    constructor() {
        this.modelManager = ModelManager.getInstance();
        // Inicializar con los modelos actuales
        this.modelsSubject.next(this.modelManager.getAllModels());
    }

    get modelsObservable(): Observable<Map<string, CachedModelInfo>> {
        return this.modelsSubject.asObservable();
    }

    private notifyModelChange() {
        this.modelsSubject.next(this.modelManager.getAllModels());
    }

    async loadModel(path: string, modelType, fileName?: string): Promise<Object3D | undefined> {
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
            
            console.log('Model loaded with name:', modelInfo.name);
            this.notifyModelChange();
            return modelInfo.rootObject;
        } catch (error) {
            console.error('Error loading model:', error);
            return undefined;
        }
    }

    getModel(uuid: string): Object3D | undefined {
        const modelInfo = this.modelManager.getModel(uuid);
        return modelInfo?.rootObject;
    }

    releaseModel(uuid: string): void {
        this.modelManager.releaseModel(uuid);
        this.notifyModelChange();
    }

    updateModelName(uuid: string, newName: string): boolean {
        const modelInfo = this.modelManager.getModel(uuid);
        if (modelInfo) {
            modelInfo.name = newName;
            return true;
        }
        return false;
    }

    disposeAllModels(): void {
        this.modelManager.disposeAllResources();
    }

    getInternalManager(): ModelManager {
        return this.modelManager;
    }

    getModelPreview(uuid: string): string | null {
        return this.modelManager.getModelPreview(uuid);
    }

} 