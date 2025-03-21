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
    private materialsSubject = new BehaviorSubject<Map<string, MaterialInfo>>(new Map());

    constructor(private textureManager: TextureManagerAdapter) {
        this.materialManager = MaterialManager.getInstance();
        this.materialManager.setTextureManager(this.textureManager.getInternalManager());
        // Inicializar con los materiales actuales
        this.materialsSubject.next(this.materialManager.materials);
    }

    get materials(): Map<string, MaterialInfo> {
        return this.materialManager.materials;
    }

    get materialsObservable(): Observable<Map<string, MaterialInfo>> {
        return this.materialsSubject.asObservable();
    }

    private notifyMaterialChange() {
        this.materialsSubject.next(this.materialManager.materials);
    }

    get materialPreviews(): Map<string, string> {
        return this.materialManager.materialPreviews;
    }

    getMaterial(uuid: string): Material | undefined {
        return this.materialManager.getMaterial(uuid);
    }

    getMaterialByName(name: string): { uuid: string, info: MaterialInfo } | null {
        return this.materialManager.getMaterialByName(name);
    }

    addMaterial(material: Material, name: string): string {
        const uuid = this.materialManager.addMaterial(material, name);
        this.notifyMaterialChange();
        return uuid;
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
        
        const material = this.materialManager.createMaterial(name, properties);
        const uuid = this.materialManager.addMaterial(material, name);
        this.notifyMaterialChange();
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
        this.materialManager.updateMaterial(uuid, properties);
        this.notifyMaterialChange();
    }

    updateMaterialName(uuid: string, newName: string): boolean {
        return this.materialManager.updateMaterialName(uuid, newName);
    }

    releaseMaterial(uuid: string): void {
        this.materialManager.releaseMaterial(uuid);
        this.notifyMaterialChange();
    }

    saveMaterialPreview(uuid: string, dataUrl: string): void {
        this.materialManager.saveMaterialPreview(uuid, dataUrl);
    }

    getMaterialPreview(uuid: string): string | null {
        return this.materialManager.getMaterialPreview(uuid);
    }

    deleteMaterialPreview(uuid: string): void {
        this.materialManager.deleteMaterialPreview(uuid);
    }

    findMaterialsUsingTexture(textureUuid: string): string[] {
        return this.materialManager.findMaterialsUsingTexture(textureUuid);
    }

    updateMaterialsUsingTexture(textureUuid: string): void {
        this.materialManager.updateMaterialsUsingTexture(textureUuid);
    }

    disposeAllMaterials(): void {
        this.materialManager.disposeAllMaterials();
    }

    getInternalManager(): MaterialManager {
        return this.materialManager;
    }
} 