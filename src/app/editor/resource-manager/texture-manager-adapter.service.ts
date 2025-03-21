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
    private _texturesSubject = new BehaviorSubject<Map<string, TextureInfo>>(new Map());
    
    // Angular EventEmitter for texture updates
    textureUpdated = new EventEmitter<{uuid: string, oldTexture: Texture, newTexture: Texture}>();

    constructor() {
        this.textureManager = TextureManager.getInstance();
        
        // Subscribe to texture manager updates and forward them to Angular
        this.textureManager.textureUpdated.subscribe((event) => {
            this.textureUpdated.emit(event);
        });

        // Initialize the BehaviorSubject with current textures
        this._texturesSubject.next(this.textureManager.textures);
    }

    get textures() {
        return this.textureManager.textures;
    }

    get texturesSubject(): Observable<Map<string, TextureInfo>> {
        return this._texturesSubject.asObservable();
    }

    saveTexturePreview(uuid: string, dataUrl: string): void {
        this.textureManager.saveTexturePreview(uuid, dataUrl);
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
        this._texturesSubject.next(this.textureManager.textures);
        
        const textureEntry = Array.from(this.textures.entries())
            .find(([_, info]) => info.resource === texture);
            
        if (textureEntry) {
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
        this._texturesSubject.next(this.textureManager.textures);
        return texture;
    }

    releaseTexture(uuid: string): void {
        this.textureManager.releaseTexture(uuid);
        this._texturesSubject.next(this.textureManager.textures);
    }

    getTexture(uuid: string): Texture | undefined {
        return this.textureManager.getTexture(uuid);
    }

    disposeAllTextures(): void {
        this.textureManager.disposeAllTextures();
        this._texturesSubject.next(this.textureManager.textures);
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