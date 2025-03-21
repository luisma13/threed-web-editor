import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TextureManager, TextureInfo } from '../../simple-engine/managers/texture-manager';
import { Texture, TextureEncoding, Wrapping } from 'three';
import { EventEmitter } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class TextureManagerAdapter {
    private textureManager: TextureManager;
    private texturesSubject = new BehaviorSubject<Map<string, TextureInfo>>(new Map());

    constructor() {
        this.textureManager = TextureManager.getInstance();
        // Inicializar con las texturas actuales
        this.texturesSubject.next(this.textureManager.textures);
    }

    get textures() {
        return this.textureManager.textures;
    }

    get texturesObservable(): Observable<Map<string, TextureInfo>> {
        return this.texturesSubject.asObservable();
    }

    private notifyTextureChange() {
        this.texturesSubject.next(this.textureManager.textures);
    }

    saveTexturePreview(uuid: string, dataUrl: string): void {
        this.textureManager.saveTexturePreview(uuid, dataUrl);
        this.notifyTextureChange();
    }

    getTexturePreview(uuid: string): string | null {
        return this.textureManager.getTexturePreview(uuid);
    }

    getTexturePreviewUrl(texture: Texture | null): string | null {
        return this.textureManager.getTexturePreviewUrl(texture);
    }

    updateTextureName(uuid: string, newName: string): boolean {
        return this.textureManager.updateTextureName(uuid, newName);
    }

    getTextureByName(name: string): { uuid: string, info: TextureInfo } | null {
        for (const [uuid, info] of this.textureManager.textures.entries()) {
            if (info.name === name) {
                return { uuid, info };
            }
        }
        return null;
    }

    async createTextureFromFile(file: File, options: {
        wrapS?: Wrapping;
        wrapT?: Wrapping;
        encoding?: TextureEncoding;
        generateMipmaps?: boolean;
        flipY?: boolean;
    } = {}, customFileName?: string): Promise<TextureInfo> {
        const texture = await this.textureManager.createTextureFromFile(file, options, customFileName);
        
        const textureEntry = Array.from(this.textures.entries())
            .find(([_, info]) => info.resource === texture);
            
        if (textureEntry) {
            this.notifyTextureChange();
            return textureEntry[1];
        }
        throw new Error('Texture was created but not found in manager');
    }

    async loadTexture(path: string, options: {
        wrapS?: Wrapping;
        wrapT?: Wrapping;
        encoding?: TextureEncoding;
        generateMipmaps?: boolean;
        flipY?: boolean;
    } = {}): Promise<Texture> {
        const texture = await this.textureManager.loadTexture(path, options);
        return texture;
    }

    releaseTexture(uuid: string): void {
        this.textureManager.releaseTexture(uuid);
        this.notifyTextureChange();
    }

    getTexture(uuid: string): Texture | undefined {
        return this.textureManager.getTexture(uuid);
    }

    disposeAllTextures(): void {
        this.textureManager.disposeAllTextures();
    }

    createAccessibleTextureImage(texture: Texture): void {
        this.textureManager.createAccessibleTextureImage(texture);
    }

    processTexturesBatch(textures: Texture[], modelName: string): void {
        this.textureManager.processTexturesBatch(textures, modelName);
    }

    async loadTextureFromUrl(url: string, options: {
        wrapS?: Wrapping;
        wrapT?: Wrapping;
        encoding?: TextureEncoding;
        generateMipmaps?: boolean;
        flipY?: boolean;
    } = {}): Promise<TextureInfo> {
        try {
            const texture = await this.loadTexture(url, options);
            const textureEntry = Array.from(this.textures.entries())
                .find(([_, info]) => info.resource === texture);
            
            if (textureEntry) {
                return textureEntry[1];
            }
            throw new Error('Texture was loaded but not found in manager');
        } catch (error) {
            console.error('Error loading texture from URL:', error);
            throw error;
        }
    }

    getInternalManager(): TextureManager {
        return this.textureManager;
    }
} 