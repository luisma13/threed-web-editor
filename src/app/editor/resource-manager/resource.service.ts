import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TextureLoader, Texture, Material, Wrapping, TextureEncoding, MeshStandardMaterial, Color, FrontSide, BackSide, DoubleSide, Side } from 'three';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TextureService, TextureInfo } from './texture.service';
import { MaterialService, MaterialInfo, MaterialPreview } from './material.service';

@Injectable({
    providedIn: 'root'
})
export class ResourceService {
    private isBrowser: boolean;

    constructor(
        public textureService: TextureService,
        private materialService: MaterialService,
        private snackBar: MatSnackBar,
        private http: HttpClient,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    // Texture delegation methods
    get textures() {
        return this.textureService.textures;
    }

    get texturesSubject() {
        return this.textureService.texturesSubject;
    }

    saveTexturePreview(uuid: string, dataUrl: string): void {
        this.textureService.saveTexturePreview(uuid, dataUrl);
    }
    
    getTexturePreview(uuid: string): string | null {
        return this.textureService.getTexturePreview(uuid);
    }
    
    getTexturePreviewUrl(texture: Texture | null): string | null {
        return this.textureService.getTexturePreviewUrl(texture);
    }
    
    updateTextureName(uuid: string, newName: string): boolean {
        return this.textureService.updateTextureName(uuid, newName);
    }
    
    getTextureByName(name: string): { uuid: string, info: TextureInfo } | null {
        return this.textureService.getTextureByName(name);
    }

    async createTextureFromFile(file: File, options: {
        wrapS?: Wrapping;
        wrapT?: Wrapping;
        encoding?: TextureEncoding;
        generateMipmaps?: boolean;
        flipY?: boolean;
    } = {}, customFileName?: string): Promise<Texture> {
        return this.textureService.createTextureFromFile(file, options, customFileName);
    }

    async loadTexture(path: string, options: {
        wrapS?: Wrapping;
        wrapT?: Wrapping;
        encoding?: TextureEncoding;
        generateMipmaps?: boolean;
        flipY?: boolean;
    } = {}): Promise<Texture> {
        return this.textureService.loadTexture(path, options);
    }

    releaseTexture(uuid: string): void {
        this.textureService.releaseTexture(uuid);
    }

    updateTexture(uuid: string, options: {
        wrapS?: Wrapping;
        wrapT?: Wrapping;
        encoding?: TextureEncoding;
        generateMipmaps?: boolean;
        flipY?: boolean;
    }): void {
        this.textureService.updateTexture(uuid, options);
    }

    async loadTextureFromUrl(url: string, options: {
            wrapS?: Wrapping;
            wrapT?: Wrapping;
            encoding?: TextureEncoding;
            generateMipmaps?: boolean;
            flipY?: boolean;
    } = {}, forceUniqueName: boolean = false): Promise<Texture> {
        return this.textureService.loadTextureFromUrl(url, options, forceUniqueName);
    }

    async updateTextureFromFile(uuid: string, file: File, options: {
        wrapS?: Wrapping;
        wrapT?: Wrapping;
        encoding?: TextureEncoding;
        generateMipmaps?: boolean;
        flipY?: boolean;
    } = {}): Promise<Texture> {
        return this.textureService.updateTextureFromFile(uuid, file, options);
    }

    async updateTextureFromUrl(uuid: string, url: string, options: {
        wrapS?: Wrapping;
        wrapT?: Wrapping;
        encoding?: TextureEncoding;
        generateMipmaps?: boolean;
        flipY?: boolean;
    } = {}): Promise<Texture> {
        return this.textureService.updateTextureFromUrl(uuid, url, options);
    }

    // Material delegation methods
    get materials() {
        return this.materialService.materials;
    }

    get materialsSubject() {
        return this.materialService.materialsSubject;
    }

    get materialPreviewsSubject() {
        return this.materialService.materialPreviewsSubject;
    }
    
    get materialPreviews() {
        return this.materialService.materialPreviews;
    }

    updateMaterialName(uuid: string, newName: string): boolean {
        return this.materialService.updateMaterialName(uuid, newName);
    }
    
    getMaterialByName(name: string): { uuid: string, info: MaterialInfo } | null {
        return this.materialService.getMaterialByName(name);
    }

    addMaterial(material: Material, name: string): string {
        return this.materialService.addMaterial(material, name);
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
    }): Material {
        return this.materialService.createMaterial(name, properties);
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
        this.materialService.updateMaterial(uuid, properties);
    }

    getMaterial(uuid: string): Material | undefined {
        return this.materialService.getMaterial(uuid);
    }

    releaseMaterial(uuid: string): void {
        this.materialService.releaseMaterial(uuid);
    }

    saveMaterialPreview(uuid: string, dataUrl: string): void {
        this.materialService.saveMaterialPreview(uuid, dataUrl);
    }
    
    getMaterialPreview(uuid: string): string | null {
        return this.materialService.getMaterialPreview(uuid);
    }
    
    deleteMaterialPreview(uuid: string): void {
        this.materialService.deleteMaterialPreview(uuid);
    }

    findMaterialsUsingTexture(textureUuid: string): string[] {
        return this.materialService.findMaterialsUsingTexture(textureUuid);
    }
    
    updateMaterialsUsingTexture(textureUuid: string): void {
        // Asegurarse de que la textura existe antes de intentar actualizar los materiales
        const texture = this.textureService.getTexture(textureUuid);
        if (!texture) {
            console.warn(`Texture with UUID ${textureUuid} not found in ResourceService.updateMaterialsUsingTexture`);
            return;
        }
        
        // Delegar al MaterialService
        this.materialService.updateMaterialsUsingTexture(textureUuid);
    }

    /**
     * Libera todos los recursos cuando el servicio es destruido
     */
    public disposeAllResources(): void {
        if (!this.isBrowser) return;
        
        console.log('Disposing all resources in ResourceService');
        
        // Delegar la liberación de recursos a los servicios correspondientes
        this.textureService.disposeAllTextures();
        this.materialService.disposeAllMaterials();
    }
} 