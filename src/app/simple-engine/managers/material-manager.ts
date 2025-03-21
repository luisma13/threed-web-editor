import {
    Material,
    MeshStandardMaterial,
    Color,
    FrontSide,
    BackSide,
    DoubleSide,
    Side,
    Texture,
    MeshBasicMaterial,
    WebGLRenderer,
    Scene,
    PerspectiveCamera,
    SphereGeometry,
    Mesh,
    AmbientLight,
    DirectionalLight
} from 'three';
import { SimpleEventEmitter } from '../utils/event-emitter';
import { TextureManager } from './texture-manager';
import { PreviewRenderer } from '../services/preview-renderer';

/**
 * Interface for material information
 */
export interface MaterialInfo {
    resource: Material;
    refCount: number;
    name: string;
    uuid: string;
}

/**
 * Interface for material preview data
 */
export interface MaterialPreview {
    dataUrl: string;
    timestamp: number;
}

/**
 * Interface for material update event data
 */
export interface MaterialUpdateEvent {
    uuid: string;
    oldMaterial: Material;
    newMaterial: Material;
}

export class MaterialManager {
    private static instance: MaterialManager;
    private _materials = new Map<string, MaterialInfo>();
    private _materialPreviews = new Map<string, string>();
    private textureManager: TextureManager;
    private previewRenderer: PreviewRenderer;

    private constructor() {
        this.previewRenderer = PreviewRenderer.getInstance();
    }

    /**
     * Get the singleton instance of MaterialManager
     */
    public static getInstance(): MaterialManager {
        if (!MaterialManager.instance) {
            MaterialManager.instance = new MaterialManager();
        }
        return MaterialManager.instance;
    }

    /**
     * Set the texture manager instance
     */
    setTextureManager(textureManager: TextureManager): void {
        this.textureManager = textureManager;

        // Subscribe to texture updates
        this.textureManager.textureUpdated.subscribe(event => {
            this.updateMaterialsUsingTexture(event.uuid);
        });
    }

    /**
     * Get all materials
     */
    get materials(): Map<string, MaterialInfo> {
        return this._materials;
    }

    /**
     * Get material previews
     */
    get materialPreviews(): Map<string, string> {
        return this._materialPreviews;
    }

    /**
     * Generate a UUID for new resources
     */
    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Create a preview for a material
     */
    private createMaterialPreview(material: Material): string {
        return this.previewRenderer.createMaterialPreview(material);
    }

    /**
     * Add a material to the manager
     */
    addMaterial(material: Material, name: string): string {
        const uuid = this.generateUUID();

        this._materials.set(uuid, {
            resource: material,
            refCount: 1,
            name: name,
            uuid: uuid
        });

        // Generate and save preview
        try {
            const previewUrl = this.createMaterialPreview(material);
            this.saveMaterialPreview(uuid, previewUrl);
        } catch (error) {
            console.warn('Failed to create material preview:', error);
        }

        return uuid;
    }

    /**
     * Create a new material with the given properties
     */
    createMaterial(name: string, properties: {
        color?: string;
        roughness?: number;
        metalness?: number;
        transparent?: boolean;
        opacity?: number;
        side?: number;
        flatShading?: boolean;
        wireframe?: boolean;
        alphaTest?: number;
        depthTest?: boolean;
        depthWrite?: boolean;
        emissiveColor?: string;
        emissiveIntensity?: number;
        map?: string;
        normalMap?: string;
        roughnessMap?: string;
        metalnessMap?: string;
        emissiveMap?: string;
    }): Material {
        // Create a new MeshStandardMaterial
        const material = new MeshStandardMaterial();
        material.name = name;

        // Set basic properties
        if (properties.color !== undefined) {
            material.color = new Color(properties.color);
        }

        if (properties.roughness !== undefined) {
            material.roughness = properties.roughness;
        }

        if (properties.metalness !== undefined) {
            material.metalness = properties.metalness;
        }

        if (properties.transparent !== undefined) {
            material.transparent = properties.transparent;
        }

        if (properties.opacity !== undefined) {
            material.opacity = properties.opacity;
        }

        if (properties.side !== undefined) {
            material.side = properties.side as Side;
        }

        if (properties.flatShading !== undefined) {
            material.flatShading = properties.flatShading;
        }

        if (properties.wireframe !== undefined) {
            material.wireframe = properties.wireframe;
        }

        if (properties.alphaTest !== undefined) {
            material.alphaTest = properties.alphaTest;
        }

        if (properties.depthTest !== undefined) {
            material.depthTest = properties.depthTest;
        }

        if (properties.depthWrite !== undefined) {
            material.depthWrite = properties.depthWrite;
        }

        if (properties.emissiveColor !== undefined) {
            material.emissive = new Color(properties.emissiveColor);
        }

        if (properties.emissiveIntensity !== undefined) {
            material.emissiveIntensity = properties.emissiveIntensity;
        }

        // Set texture maps
        if (properties.map) {
            const texture = this.textureManager.getTexture(properties.map);
            if (texture) {
                material.map = texture;
            }
        }

        if (properties.normalMap) {
            const texture = this.textureManager.getTexture(properties.normalMap);
            if (texture) {
                material.normalMap = texture;
            }
        }

        if (properties.roughnessMap) {
            const texture = this.textureManager.getTexture(properties.roughnessMap);
            if (texture) {
                material.roughnessMap = texture;
            }
        }

        if (properties.metalnessMap) {
            const texture = this.textureManager.getTexture(properties.metalnessMap);
            if (texture) {
                material.metalnessMap = texture;
            }
        }

        if (properties.emissiveMap) {
            const texture = this.textureManager.getTexture(properties.emissiveMap);
            if (texture) {
                material.emissiveMap = texture;
            }
        }

        // Store material's texture UUIDs
        material.userData = material.userData || {};
        material.userData.textureUuids = {};
        if (properties.map) material.userData.textureUuids.map = properties.map;
        if (properties.normalMap) material.userData.textureUuids.normalMap = properties.normalMap;
        if (properties.roughnessMap) material.userData.textureUuids.roughnessMap = properties.roughnessMap;
        if (properties.metalnessMap) material.userData.textureUuids.metalnessMap = properties.metalnessMap;
        if (properties.emissiveMap) material.userData.textureUuids.emissiveMap = properties.emissiveMap;

        // Add the material to the manager
        return material;
    }

    /**
     * Update an existing material with new properties
     */
    updateMaterial(uuid: string, properties: {
        name?: string;
        color?: string;
        roughness?: number;
        metalness?: number;
        transparent?: boolean;
        opacity?: number;
        side?: number;
        flatShading?: boolean;
        wireframe?: boolean;
        alphaTest?: number;
        depthTest?: boolean;
        depthWrite?: boolean;
        emissiveColor?: string;
        emissiveIntensity?: number;
        map?: string;
        normalMap?: string;
        roughnessMap?: string;
        metalnessMap?: string;
        emissiveMap?: string;
    }): void {
        const materialInfo = this._materials.get(uuid);
        if (!materialInfo) {
            console.error(`Material not found: ${uuid}`);
            return;
        }

        const material = materialInfo.resource;

        // Update name if provided
        if (properties.name !== undefined) {
            materialInfo.name = properties.name;
            material.name = properties.name;
        }

        // Update properties for MeshStandardMaterial
        if (material instanceof MeshStandardMaterial) {
            if (properties.color !== undefined) {
                material.color = new Color(properties.color);
            }

            if (properties.roughness !== undefined) {
                material.roughness = properties.roughness;
            }

            if (properties.metalness !== undefined) {
                material.metalness = properties.metalness;
            }

            if (properties.emissiveColor !== undefined) {
                material.emissive = new Color(properties.emissiveColor);
            }

            if (properties.emissiveIntensity !== undefined) {
                material.emissiveIntensity = properties.emissiveIntensity;
            }

            // Update textures
            if (properties.map !== undefined) {
                material.map = properties.map ? this.textureManager.getTexture(properties.map) || null : null;
                material.userData.textureUuids.map = properties.map || null;
            }

            if (properties.normalMap !== undefined) {
                material.normalMap = properties.normalMap ? this.textureManager.getTexture(properties.normalMap) || null : null;
                material.userData.textureUuids.normalMap = properties.normalMap || null;
            }

            if (properties.roughnessMap !== undefined) {
                material.roughnessMap = properties.roughnessMap ? this.textureManager.getTexture(properties.roughnessMap) || null : null;
                material.userData.textureUuids.roughnessMap = properties.roughnessMap || null;
            }

            if (properties.metalnessMap !== undefined) {
                material.metalnessMap = properties.metalnessMap ? this.textureManager.getTexture(properties.metalnessMap) || null : null;
                material.userData.textureUuids.metalnessMap = properties.metalnessMap || null;
            }

            if (properties.emissiveMap !== undefined) {
                material.emissiveMap = properties.emissiveMap ? this.textureManager.getTexture(properties.emissiveMap) || null : null;
                material.userData.textureUuids.emissiveMap = properties.emissiveMap || null;
            }
        }

        // Update common properties
        if (properties.transparent !== undefined) {
            material.transparent = properties.transparent;
        }

        if (properties.opacity !== undefined) {
            material.opacity = properties.opacity;
        }

        if (properties.side !== undefined) {
            material.side = properties.side as Side;
        }

        if (properties.wireframe !== undefined && (material instanceof MeshStandardMaterial || material instanceof MeshBasicMaterial)) {
            material.wireframe = properties.wireframe;
        }

        if (properties.alphaTest !== undefined) {
            material.alphaTest = properties.alphaTest;
        }

        if (properties.depthTest !== undefined) {
            material.depthTest = properties.depthTest;
        }

        if (properties.depthWrite !== undefined) {
            material.depthWrite = properties.depthWrite;
        }

        try {
            const previewUrl = this.createMaterialPreview(material);
            this.saveMaterialPreview(uuid, previewUrl);
        } catch (error) {
            console.warn('Failed to create material preview:', error);
        }

        // Mark material as needing update
        material.needsUpdate = true;
    }

    /**
     * Get a material by UUID
     */
    getMaterial(uuid: string): Material | undefined {
        const info = this._materials.get(uuid);
        if (info) {
            info.refCount++;
            return info.resource;
        }
        return undefined;
    }

    /**
     * Get a material by name
     */
    getMaterialByName(name: string): { uuid: string, info: MaterialInfo } | null {
        for (const [uuid, info] of this._materials.entries()) {
            if (info.name === name) {
                return { uuid, info };
            }
        }
        return null;
    }

    /**
     * Release a material
     */
    releaseMaterial(uuid: string): void {
        const info = this._materials.get(uuid);
        if (info) {
            info.refCount--;
            if (info.refCount <= 0) {
                info.resource.dispose();
                this._materials.delete(uuid);
            }
        }
    }

    /**
     * Update material name
     */
    updateMaterialName(uuid: string, newName: string): boolean {
        const materialInfo = this._materials.get(uuid);
        if (materialInfo) {
            materialInfo.name = newName;
            materialInfo.resource.name = newName;
            return true;
        }
        return false;
    }

    /**
     * Save material preview
     */
    saveMaterialPreview(uuid: string, dataUrl: string): void {
        this._materialPreviews.set(uuid, dataUrl);
    }

    /**
     * Get material preview
     */
    getMaterialPreview(uuid: string): string | null {
        return this._materialPreviews.get(uuid) || null;
    }

    /**
     * Delete material preview
     */
    deleteMaterialPreview(uuid: string): void {
        this._materialPreviews.delete(uuid);
    }

    /**
     * Find materials using a specific texture
     */
    findMaterialsUsingTexture(textureUuid: string): string[] {
        const materialsUsingTexture: string[] = [];

        this._materials.forEach((info, uuid) => {
            const material = info.resource;
            if (material instanceof MeshStandardMaterial) {
                const textureUuids = material.userData?.textureUuids || {};
                if (Object.values(textureUuids).includes(textureUuid)) {
                    materialsUsingTexture.push(uuid);
                }
            }
        });

        return materialsUsingTexture;
    }

    /**
     * Update materials using a specific texture
     */
    updateMaterialsUsingTexture(textureUuid: string): void {
        const materialsToUpdate = this.findMaterialsUsingTexture(textureUuid);

        materialsToUpdate.forEach(materialUuid => {
            const materialInfo = this._materials.get(materialUuid);
            if (materialInfo && materialInfo.resource instanceof MeshStandardMaterial) {
                const material = materialInfo.resource;

                // Update material's textures
                const textureUuids = material.userData?.textureUuids || {};
                Object.entries(textureUuids).forEach(([mapType, uuid]) => {
                    if (uuid === textureUuid) {
                        const texture = this.textureManager.getTexture(uuid);
                        material[mapType] = texture || null;
                    }
                });

                material.needsUpdate = true;
            }
        });
    }

    /**
     * Dispose all materials
     */
    disposeAllMaterials(): void {
        this._materials.forEach((materialInfo) => {
            materialInfo.resource.dispose();
        });
        this._materials.clear();
        this._materialPreviews.clear();
    }

    /**
     * Increment the reference count for a material
     * @param uuid UUID of the material
     * @returns true if successful, false if material not found
     */
    incrementReferenceCount(uuid: string): boolean {
        const materialInfo = this._materials.get(uuid);
        if (materialInfo) {
            materialInfo.refCount++;
            return true;
        }
        return false;
    }
} 