import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Material, MeshStandardMaterial, Color, FrontSide, BackSide, DoubleSide, Side, Texture, MeshBasicMaterial } from 'three';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TextureService, TextureInfo } from './texture.service';

export interface MaterialInfo {
    resource: Material;
    refCount: number;
    name: string;
    uuid: string;
}

// Interfaz para las previsualizaciones de materiales
export interface MaterialPreview {
    dataUrl: string;
    timestamp: number;
}

@Injectable({
    providedIn: 'root'
})
export class MaterialService {
    private _materials = new Map<string, MaterialInfo>();
    
    // Mapa para almacenar las previsualizaciones de los materiales
    private _materialPreviews = new Map<string, MaterialPreview>();

    // Observable maps for UI updates
    private _materialsSubject = new BehaviorSubject<Map<string, MaterialInfo>>(this._materials);
    private _materialPreviewsSubject = new BehaviorSubject<Map<string, MaterialPreview>>(this._materialPreviews);

    private isBrowser: boolean;

    get materials() {
        return this._materials;
    }

    get materialsSubject() {
        return this._materialsSubject;
    }

    // Getter para el observable de previsualizaciones
    get materialPreviewsSubject() {
        return this._materialPreviewsSubject.asObservable();
    }
    
    // Getter para el mapa de previsualizaciones
    get materialPreviews() {
        return this._materialPreviews;
    }

    constructor(
        private textureService: TextureService,
        private snackBar: MatSnackBar,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
        
        // Suscribirse a los eventos de actualización de texturas
        this.textureService.textureUpdated.subscribe(event => {
            this.updateMaterialsWithTexture(event.uuid, event.oldTexture, event.newTexture);
        });
    }

    // Método para generar un UUID
    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // Método para actualizar el nombre de un material
    updateMaterialName(uuid: string, newName: string): boolean {
        if (this._materials.has(uuid)) {
            const materialInfo = this._materials.get(uuid)!;
            materialInfo.name = newName;
            materialInfo.resource.name = newName; // Actualizar también el nombre en el recurso
            this._materialsSubject.next(new Map(this._materials));
            return true;
        }
        return false;
    }
    
    // Método para obtener un material por su nombre
    getMaterialByName(name: string): { uuid: string, info: MaterialInfo } | null {
        for (const [uuid, info] of this._materials.entries()) {
            if (info.name === name) {
                return { uuid, info };
            }
        }
        return null;
    }

    // Material management
    addMaterial(material: Material, name: string): string {
        const uuid = this.generateUUID();
        
        this._materials.set(uuid, {
            resource: material,
            refCount: 1,
            name: name,
            uuid: uuid
        });

        this._materialsSubject.next(this._materials);
        return uuid;
    }

    /**
     * Creates a new MeshStandardMaterial with the given properties
     * @param name Material name
     * @param properties Material properties
     * @returns The created material
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
        console.log('Creating material with properties:', properties);
        
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
        
        // Set advanced properties
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
            const texture = this.textureService.getTexture(properties.map);
            if (texture) {
                material.map = texture;
            }
        }
        
        if (properties.normalMap) {
            const texture = this.textureService.getTexture(properties.normalMap);
            if (texture) {
                material.normalMap = texture;
            }
        }
        
        if (properties.roughnessMap) {
            const texture = this.textureService.getTexture(properties.roughnessMap);
            if (texture) {
                material.roughnessMap = texture;
            }
        }
        
        if (properties.metalnessMap) {
            const texture = this.textureService.getTexture(properties.metalnessMap);
            if (texture) {
                material.metalnessMap = texture;
            }
        }
        
        if (properties.emissiveMap) {
            const texture = this.textureService.getTexture(properties.emissiveMap);
            if (texture) {
                material.emissiveMap = texture;
            }
        }
        
        // Store the material with a UUID
        const uuid = this.addMaterial(material, name);
        
        return material;
    }

    /**
     * Updates an existing material with new properties
     * @param uuid Material UUID
     * @param properties New material properties
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
        console.log(`Iniciando actualización de material con UUID: ${uuid}`);
        
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
        
        // Update basic properties for materials that support color
        if (properties.color !== undefined && (material instanceof MeshStandardMaterial || material instanceof MeshBasicMaterial)) {
            material.color = new Color(properties.color);
        }
        
        // Update properties specific to MeshStandardMaterial
        if (material instanceof MeshStandardMaterial) {
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
            
            if (properties.flatShading !== undefined) {
                material.flatShading = properties.flatShading;
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
        
        // Update texture maps based on material type
        if (material instanceof MeshStandardMaterial) {
            // Handle MeshStandardMaterial textures
        if (properties.map !== undefined) {
                material.map = properties.map ? this.textureService.getTexture(properties.map) || null : null;
            }
            if (properties.normalMap !== undefined) {
                material.normalMap = properties.normalMap ? this.textureService.getTexture(properties.normalMap) || null : null;
            }
            if (properties.roughnessMap !== undefined) {
                material.roughnessMap = properties.roughnessMap ? this.textureService.getTexture(properties.roughnessMap) || null : null;
            }
            if (properties.metalnessMap !== undefined) {
                material.metalnessMap = properties.metalnessMap ? this.textureService.getTexture(properties.metalnessMap) || null : null;
            }
            if (properties.emissiveMap !== undefined) {
                material.emissiveMap = properties.emissiveMap ? this.textureService.getTexture(properties.emissiveMap) || null : null;
            }
        } else if (material instanceof MeshBasicMaterial) {
            // Handle MeshBasicMaterial textures
            if (properties.map !== undefined) {
                const texture = properties.map ? this.textureService.getTexture(properties.map) : null;
                material.map = texture || null;
                console.log('Actualizando textura de MeshBasicMaterial:', {
                    uuid: properties.map,
                    texture: texture
                });
            }
        }
        
        // Update material's userData with texture UUIDs
        material.userData = material.userData || {};
        material.userData.textureUuids = material.userData.textureUuids || {};
        
        if (properties.map !== undefined) material.userData.textureUuids.map = properties.map || null;
        if (material instanceof MeshStandardMaterial) {
            if (properties.normalMap !== undefined) material.userData.textureUuids.normalMap = properties.normalMap || null;
            if (properties.roughnessMap !== undefined) material.userData.textureUuids.roughnessMap = properties.roughnessMap || null;
            if (properties.metalnessMap !== undefined) material.userData.textureUuids.metalnessMap = properties.metalnessMap || null;
            if (properties.emissiveMap !== undefined) material.userData.textureUuids.emissiveMap = properties.emissiveMap || null;
        }
        
        // Mark material as needing update
        material.needsUpdate = true;
        
        // Notify subscribers about the update
        this._materialsSubject.next(new Map(this._materials));
    }

    getMaterial(uuid: string): Material | undefined {
        const info = this._materials.get(uuid);
        if (info) {
            info.refCount++;
            return info.resource;
        }
        return undefined;
    }

    releaseMaterial(uuid: string): void {
        const info = this._materials.get(uuid);
        if (info) {
            info.refCount--;
            if (info.refCount <= 0) {
                info.resource.dispose();
                this._materials.delete(uuid);
                
                // También eliminar la previsualización si existe
                this.deleteMaterialPreview(uuid);
            }
        }

        this._materialsSubject.next(this._materials);
    }

    // Método para guardar la previsualización de un material
    saveMaterialPreview(uuid: string, dataUrl: string): void {
        this._materialPreviews.set(uuid, {
            dataUrl,
            timestamp: Date.now()
        });
        this._materialPreviewsSubject.next(new Map(this._materialPreviews));
    }
    
    // Método para obtener la previsualización de un material
    getMaterialPreview(uuid: string): string | null {
        const preview = this._materialPreviews.get(uuid);
        return preview ? preview.dataUrl : null;
    }
    
    // Método para eliminar la previsualización de un material
    deleteMaterialPreview(uuid: string): void {
        if (this._materialPreviews.has(uuid)) {
            this._materialPreviews.delete(uuid);
            this._materialPreviewsSubject.next(new Map(this._materialPreviews));
        }
    }

    /**
     * Finds all materials that use a specific texture
     * @param textureUuid UUID of the texture to search for
     * @returns Array of material UUIDs that use the texture
     */
    findMaterialsUsingTexture(textureUuid: string): string[] {
        const materialsUsingTexture: string[] = [];
        const texture = this.textureService.getTexture(textureUuid);
        
        if (!texture) {
            console.warn(`Texture with UUID ${textureUuid} not found`);
            return materialsUsingTexture;
        }
        
        console.log(`Buscando materiales que usan la textura ${texture.name} (UUID: ${textureUuid})`);
        
        // Check all materials to see if they use this texture
        for (const [materialUuid, materialInfo] of this._materials.entries()) {
            const material = materialInfo.resource;
            
            // Only check MeshStandardMaterial for now
            if (material instanceof MeshStandardMaterial) {
                // Comparar las instancias de textura directamente
                if (material.map === texture || 
                    material.normalMap === texture || 
                    material.roughnessMap === texture || 
                    material.metalnessMap === texture || 
                    material.emissiveMap === texture || 
                    material.aoMap === texture || 
                    material.displacementMap === texture) {
                    
                    console.log(`Material ${materialInfo.name} (UUID: ${materialUuid}) usa la textura ${texture.name}`);
                    materialsUsingTexture.push(materialUuid);
                }
            }
        }
        
        return materialsUsingTexture;
    }
    
    /**
     * Updates all materials that use a specific texture
     * @param textureUuid UUID of the texture that was updated
     */
    updateMaterialsUsingTexture(textureUuid: string): void {
        // Get the updated texture
        const textureInfo = this.textureService.textures.get(textureUuid);
        if (!textureInfo) return;

        // Update each material that uses this texture
        for (const [materialUuid, materialInfo] of this._materials.entries()) {
            const material = materialInfo.resource;
            if (!material.userData?.textureUuids) continue;

            // Check if this material uses the updated texture
            Object.entries(material.userData.textureUuids).forEach(([mapKey, uuid]) => {
                if (uuid === textureUuid) {
                    // Update the texture in the material
                    if (material instanceof MeshStandardMaterial || material instanceof MeshBasicMaterial) {
                        const mapProperty = mapKey as keyof typeof material;
                        if (mapProperty in material) {
                            console.log(`Updating texture ${mapKey} in material ${materialInfo.name}`);
                            (material[mapProperty] as Texture) = textureInfo.resource;
                            material.needsUpdate = true;
                        }
                    }
                }
            });
        }

        // Notify material changes
        this._materialsSubject.next(new Map(this._materials));
    }

    /**
     * Libera todos los recursos de materiales
     */
    disposeAllMaterials(): void {
        if (!this.isBrowser) return;
        
        console.log('Disposing all materials in MaterialService');
        
        // Liberar todos los materiales
        this.materials.forEach((materialInfo, uuid) => {
            console.log(`Disposing material: ${uuid}`);
            if (materialInfo.resource instanceof Material) {
                materialInfo.resource.dispose();
            }
        });
        this.materials.clear();
        
        // Limpiar las previsualizaciones
        this._materialPreviews.clear();
        
        // Notificar a los suscriptores
        this._materialsSubject.next(this.materials);
        this._materialPreviewsSubject.next(this._materialPreviews);
    }

    /**
     * Actualiza todos los materiales que usan una textura específica cuando esta cambia
     * @param textureUuid UUID de la textura que fue actualizada
     * @param oldTexture Textura anterior
     * @param newTexture Nueva textura
     */
    updateMaterialsWithTexture(textureUuid: string, oldTexture: Texture, newTexture: Texture): void {
        console.log(`Actualizando materiales que usan la textura ${textureUuid}`);
        
        // Recorrer todos los materiales para encontrar los que usan la textura anterior
        for (const [materialUuid, materialInfo] of this._materials.entries()) {
            const material = materialInfo.resource;
            
            // Solo verificar MeshStandardMaterial por ahora
            if (material instanceof MeshStandardMaterial) {
                let materialUpdated = false;
                
                // Actualizar cada mapa de textura si usa la textura anterior
                if (material.map === oldTexture) {
                    material.map = newTexture;
                    materialUpdated = true;
                }
                if (material.normalMap === oldTexture) {
                    material.normalMap = newTexture;
                    materialUpdated = true;
                }
                if (material.roughnessMap === oldTexture) {
                    material.roughnessMap = newTexture;
                    materialUpdated = true;
                }
                if (material.metalnessMap === oldTexture) {
                    material.metalnessMap = newTexture;
                    materialUpdated = true;
                }
                if (material.emissiveMap === oldTexture) {
                    material.emissiveMap = newTexture;
                    materialUpdated = true;
                }
                if (material.aoMap === oldTexture) {
                    material.aoMap = newTexture;
                    materialUpdated = true;
                }
                if (material.displacementMap === oldTexture) {
                    material.displacementMap = newTexture;
                    materialUpdated = true;
                }
                
                // Si el material fue actualizado, marcar como necesitado de actualización
                if (materialUpdated) {
                    material.needsUpdate = true;
                    console.log(`Material ${materialInfo.name} (${materialUuid}) actualizado con la nueva textura`);
                }
            }
        }
        
        // Notificar a los suscriptores sobre las actualizaciones de materiales
        this._materialsSubject.next(new Map(this._materials));
    }
} 