import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MaterialManager } from '../../simple-engine/managers/material-manager';
import { Material, MeshStandardMaterial, Color, FrontSide, BackSide, DoubleSide } from 'three';
import { MaterialInfo } from '../../simple-engine/managers/material-manager';
import { TextureManagerAdapter } from './texture-manager-adapter.service';

@Injectable({
    providedIn: 'root'
})
export class MaterialManagerAdapter {
    private materialManager: MaterialManager;
    private _materialsSubject = new BehaviorSubject<Map<string, MaterialInfo>>(new Map());
    private _materialPreviewsSubject = new BehaviorSubject<Map<string, string>>(new Map());

    constructor(private textureManager: TextureManagerAdapter) {
        this.materialManager = MaterialManager.getInstance();
        this.materialManager.setTextureManager(this.textureManager.getInternalManager());
        
        // Initialize subjects with current data
        this._materialsSubject.next(this.materialManager.materials);
        this._materialPreviewsSubject.next(this.materialManager.materialPreviews);

        // Subscribe to material updates from the manager
        this.materialManager.materialUpdated.subscribe((event) => {
            this._materialsSubject.next(this.materialManager.materials);
        });
    }

    get materials(): Map<string, MaterialInfo> {
        return this.materialManager.materials;
    }

    get materialsSubject(): Observable<Map<string, MaterialInfo>> {
        return this._materialsSubject.asObservable();
    }

    get materialPreviews(): Map<string, string> {
        return this.materialManager.materialPreviews;
    }

    get materialPreviewsSubject(): Observable<Map<string, string>> {
        return this._materialPreviewsSubject.asObservable();
    }

    getMaterial(uuid: string): Material | undefined {
        return this.materialManager.getMaterial(uuid);
    }

    getMaterialByName(name: string): { uuid: string, info: MaterialInfo } | null {
        return this.materialManager.getMaterialByName(name);
    }

    addMaterial(material: Material, name: string): string {
        return this.materialManager.addMaterial(material, name);
    }

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
    }): string {
        const material = new MeshStandardMaterial();
        material.name = name;

        if (properties.color !== undefined) material.color = new Color(properties.color);
        if (properties.roughness !== undefined) material.roughness = properties.roughness;
        if (properties.metalness !== undefined) material.metalness = properties.metalness;
        if (properties.transparent !== undefined) material.transparent = properties.transparent;
        if (properties.opacity !== undefined) material.opacity = properties.opacity;
        if (properties.side !== undefined) {
            switch (properties.side) {
                case 0: material.side = FrontSide; break;
                case 1: material.side = BackSide; break;
                case 2: material.side = DoubleSide; break;
            }
        }
        if (properties.flatShading !== undefined) material.flatShading = properties.flatShading;
        if (properties.wireframe !== undefined) material.wireframe = properties.wireframe;
        if (properties.alphaTest !== undefined) material.alphaTest = properties.alphaTest;
        if (properties.depthTest !== undefined) material.depthTest = properties.depthTest;
        if (properties.depthWrite !== undefined) material.depthWrite = properties.depthWrite;
        if (properties.emissiveColor !== undefined) material.emissive = new Color(properties.emissiveColor);
        if (properties.emissiveIntensity !== undefined) material.emissiveIntensity = properties.emissiveIntensity;

        // Handle texture assignments
        if (properties.map) material.map = this.textureManager.getTexture(properties.map);
        if (properties.normalMap) material.normalMap = this.textureManager.getTexture(properties.normalMap);
        if (properties.roughnessMap) material.roughnessMap = this.textureManager.getTexture(properties.roughnessMap);
        if (properties.metalnessMap) material.metalnessMap = this.textureManager.getTexture(properties.metalnessMap);
        if (properties.emissiveMap) material.emissiveMap = this.textureManager.getTexture(properties.emissiveMap);

        // Store texture UUIDs in userData
        material.userData = material.userData || {};
        material.userData.textureUuids = {
            map: properties.map,
            normalMap: properties.normalMap,
            roughnessMap: properties.roughnessMap,
            metalnessMap: properties.metalnessMap,
            emissiveMap: properties.emissiveMap
        };

        // Add the material to the manager and get its UUID
        const uuid = this.materialManager.addMaterial(material, name);
        
        // The materialUpdated event from MaterialManager will trigger the subscription
        // in the constructor, which will update the materialsSubject
        
        return uuid;
    }

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
        const material = this.getMaterial(uuid);
        if (!material || !(material instanceof MeshStandardMaterial)) return;

        if (properties.name !== undefined) material.name = properties.name;
        if (properties.color !== undefined) material.color = new Color(properties.color);
        if (properties.roughness !== undefined) material.roughness = properties.roughness;
        if (properties.metalness !== undefined) material.metalness = properties.metalness;
        if (properties.transparent !== undefined) material.transparent = properties.transparent;
        if (properties.opacity !== undefined) material.opacity = properties.opacity;
        if (properties.side !== undefined) {
            switch (properties.side) {
                case 0: material.side = FrontSide; break;
                case 1: material.side = BackSide; break;
                case 2: material.side = DoubleSide; break;
            }
        }
        if (properties.flatShading !== undefined) material.flatShading = properties.flatShading;
        if (properties.wireframe !== undefined) material.wireframe = properties.wireframe;
        if (properties.alphaTest !== undefined) material.alphaTest = properties.alphaTest;
        if (properties.depthTest !== undefined) material.depthTest = properties.depthTest;
        if (properties.depthWrite !== undefined) material.depthWrite = properties.depthWrite;
        if (properties.emissiveColor !== undefined) material.emissive = new Color(properties.emissiveColor);
        if (properties.emissiveIntensity !== undefined) material.emissiveIntensity = properties.emissiveIntensity;

        // Handle texture assignments and update userData
        material.userData = material.userData || {};
        material.userData.textureUuids = material.userData.textureUuids || {};

        if (properties.map !== undefined) {
            material.map = properties.map ? this.textureManager.getTexture(properties.map) : null;
            material.userData.textureUuids.map = properties.map;
        }
        if (properties.normalMap !== undefined) {
            material.normalMap = properties.normalMap ? this.textureManager.getTexture(properties.normalMap) : null;
            material.userData.textureUuids.normalMap = properties.normalMap;
        }
        if (properties.roughnessMap !== undefined) {
            material.roughnessMap = properties.roughnessMap ? this.textureManager.getTexture(properties.roughnessMap) : null;
            material.userData.textureUuids.roughnessMap = properties.roughnessMap;
        }
        if (properties.metalnessMap !== undefined) {
            material.metalnessMap = properties.metalnessMap ? this.textureManager.getTexture(properties.metalnessMap) : null;
            material.userData.textureUuids.metalnessMap = properties.metalnessMap;
        }
        if (properties.emissiveMap !== undefined) {
            material.emissiveMap = properties.emissiveMap ? this.textureManager.getTexture(properties.emissiveMap) : null;
            material.userData.textureUuids.emissiveMap = properties.emissiveMap;
        }

        material.needsUpdate = true;
        this._materialsSubject.next(this.materialManager.materials);
    }

    updateMaterialName(uuid: string, newName: string): boolean {
        return this.materialManager.updateMaterialName(uuid, newName);
    }

    releaseMaterial(uuid: string): void {
        this.materialManager.releaseMaterial(uuid);
        this._materialsSubject.next(this.materialManager.materials);
    }

    saveMaterialPreview(uuid: string, dataUrl: string): void {
        this.materialManager.saveMaterialPreview(uuid, dataUrl);
        this._materialPreviewsSubject.next(this.materialManager.materialPreviews);
    }

    getMaterialPreview(uuid: string): string | null {
        return this.materialManager.getMaterialPreview(uuid);
    }

    deleteMaterialPreview(uuid: string): void {
        this.materialManager.deleteMaterialPreview(uuid);
        this._materialPreviewsSubject.next(this.materialManager.materialPreviews);
    }

    findMaterialsUsingTexture(textureUuid: string): string[] {
        return this.materialManager.findMaterialsUsingTexture(textureUuid);
    }

    updateMaterialsUsingTexture(textureUuid: string): void {
        this.materialManager.updateMaterialsUsingTexture(textureUuid);
    }

    disposeAllMaterials(): void {
        this.materialManager.disposeAllMaterials();
        this._materialsSubject.next(new Map());
        this._materialPreviewsSubject.next(new Map());
    }

    getInternalManager(): MaterialManager {
        return this.materialManager;
    }
} 