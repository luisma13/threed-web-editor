import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ResourceService } from './resource.service';
import { TextureInfo } from './texture.service';
import { MaterialInfo } from './material.service';
import { 
    BufferGeometry, 
    Material, 
    Mesh, 
    Object3D, 
    Texture,
    MeshStandardMaterial,
    LoadingManager
} from 'three';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GameObject } from '../../simple-engine/core/gameobject';
import { EditableObjectComponent } from '../../simple-engine/components/editor/editable-object.component';
import { ModelComponent } from '../../simple-engine/components/geometry/model.component';

/**
 * Interface for cached model information
 */
export interface CachedModelInfo {
    uuid: string;
    rootObject: THREE.Object3D;
    url: string;
    modelType: string;
    name: string;
    refCount: number;
    timestamp: number;
    geometries: string[]; // UUIDs of geometries used by this model
    materials: string[]; // UUIDs of materials used by this model
    textures: string[]; // UUIDs of textures used by this model
    animations?: THREE.AnimationClip[]; // Animation clips for this model
}

// Define a generic ResourceInfo interface for geometries
export interface ResourceInfo<T> {
    resource: T;
    refCount: number;
    name: string;
    uuid: string;
}

// Use the generic ResourceInfo for GeometryInfo
export interface GeometryInfo extends ResourceInfo<BufferGeometry> {
    // Any additional properties specific to geometries can be added here
}

@Injectable({
    providedIn: 'root'
})
export class ModelCacheService {
    // Map to store cached models
    private _cachedModels = new Map<string, CachedModelInfo>();
    
    // Map to store geometries
    private _geometries = new Map<string, GeometryInfo>();
    
    // Observable subjects
    private _cachedModelsSubject = new BehaviorSubject<Map<string, CachedModelInfo>>(this._cachedModels);
    private _geometriesSubject = new BehaviorSubject<Map<string, GeometryInfo>>(this._geometries);
    
    // Loaders
    private gltfLoader: GLTFLoader | null = null;
    private fbxLoader: FBXLoader | null = null;
    private objLoader: OBJLoader | null = null;
    
    // Flag for browser environment
    private isBrowser: boolean;
    
    // Getters for maps and subjects
    get cachedModels() {
        return this._cachedModels;
    }
    
    get cachedModelsSubject() {
        return this._cachedModelsSubject;
    }
    
    get geometries() {
        return this._geometries;
    }
    
    get geometriesSubject() {
        return this._geometriesSubject;
    }
    
    constructor(
        private resourceService: ResourceService,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
        
        // Initialize loaders only in browser environment
        if (this.isBrowser) {
            this.initLoaders();
        }
    }
    
    /**
     * Initialize 3D model loaders
     */
    private initLoaders(): void {
        // Create a shared loading manager
        const manager = new LoadingManager();
        
        // Initialize DRACO loader for compressed geometries
        const dracoLoader = new DRACOLoader(manager)
            .setDecoderPath("three/examples/js/libs/draco/gltf/");
        
        // Initialize KTX2 loader for compressed textures
        const ktx2Loader = new KTX2Loader(manager)
            .setTranscoderPath("three/examples/jsm/libs/basis/");
        
        // Initialize GLTF loader with all extensions
        this.gltfLoader = new GLTFLoader(manager)
            .setCrossOrigin('anonymous')
            .setDRACOLoader(dracoLoader)
            .setKTX2Loader(ktx2Loader)
            .setMeshoptDecoder(MeshoptDecoder);
        
        // Initialize FBX loader
        this.fbxLoader = new FBXLoader(manager);
        
        // Initialize OBJ loader
        this.objLoader = new OBJLoader(manager);
    }
    
    /**
     * Generate a UUID for new resources
     */
    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    /**
     * Load a 3D model and cache all its resources
     * @param url URL of the model to load
     * @param modelType Type of the model ('gltf', 'fbx', 'obj', etc.)
     * @param name Optional name for the model (defaults to filename)
     * @returns Promise with the loaded model info
     */
    async loadModel(url: string, modelType: string, name?: string): Promise<CachedModelInfo> {
        if (!this.isBrowser) {
            throw new Error('Cannot load models in non-browser environment');
        }
        
        // Check if model is already cached
        for (const [uuid, modelInfo] of this._cachedModels.entries()) {
            if (modelInfo.url === url) {
                // Increment reference count
                modelInfo.refCount++;
                this._cachedModelsSubject.next(this._cachedModels);
                return modelInfo;
            }
        }
        
        // Extract filename from URL if name not provided
        if (!name) {
            name = url.split('/').pop()?.split('.')[0] || 'Model';
        }
        
        try {
            // Load the model based on its type
            let rootObject: Object3D;
            
            switch (modelType.toLowerCase()) {
                case 'gltf':
                case 'glb':
                    if (!this.gltfLoader) throw new Error('GLTF loader not initialized');
                    const gltf = await this.gltfLoader.loadAsync(url);
                    rootObject = gltf.scene;
                    break;
                    
                case 'fbx':
                    if (!this.fbxLoader) throw new Error('FBX loader not initialized');
                    rootObject = await this.fbxLoader.loadAsync(url);
                    break;
                    
                case 'obj':
                    if (!this.objLoader) throw new Error('OBJ loader not initialized');
                    rootObject = await this.objLoader.loadAsync(url);
                    break;
                    
                default:
                    throw new Error(`Unsupported model type: ${modelType}`);
            }
            
            // Process and cache all resources from the model
            const modelUuid = this.generateUUID();
            const geometryUuids: string[] = [];
            const materialUuids: string[] = [];
            const textureUuids: string[] = [];
            
            // Traverse the model to extract and cache all resources
            rootObject.traverse((object) => {
                if (object instanceof Mesh) {
                    // Process geometry
                    const geometry = object.geometry;
                    if (geometry) {
                        const geometryUuid = this.addGeometry(geometry, `${name}_geo_${geometryUuids.length}`);
                        geometryUuids.push(geometryUuid);
                    }
                    
                    // Process materials
                    if (Array.isArray(object.material)) {
                        // Handle multi-material objects
                        object.material.forEach((material, index) => {
                            if (material) {
                                const materialUuid = this.processMaterial(material, `${name}_mat_${materialUuids.length}`, textureUuids);
                                materialUuids.push(materialUuid);
                            }
                        });
                    } else if (object.material) {
                        // Handle single material objects
                        const materialUuid = this.processMaterial(object.material, `${name}_mat_${materialUuids.length}`, textureUuids);
                        materialUuids.push(materialUuid);
                    }
                }
            });
            
            // Create the cached model info
            const modelInfo: CachedModelInfo = {
                uuid: modelUuid,
                name,
                url,
                modelType,
                rootObject,
                geometries: geometryUuids,
                materials: materialUuids,
                textures: textureUuids,
                refCount: 1,
                timestamp: Date.now()
            };
            
            // Store the model in the cache
            this._cachedModels.set(modelUuid, modelInfo);
            this._cachedModelsSubject.next(this._cachedModels);
            
            return modelInfo;
        } catch (error) {
            console.error('Error loading model:', error);
            throw error;
        }
    }
    
    /**
     * Process a material and its textures
     * @param material Material to process
     * @param modelName Name for the model
     * @param textureUuids Array to store texture UUIDs
     * @returns UUID of the processed material
     */
    private processMaterial(material: Material, modelName: string, textureUuids: string[]): string {
        // Check if material is already in the resource service
        for (const [uuid, materialInfo] of this.resourceService.materials.entries()) {
            if (materialInfo.resource === material) {
                materialInfo.refCount++;
                return uuid;
            }
        }
        
        // log type of material
        console.log('type of material', material);

        // Generate material counter
        let materialCounter = 1;
        const materialPrefix = `${modelName}_mat_`;
        while (Array.from(this.resourceService.materials.values()).some(m => m.name === `${materialPrefix}${materialCounter.toString().padStart(3, '0')}`)) {
            materialCounter++;
        }
        const materialName = `${materialPrefix}${materialCounter.toString().padStart(3, '0')}`;
        
        // Add material to resource service
        const materialUuid = this.resourceService.addMaterial(material, materialName);

        // Initialize textureUuids object in userData
        if (!material.userData) material.userData = {};
        material.userData.textureUuids = {};
        
        // Process textures based on material type
        const processTexture = (texture: Texture | null, mapType: string, mapKey: string) => {
            if (texture) {
                console.log(`Procesando textura ${mapType} para material ${materialName}:`, texture);
                
                // Check if texture is already in the resource service
                for (const [uuid, textureInfo] of this.resourceService.textures.entries()) {
                    if (textureInfo.resource === texture || textureInfo.resource.uuid === texture.uuid) {
                        console.log(`Textura encontrada en ResourceService con UUID: ${uuid}`);
                        textureInfo.refCount++;
                        textureUuids.push(uuid);
                        // Store the UUID in material's userData
                        material.userData.textureUuids[mapKey] = uuid;
                        return;
                    }
                }
                
                // Generate texture counter
                let textureCounter = 1;
                const texturePrefix = `${modelName}_tex_`;
                while (Array.from(this.resourceService.textures.values()).some(t => t.name === `${texturePrefix}${textureCounter.toString().padStart(3, '0')}_${mapType}`)) {
                    textureCounter++;
                }
                const textureName = `${texturePrefix}${textureCounter.toString().padStart(3, '0')}_${mapType}`;
                
                // Add texture to resource service
                const textureUuid = this.generateUUID();
                console.log(`Añadiendo nueva textura al ResourceService con UUID: ${textureUuid}`);
                
                // Crear la textura accesible antes de añadirla al ResourceService
                this.resourceService.textureService.createAccessibleTextureImage(texture);
                
                this.resourceService.textures.set(textureUuid, {
                    resource: texture,
                    refCount: 1,
                    name: textureName,
                    uuid: textureUuid
                });
                
                textureUuids.push(textureUuid);
                
                // Store the UUID in material's userData
                material.userData.textureUuids[mapKey] = textureUuid;
            }
        };

        // Process textures for MeshStandardMaterial
        if (material instanceof MeshStandardMaterial) {
            processTexture(material.map, 'albedo', 'map');
            processTexture(material.normalMap, 'normal', 'normalMap');
            processTexture(material.roughnessMap, 'roughness', 'roughnessMap');
            processTexture(material.metalnessMap, 'metalness', 'metalnessMap');
            processTexture(material.emissiveMap, 'emissive', 'emissiveMap');
            processTexture(material.aoMap, 'ao', 'aoMap');
            processTexture(material.displacementMap, 'displacement', 'displacementMap');
        }
        // Process textures for MeshBasicMaterial
        else if (material instanceof THREE.MeshBasicMaterial) {
            console.log('Procesando MeshBasicMaterial:', material);
            processTexture(material.map, 'albedo', 'map');
            processTexture(material.alphaMap, 'alpha', 'alphaMap');
            processTexture(material.aoMap, 'ao', 'aoMap');
            processTexture(material.envMap, 'environment', 'envMap');
            processTexture(material.lightMap, 'light', 'lightMap');
            processTexture(material.specularMap, 'specular', 'specularMap');
        }
        
        console.log(`UUIDs de texturas guardados en userData:`, material.userData.textureUuids);
        return materialUuid;
    }
    
    /**
     * Add a geometry to the cache
     * @param geometry Geometry to add
     * @param name Name for the geometry
     * @returns UUID of the added geometry
     */
    addGeometry(geometry: BufferGeometry, name: string): string {
        // Check if geometry is already cached
        for (const [uuid, geometryInfo] of this._geometries.entries()) {
            if (geometryInfo.resource === geometry) {
                geometryInfo.refCount++;
                this._geometriesSubject.next(this._geometries);
                return uuid;
            }
        }
        
        // Generate UUID for the new geometry
        const uuid = this.generateUUID();
        
        // Store geometry in cache
        this._geometries.set(uuid, {
            resource: geometry,
            refCount: 1,
            name,
            uuid
        });
        
        this._geometriesSubject.next(this._geometries);
        return uuid;
    }
    
    /**
     * Get a model from the cache by UUID
     * @param uuid UUID of the model to get
     * @returns The cached model info or undefined if not found
     */
    getModel(uuid: string): CachedModelInfo | undefined {
        return this._cachedModels.get(uuid);
    }
    
    /**
     * Get a geometry from the cache by UUID
     * @param uuid UUID of the geometry to get
     * @returns The geometry or undefined if not found
     */
    getGeometry(uuid: string): BufferGeometry | undefined {
        const geometryInfo = this._geometries.get(uuid);
        return geometryInfo?.resource;
    }
    
    /**
     * Release a model from the cache
     * @param uuid UUID of the model to release
     * @param forceDispose Whether to force disposal even if refCount > 0
     */
    releaseModel(uuid: string, forceDispose: boolean = false): void {
        const modelInfo = this._cachedModels.get(uuid);
        if (!modelInfo) return;
        
        // Decrement reference count, but never below 0
        if (modelInfo.refCount > 0) {
            modelInfo.refCount--;
        }
        
        // Decrementar el contador de referencias de los materiales asociados
        // independientemente de si se elimina el modelo o no
        if (modelInfo.materials && modelInfo.materials.length > 0) {
            modelInfo.materials.forEach(materialUuid => {
                const materialInfo = this.resourceService.materials.get(materialUuid);
                if (materialInfo && materialInfo.refCount > 0) {
                    materialInfo.refCount--;
                    
                    // Si el contador llega a 0 y se fuerza la eliminación, liberar el material
                    if (materialInfo.refCount <= 0 && forceDispose) {
                        this.resourceService.releaseMaterial(materialUuid);
                    }
                }
            });
            // Notificar cambios en los materiales
            this.resourceService.materialsSubject.next(new Map(this.resourceService.materials));
        }
        
        // Decrementar el contador de referencias de las texturas asociadas
        // independientemente de si se elimina el modelo o no
        if (modelInfo.textures && modelInfo.textures.length > 0) {
            modelInfo.textures.forEach(textureUuid => {
                const textureInfo = this.resourceService.textures.get(textureUuid);
                if (textureInfo && textureInfo.refCount > 0) {
                    textureInfo.refCount--;
                    
                    // Si el contador llega a 0 y se fuerza la eliminación, liberar la textura
                    if (textureInfo.refCount <= 0 && forceDispose) {
                        this.resourceService.releaseTexture(textureUuid);
                    }
                }
            });
            // Notificar cambios en las texturas
            this.resourceService.texturesSubject.next(new Map(this.resourceService.textures));
        }
        
        // Only remove the model if forceDispose is true
        // This allows models to remain in the cache as "prefabs" even when not used in the scene
        if (forceDispose) {
            // Release all associated geometries
            modelInfo.geometries.forEach(geometryUuid => {
                this.releaseGeometry(geometryUuid, forceDispose);
            });
            
            // Remove the model from the cache
            this._cachedModels.delete(uuid);
        }
        
        this._cachedModelsSubject.next(this._cachedModels);
    }
    
    /**
     * Release a geometry from the cache
     * @param uuid UUID of the geometry to release
     * @param forceDispose Whether to force disposal even if refCount > 0
     */
    releaseGeometry(uuid: string, forceDispose: boolean = false): void {
        const geometryInfo = this._geometries.get(uuid);
        if (!geometryInfo) return;
        
        geometryInfo.refCount--;
        
        // If refCount is 0 or force dispose is true, dispose and remove the geometry
        if (forceDispose || geometryInfo.refCount <= 0) {
            geometryInfo.resource.dispose();
            this._geometries.delete(uuid);
        }
        
        this._geometriesSubject.next(this._geometries);
    }
    
    /**
     * Clone a model from the cache
     * @param uuid UUID of the model to clone
     * @returns A new Object3D that is a clone of the cached model
     */
    cloneModel(uuid: string): Object3D | null {
        const modelInfo = this._cachedModels.get(uuid);
        if (!modelInfo) return null;
        
        // Clone the root object
        const clonedRoot = modelInfo.rootObject.clone();
        
        // Increment reference counts for all resources
        modelInfo.refCount++;
        modelInfo.geometries.forEach(geometryUuid => {
            const geometryInfo = this._geometries.get(geometryUuid);
            if (geometryInfo) {
                geometryInfo.refCount++;
            }
        });
        
        modelInfo.materials.forEach(materialUuid => {
            const materialInfo = this.resourceService.materials.get(materialUuid);
            if (materialInfo) {
                materialInfo.refCount++;
            }
        });
        
        modelInfo.textures.forEach(textureUuid => {
            const textureInfo = this.resourceService.textures.get(textureUuid);
            if (textureInfo) {
                textureInfo.refCount++;
            }
        });
        
        // Update subjects
        this._cachedModelsSubject.next(this._cachedModels);
        this._geometriesSubject.next(this._geometries);
        
        return clonedRoot;
    }
    
    /**
     * Dispose all cached resources
     */
    disposeAllResources(): void {
        // Dispose all geometries
        for (const [uuid, geometryInfo] of this._geometries.entries()) {
            geometryInfo.resource.dispose();
        }
        
        // Clear all maps
        this._geometries.clear();
        this._cachedModels.clear();
        
        // Update subjects
        this._geometriesSubject.next(this._geometries);
        this._cachedModelsSubject.next(this._cachedModels);
    }
    
    /**
     * Clean up unused models from the cache
     * @param maxAgeMs Maximum age in milliseconds for unused models to keep (default: 1 hour)
     * @param forceCleanup Whether to force cleanup of all unused models regardless of age
     * @returns Number of models removed
     */
    cleanupUnusedModels(maxAgeMs: number = 3600000, forceCleanup: boolean = false): number {
        const now = Date.now();
        let removedCount = 0;
        
        // Find models with refCount = 0 and older than maxAgeMs
        for (const [uuid, modelInfo] of this._cachedModels.entries()) {
            if (modelInfo.refCount <= 0 && (forceCleanup || (now - modelInfo.timestamp) > maxAgeMs)) {
                // Force dispose the model
                this.releaseModel(uuid, true);
                removedCount++;
            }
        }
        
        return removedCount;
    }
    
    /**
     * Get animations for a model from the cache
     * @param uuid UUID of the model
     * @returns Array of animation clips or empty array if not found
     */
    getModelAnimations(uuid: string): THREE.AnimationClip[] {
        // For now, we'll return an empty array as animations are not yet stored in the cache
        // In a future implementation, this would return actual animations from the cache
        return [];
    }
    
    /**
     * Incrementa el contador de referencias para un modelo específico
     * @param uuid UUID del modelo
     * @returns true si se incrementó correctamente, false si no se encontró el modelo
     */
    incrementReferenceCount(uuid: string): boolean {
        const model = this._cachedModels.get(uuid);
        if (model) {
            model.refCount++;
            this._cachedModelsSubject.next(this._cachedModels);
            return true;
        }
        return false;
    }
    
    /**
     * Obtiene un modelo por su URL
     * @param url URL del modelo
     * @returns Información del modelo o undefined si no se encuentra
     */
    getModelByUrl(url: string): CachedModelInfo | undefined {
        for (const model of this._cachedModels.values()) {
            if (model.url === url) {
                return model;
            }
        }
        return undefined;
    }
    
    /**
     * Añade animaciones a un modelo en caché
     * @param uuid UUID del modelo
     * @param animations Array de animaciones
     * @returns true si se añadieron correctamente, false si no se encontró el modelo
     */
    addModelAnimations(uuid: string, animations: THREE.AnimationClip[]): boolean {
        const model = this._cachedModels.get(uuid);
        if (model) {
            // Almacenar las animaciones en el modelo
            model.animations = animations;
            this._cachedModelsSubject.next(this._cachedModels);
            return true;
        }
        return false;
    }
    
    /**
     * Creates a GameObject from a cached model, handling all resource management
     * @param uuid UUID of the model to create GameObject from
     * @returns The created GameObject or undefined if model not found
     */
    createGameObjectFromModel(uuid: string): GameObject | undefined {
        try {
            // Get the model info
            const modelInfo = this.getModel(uuid);
            if (!modelInfo) {
                console.error(`Model not found: ${uuid}`);
                return undefined;
            }

            // Increment reference count for the model
            this.incrementReferenceCount(uuid);

            // Create a new GameObject
            const gameObject = new GameObject();
            gameObject.name = modelInfo.name;

            // Add the model as a child of the GameObject
            const modelObject = modelInfo.rootObject.clone();
            gameObject.add(modelObject);

            // Add the EditableObjectComponent
            const editableObjectComponent = new EditableObjectComponent();
            gameObject.addComponent(editableObjectComponent);

            // Add the ModelComponent and initialize it with model data
            const modelComponent = new ModelComponent();

            // Initialize with model object and animations
            const animations = this.getModelAnimations(modelInfo.uuid);
            modelComponent.initWithObject(modelObject, animations);
            modelComponent.setModelData(modelInfo.url, modelInfo.modelType, modelInfo.uuid);
            gameObject.addComponent(modelComponent);

            // Store model UUID reference in GameObject's userData
            gameObject.userData = gameObject.userData || {};
            gameObject.userData['modelUuid'] = modelInfo.uuid;

            // Set up mesh userData for selection
            modelObject.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.userData = child.userData || {};
                    child.userData['parentGameObject'] = gameObject;
                }
            });

            return gameObject;
        } catch (error) {
            console.error('Error creating GameObject from model:', error);
            return undefined;
        }
    }
} 