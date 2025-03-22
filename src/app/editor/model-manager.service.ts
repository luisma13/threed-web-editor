import { Injectable } from '@angular/core';
import { GameObject } from '../simple-engine/core/gameobject';
import { Object3D } from 'three';
import * as THREE from 'three';
import { EditableObjectComponent } from '../simple-engine/components/editor/editable-object.component';
import { engine } from '../simple-engine/core/engine/engine';
import { ModelCacheAdapter } from './resource-manager/model-cache-adapter.service';

@Injectable({
    providedIn: 'root'
})
export class ModelManagerService {
    constructor(
        private modelCache: ModelCacheAdapter
    ) {}

    /**
     * Adds a model to the scene from a file or URL
     * @param extension File extension or model type
     * @param url Optional URL to load the model from
     * @returns Promise with the created GameObject
     */
    async addModelToScene(extension: string, url?: string): Promise<GameObject | undefined> {
        try {
            if (!url) {
                // Create a file input element
                const input = document.createElement('input');
                input.type = 'file';

                // Set accepted file types based on extension
                switch (extension) {
                    case '.gltf':
                        input.accept = '.gltf,.glb';
                        break;
                    case '.glb':
                        input.accept = '.glb';
                        break;
                    case '.fbx':
                        input.accept = '.fbx';
                        break;
                    case '.obj':
                        input.accept = '.obj';
                        break;
                    case '.vrm':
                        input.accept = '.vrm';
                        break;
                    default:
                        input.accept = '.gltf,.glb,.fbx,.obj,.vrm';
                }

                // Create a promise to handle the file selection
                return new Promise<GameObject | undefined>((resolve) => {
                    input.onchange = async (event) => {
                        const files = (event.target as HTMLInputElement).files;
                        const file = files ? files[0] : null;

                        if (file) {
                            const fileUrl = URL.createObjectURL(file);
                            try {
                                // Determine the file extension from the file name
                                const fileName = file.name;
                                console.log('Loading model:', fileName);
                                const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();

                                // Use the file extension as the model type
                                const modelType = this.getModelTypeFromExtension(fileExtension);
                                const gameObject = await this.loadModelWithCache(fileUrl, modelType, fileName);
                                resolve(gameObject);
                            } catch (error) {
                                console.error('Error loading model:', error);
                                resolve(undefined);
                            }
                        } else {
                            resolve(undefined);
                        }
                    };

                    // Trigger the file dialog
                    input.click();
                });
            }

            // For direct URLs, extract the file name and determine model type
            const urlFileName = url.split('/').pop()?.split('?')[0] || 'Model';
            const modelType = this.getModelTypeFromExtension(extension);
            return this.loadModelWithCache(url, modelType, urlFileName);
        } catch (error) {
            console.error('Error adding model to scene:', error);
            return undefined;
        }
    }

    /**
     * Loads a model using the cache system
     */
    async loadModelWithCache(url: string, modelType: string, fileName: string): Promise<GameObject | undefined> {
        try {
            console.log('Loading model with name:', fileName);
            const modelInfo = await this.modelCache.loadModel(url, modelType, fileName);
            if (!modelInfo?.rootObject) {
                console.error('Failed to load model:', fileName);
                return undefined;
            }

            // Clonar el modelo con toda su jerarquía
            const clonedModel = modelInfo.rootObject.clone(true);
            
            // Convertir el objeto raíz en GameObject
            const rootGameObject = new GameObject();
            // Remover la extensión del nombre del archivo
            const nameWithoutExtension = fileName.split('.').slice(0, -1).join('.');
            rootGameObject.name = nameWithoutExtension;

            // Copiar las transformaciones del modelo
            rootGameObject.position.copy(clonedModel.position);
            rootGameObject.quaternion.copy(clonedModel.quaternion);
            rootGameObject.scale.copy(clonedModel.scale);

            // Añadir el EditableObjectComponent al root
            rootGameObject.addComponent(new EditableObjectComponent());

            // Guardar referencia al UUID del modelo y nombre original
            rootGameObject.userData = {
                ...rootGameObject.userData,
                modelUuid: modelInfo.uuid,
                originalFileName: nameWithoutExtension
            };

            // Procesar los hijos directamente
            const children = [...clonedModel.children];
            children.forEach(child => {
                this.processModelHierarchy(child, rootGameObject);
            });

            // Añadir el GameObject raíz a la escena
            engine.addGameObjects(rootGameObject);

            return rootGameObject;
        } catch (error) {
            console.error('Error loading model with cache:', error);
            return undefined;
        }
    }

    /**
     * Adds a model to the scene from the cache
     */
    async addModelToSceneFromCache(uuid: string): Promise<GameObject | undefined> {
        try {
            const modelInfo = this.modelCache.getModel(uuid);
            if (!modelInfo) {
                return undefined;
            }

            // Clonar el modelo con toda su jerarquía
            const clonedModel = modelInfo.rootObject.clone(true);
            
            // Convertir el objeto raíz en GameObject
            const rootGameObject = new GameObject();
            rootGameObject.name = modelInfo.name || 'Model';

            // Copiar las transformaciones del modelo
            rootGameObject.position.copy(clonedModel.position);
            rootGameObject.quaternion.copy(clonedModel.quaternion);
            rootGameObject.scale.copy(clonedModel.scale);

            // Añadir el EditableObjectComponent al root
            rootGameObject.addComponent(new EditableObjectComponent());

            // Guardar referencia al UUID del modelo y nombre original
            rootGameObject.userData = {
                ...rootGameObject.userData,
                modelUuid: uuid,
                originalFileName: modelInfo.name
            };

            // Procesar los hijos directamente
            const children = [...clonedModel.children];
            children.forEach(child => {
                this.processModelHierarchy(child, rootGameObject);
            });

            // Añadir el GameObject raíz a la escena
            engine.addGameObjects(rootGameObject);

            return rootGameObject;
        } catch (error) {
            console.error('Error adding model from cache:', error);
            return undefined;
        }
    }

    /**
     * Processes the model hierarchy recursively
     */
    private processModelHierarchy(object: Object3D, parentGameObject: GameObject) {
        // Si es un grupo o un objeto con hijos que no sea un mesh, crear un GameObject para mantener la jerarquía
        if (object instanceof THREE.Group || (object.children.length > 0 && !(object instanceof THREE.Mesh))) {
            const groupGameObject = new GameObject();
            groupGameObject.name = object.name || 'Group';

            // Añadir el EditableObjectComponent
            groupGameObject.addComponent(new EditableObjectComponent());

            // Añadir el GameObject como hijo del padre
            parentGameObject.addGameObject(groupGameObject);

            // Copiar las transformaciones locales
            groupGameObject.position.copy(object.position);
            groupGameObject.quaternion.copy(object.quaternion);
            groupGameObject.scale.copy(object.scale);

            // Procesar los hijos del grupo
            const children = [...object.children];
            children.forEach(child => {
                this.processModelHierarchy(child, groupGameObject);
            });
        }
        // Si es un Mesh, crear un GameObject que lo envuelva
        else if (object instanceof THREE.Mesh) {
            const meshGameObject = new GameObject();
            meshGameObject.name = object.name || 'Mesh';

            // Añadir el EditableObjectComponent
            meshGameObject.addComponent(new EditableObjectComponent());

            // Añadir el GameObject como hijo del padre
            parentGameObject.addGameObject(meshGameObject);

            // Clonar el mesh sin sus hijos
            const clonedMesh = object.clone(false);

            // Copiar las transformaciones locales
            meshGameObject.position.copy(object.position);
            meshGameObject.quaternion.copy(object.quaternion);
            meshGameObject.scale.copy(object.scale);

            // Añadir el mesh clonado al GameObject
            meshGameObject.add(clonedMesh);

            // Resetear las transformaciones del mesh clonado
            clonedMesh.position.set(0, 0, 0);
            clonedMesh.quaternion.identity();
            clonedMesh.scale.set(1, 1, 1);
            clonedMesh.updateMatrix();
        }
    }

    private getModelTypeFromExtension(extension: string): string {
        switch (extension.toLowerCase()) {
            case '.gltf':
            case '.glb':
                return 'gltf';
            case '.fbx':
                return 'fbx';
            case '.obj':
                return 'obj';
            case '.vrm':
                return 'vrm';
            default:
                throw new Error(`Unsupported model extension: ${extension}`);
        }
    }
} 