import { 
    BufferGeometry, 
    Material, 
    Mesh, 
    Object3D, 
    Texture,
    MeshStandardMaterial,
    LoadingManager,
    AnimationClip
} from 'three';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MaterialManager } from './material-manager';
import { TextureManager } from './texture-manager';
import { SimpleEventEmitter } from '../utils/event-emitter';

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
 * Interface for geometry information
 */
export interface GeometryInfo {
    resource: BufferGeometry;
    refCount: number;
    name: string;
    uuid: string;
}

/**
 * Interface for model update event data
 */
export interface ModelUpdateEvent {
    uuid: string;
    oldModel: Object3D;
    newModel: Object3D;
}

/**
 * ModelManager class for managing 3D models in the simple engine
 */
export class ModelManager {
    private static instance: ModelManager;
    private _cachedModels = new Map<string, CachedModelInfo>();
    private _geometries = new Map<string, GeometryInfo>();

    // Loaders
    private gltfLoader: GLTFLoader | null = null;
    private fbxLoader: FBXLoader | null = null;
    private objLoader: OBJLoader | null = null;

    // Event emitter for model updates
    modelUpdated = new SimpleEventEmitter<ModelUpdateEvent>();

    // References to other managers
    private materialManager: MaterialManager;
    private textureManager: TextureManager;

    private constructor() {
        this.materialManager = MaterialManager.getInstance();
        this.textureManager = TextureManager.getInstance();
        this.initLoaders();
    }

    /**
     * Get the singleton instance of ModelManager
     */
    public static getInstance(): ModelManager {
        if (!ModelManager.instance) {
            ModelManager.instance = new ModelManager();
        }
        return ModelManager.instance;
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
     */
    async loadModel(url: string, modelType: string, name?: string): Promise<CachedModelInfo> {
        // Check if model is already cached
        for (const [uuid, modelInfo] of this._cachedModels.entries()) {
            if (modelInfo.url === url) {
                // Increment reference count
                modelInfo.refCount++;
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
            let animations: AnimationClip[] = [];

            switch (modelType.toLowerCase()) {
                case 'gltf':
                case 'glb':
                    if (!this.gltfLoader) throw new Error('GLTF loader not initialized');
                    const gltf = await this.gltfLoader.loadAsync(url);
                    rootObject = gltf.scene;
                    animations = gltf.animations || [];
                    break;

                case 'fbx':
                    if (!this.fbxLoader) throw new Error('FBX loader not initialized');
                    rootObject = await this.fbxLoader.loadAsync(url);
                    animations = (rootObject as any).animations || [];
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
                        object.material.forEach((material, index) => {
                            if (material) {
                                const materialUuid = this.processMaterial(material, `${name}_mat_${materialUuids.length}`, textureUuids);
                                materialUuids.push(materialUuid);
                            }
                        });
                    } else if (object.material) {
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
                timestamp: Date.now(),
                animations
            };

            // Store the model in the cache
            this._cachedModels.set(modelUuid, modelInfo);

            return modelInfo;
        } catch (error) {
            console.error('Error loading model:', error);
            throw error;
        }
    }

    /**
     * Process a material and its textures
     */
    private processMaterial(material: Material, name: string, textureUuids: string[]): string {
        // Add material to manager
        const materialUuid = this.materialManager.addMaterial(material, name);

        // Process textures if it's a MeshStandardMaterial
        if (material instanceof MeshStandardMaterial) {
            const processTexture = (texture: Texture | null, mapType: string) => {
                if (texture) {
                    // Create a unique name for the texture
                    const textureName = `${name}_${mapType}`;
                    
                    // Add texture to manager
                    const textureUuid = this.textureManager.addTexture(texture, textureName);
                    textureUuids.push(textureUuid);

                    // Store the UUID in material's userData
                    material.userData = material.userData || {};
                    material.userData.textureUuids = material.userData.textureUuids || {};
                    material.userData.textureUuids[mapType] = textureUuid;
                }
            };

            // Process all possible texture maps
            processTexture(material.map, 'map');
            processTexture(material.normalMap, 'normalMap');
            processTexture(material.roughnessMap, 'roughnessMap');
            processTexture(material.metalnessMap, 'metalnessMap');
            processTexture(material.emissiveMap, 'emissiveMap');
            processTexture(material.aoMap, 'aoMap');
            processTexture(material.displacementMap, 'displacementMap');
        }

        return materialUuid;
    }

    /**
     * Add a geometry to the cache
     */
    addGeometry(geometry: BufferGeometry, name: string): string {
        // Check if geometry is already cached
        for (const [uuid, geometryInfo] of this._geometries.entries()) {
            if (geometryInfo.resource === geometry) {
                geometryInfo.refCount++;
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

        return uuid;
    }

    /**
     * Get a model from the cache by UUID
     */
    getModel(uuid: string): CachedModelInfo | undefined {
        const modelInfo = this._cachedModels.get(uuid);
        if (modelInfo) {
            modelInfo.refCount++;
        }
        return modelInfo;
    }

    /**
     * Get a geometry from the cache by UUID
     */
    getGeometry(uuid: string): BufferGeometry | undefined {
        const geometryInfo = this._geometries.get(uuid);
        if (geometryInfo) {
            geometryInfo.refCount++;
            return geometryInfo.resource;
        }
        return undefined;
    }

    /**
     * Release a model from the cache
     */
    releaseModel(uuid: string, forceDispose: boolean = false): void {
        const modelInfo = this._cachedModels.get(uuid);
        if (!modelInfo) return;

        modelInfo.refCount--;

        // Release associated resources
        if (modelInfo.materials) {
            modelInfo.materials.forEach(materialUuid => {
                this.materialManager.releaseMaterial(materialUuid);
            });
        }

        if (modelInfo.textures) {
            modelInfo.textures.forEach(textureUuid => {
                this.textureManager.releaseTexture(textureUuid);
            });
        }

        // Only remove the model if forceDispose is true or refCount <= 0
        if (forceDispose || modelInfo.refCount <= 0) {
            // Release all associated geometries
            modelInfo.geometries.forEach(geometryUuid => {
                this.releaseGeometry(geometryUuid, forceDispose);
            });

            // Remove the model from the cache
            this._cachedModels.delete(uuid);
        }
    }

    /**
     * Release a geometry from the cache
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
    }

    /**
     * Clone a model from the cache
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
            this.materialManager.incrementReferenceCount(materialUuid);
        });

        modelInfo.textures.forEach(textureUuid => {
            const texture = this.textureManager.getTexture(textureUuid);
            // getTexture already increments the reference count
        });

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

        // Release all models (which will also release materials and textures)
        for (const [uuid, modelInfo] of this._cachedModels.entries()) {
            this.releaseModel(uuid, true);
        }

        // Clear all maps
        this._geometries.clear();
        this._cachedModels.clear();
    }

    /**
     * Clean up unused models from the cache
     */
    cleanupUnusedModels(maxAgeMs: number = 3600000, forceCleanup: boolean = false): number {
        const now = Date.now();
        let removedCount = 0;

        // Find models with refCount = 0 and older than maxAgeMs
        for (const [uuid, modelInfo] of this._cachedModels.entries()) {
            if (modelInfo.refCount <= 0 && (forceCleanup || (now - modelInfo.timestamp) > maxAgeMs)) {
                this.releaseModel(uuid, true);
                removedCount++;
            }
        }

        return removedCount;
    }

    /**
     * Get animations for a model
     */
    getModelAnimations(uuid: string): AnimationClip[] {
        const modelInfo = this._cachedModels.get(uuid);
        return modelInfo?.animations || [];
    }

    /**
     * Get a model by its URL
     */
    getModelByUrl(url: string): CachedModelInfo | undefined {
        for (const model of this._cachedModels.values()) {
            if (model.url === url) {
                return model;
            }
        }
        return undefined;
    }
} 