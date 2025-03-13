import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ResourceService, ResourceInfo } from './resource.service';
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

/**
 * Interface for geometry resource information
 */
export interface GeometryInfo extends ResourceInfo<BufferGeometry> {
    // Additional geometry-specific properties can be added here
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
     * @param name Name for the material
     * @param textureUuids Array to store texture UUIDs
     * @returns UUID of the processed material
     */
    private processMaterial(material: Material, name: string, textureUuids: string[]): string {
        // Check if material is already in the resource service
        for (const [uuid, materialInfo] of this.resourceService.materials.entries()) {
            if (materialInfo.resource === material) {
                materialInfo.refCount++;
                return uuid;
            }
        }
        
        // Add material to resource service
        const materialUuid = this.resourceService.addMaterial(material, name);
        
        // Process textures if it's a MeshStandardMaterial
        if (material instanceof MeshStandardMaterial) {
            // Process all texture maps
            const processTexture = (texture: Texture | null, mapName: string) => {
                if (texture) {
                    // Check if texture is already in the resource service
                    for (const [uuid, textureInfo] of this.resourceService.textures.entries()) {
                        if (textureInfo.resource === texture) {
                            textureInfo.refCount++;
                            textureUuids.push(uuid);
                            return;
                        }
                    }
                    
                    // If texture has a source URL, add it to the resource service
                    const textureName = `${name}_${mapName}`;
                    const textureUuid = this.generateUUID();
                    
                    this.resourceService.textures.set(textureUuid, {
                        resource: texture,
                        refCount: 1,
                        name: textureName,
                        uuid: textureUuid
                    });
                    
                    textureUuids.push(textureUuid);
                }
            };
            
            // Process all standard texture maps
            processTexture(material.map, 'albedo');
            processTexture(material.normalMap, 'normal');
            processTexture(material.roughnessMap, 'roughness');
            processTexture(material.metalnessMap, 'metalness');
            processTexture(material.emissiveMap, 'emissive');
            processTexture(material.aoMap, 'ao');
            processTexture(material.displacementMap, 'displacement');
        }
        
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
     * Añade un modelo al caché
     * @param object Objeto 3D del modelo
     * @param url URL del modelo
     * @param modelType Tipo de modelo
     * @param name Nombre del modelo
     * @returns UUID del modelo añadido
     */
    addModel(object: THREE.Object3D, url: string, modelType: string, name: string): string {
        const uuid = THREE.MathUtils.generateUUID();
        
        const cachedModel: CachedModelInfo = {
            uuid,
            rootObject: object,
            url,
            modelType,
            name,
            refCount: 0,
            timestamp: Date.now(),
            geometries: [],
            materials: [],
            textures: []
        };
        
        this._cachedModels.set(uuid, cachedModel);
        this._cachedModelsSubject.next(this._cachedModels);
        
        return uuid;
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
} 