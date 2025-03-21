import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Object3D } from 'three';
import { TextureManagerAdapter } from './texture-manager-adapter.service';
import { MaterialManagerAdapter } from './material-manager-adapter.service';
import { ModelManager, CachedModelInfo } from '../../simple-engine/managers/model-manager';

@Injectable({
    providedIn: 'root'
})
export class ModelCacheAdapter {
    private modelManager: ModelManager;
    private _modelsSubject = new BehaviorSubject<Map<string, CachedModelInfo>>(new Map());

    constructor(
        private textureManager: TextureManagerAdapter,
        private materialManager: MaterialManagerAdapter
    ) {
        this.modelManager = ModelManager.getInstance();
        
        // Initialize the BehaviorSubject with empty map
        this._modelsSubject.next(new Map());

        // Subscribe to model updates
        this.modelManager.modelUpdated.subscribe(() => {
            // Update subject with new models
            const models = new Map<string, CachedModelInfo>();
            for (const uuid of Array.from(this._modelsSubject.value.keys())) {
                const model = this.modelManager.getModel(uuid);
                if (model) {
                    models.set(uuid, model);
                }
            }
            this._modelsSubject.next(models);
        });
    }

    get models(): Map<string, CachedModelInfo> {
        const models = new Map<string, CachedModelInfo>();
        for (const uuid of Array.from(this._modelsSubject.value.keys())) {
            const model = this.modelManager.getModel(uuid);
            if (model) {
                models.set(uuid, model);
            }
        }
        return models;
    }

    get modelsSubject(): Observable<Map<string, CachedModelInfo>> {
        return this._modelsSubject.asObservable();
    }

    async loadModel(path: string, fileName?: string): Promise<Object3D | undefined> {
        try {
            // Remove file extension from the name if present
            const cleanFileName = fileName ? fileName.split('.')[0] : undefined;
            console.log('ModelCacheAdapter loading model:', cleanFileName);
            
            const modelInfo = await this.modelManager.loadModel(path, this.getModelType(path), cleanFileName);
            
            if (modelInfo && cleanFileName) {
                // Ensure the name is set in the model info
                modelInfo.name = cleanFileName;
                
                // Set the name only in the root object
                if (modelInfo.rootObject) {
                    modelInfo.rootObject.name = cleanFileName;
                }
            }

            const currentModels = this._modelsSubject.value;
            currentModels.set(modelInfo.uuid, modelInfo);
            this._modelsSubject.next(currentModels);
            
            console.log('Model loaded with name:', modelInfo.name);
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

    getModelByName(name: string): { uuid: string, info: CachedModelInfo } | null {
        for (const [uuid, info] of this._modelsSubject.value.entries()) {
            if (info.name === name) {
                return { uuid, info };
            }
        }
        return null;
    }

    releaseModel(uuid: string): void {
        this.modelManager.releaseModel(uuid);
        const currentModels = this._modelsSubject.value;
        currentModels.delete(uuid);
        this._modelsSubject.next(currentModels);
    }

    updateModelName(uuid: string, newName: string): boolean {
        const modelInfo = this.modelManager.getModel(uuid);
        if (modelInfo) {
            modelInfo.name = newName;
            const currentModels = this._modelsSubject.value;
            currentModels.set(uuid, modelInfo);
            this._modelsSubject.next(currentModels);
            return true;
        }
        return false;
    }

    disposeAllModels(): void {
        this.modelManager.disposeAllResources();
        this._modelsSubject.next(new Map());
    }

    getInternalManager(): ModelManager {
        return this.modelManager;
    }

    private getModelType(path: string): string {
        // Handle blob URLs
        if (path.startsWith('blob:')) {
            // For blob URLs, we need to rely on the original file extension
            // which should be passed in the URL after the last dot
            const matches = path.match(/\.(gltf|glb|fbx|obj|vrm)$/i);
            if (matches) {
                const extension = matches[1].toLowerCase();
                return extension === 'glb' ? 'gltf' : extension;
            }
            // If no extension found in URL, default to gltf
            return 'gltf';
        }

        // Normal path handling
        const extension = path.split('.').pop()?.toLowerCase() || '';
        switch (extension) {
            case 'gltf':
            case 'glb':
                return 'gltf';
            case 'fbx':
                return 'fbx';
            case 'obj':
                return 'obj';
            case 'vrm':
                return 'vrm';
            default:
                throw new Error(`Unsupported model extension: ${path}`);
        }
    }
} 