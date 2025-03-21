import { 
    Texture, 
    TextureLoader, 
    TextureEncoding, 
    Wrapping 
} from 'three';
import { SimpleEventEmitter } from '../utils/event-emitter';
import { PreviewRenderer } from '../services/preview-renderer';

/**
 * Interface for texture information
 */
export interface TextureInfo {
    resource: Texture;
    refCount: number;
    name: string;
    uuid: string;
}

/**
 * Interface for texture preview data
 */
export interface TexturePreview {
    dataUrl: string;
    timestamp: number;
}

/**
 * Interface for texture update event data
 */
export interface TextureUpdateEvent {
    uuid: string;
    oldTexture: Texture;
    newTexture: Texture;
}

export class TextureManager {
    private static instance: TextureManager;
    private _textures = new Map<string, TextureInfo>();
    private _textureLoader = new TextureLoader();
    private _blobUrls = new Map<string, string>();
    private _texturePreviewsMap = new Map<string, TexturePreview>();
    private previewRenderer: PreviewRenderer;
    
    // Event emitter for texture updates
    textureUpdated = new SimpleEventEmitter<TextureUpdateEvent>();

    private constructor() {
        this.previewRenderer = PreviewRenderer.getInstance();
    }

    /**
     * Get the singleton instance of TextureManager
     */
    public static getInstance(): TextureManager {
        if (!TextureManager.instance) {
            TextureManager.instance = new TextureManager();
        }
        return TextureManager.instance;
    }

    /**
     * Get all textures
     */
    get textures(): Map<string, TextureInfo> {
        return this._textures;
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
     * Save a texture preview
     */
    saveTexturePreview(uuid: string, dataUrl: string): void {
        this._texturePreviewsMap.set(uuid, {
            dataUrl,
            timestamp: Date.now()
        });
    }

    /**
     * Get a texture preview
     */
    getTexturePreview(uuid: string): string | null {
        return this._texturePreviewsMap.get(uuid)?.dataUrl || null;
    }

    /**
     * Get preview URL for a texture
     */
    getTexturePreviewUrl(texture: Texture | null): string | null {
        if (!texture) return null;

        if (texture.image && texture.image.src) {
            return texture.image.src;
        }

        if (texture.uuid) {
            const cachedUrl = this.getTexturePreview(texture.uuid);
            if (cachedUrl) return cachedUrl;
        }

        return null;
    }

    /**
     * Update texture name
     */
    updateTextureName(uuid: string, newName: string): boolean {
        if (this._textures.has(uuid)) {
            const textureInfo = this._textures.get(uuid)!;
            textureInfo.name = newName;
            textureInfo.resource.name = newName;
            return true;
        }
        return false;
    }

    /**
     * Get texture by name
     */
    getTextureByName(name: string): { uuid: string, info: TextureInfo } | null {
        for (const [uuid, info] of this._textures.entries()) {
            if (info.name === name) {
                return { uuid, info };
            }
        }
        return null;
    }

    /**
     * Create a texture from a File object
     */
    async createTextureFromFile(file: File, options: {
        wrapS?: Wrapping;
        wrapT?: Wrapping;
        encoding?: TextureEncoding;
        generateMipmaps?: boolean;
        flipY?: boolean;
    } = {}, customFileName?: string): Promise<Texture> {
        const fileName = customFileName || file.name;
        const uuid = this.generateUUID();
        const blobUrl = URL.createObjectURL(file);

        try {
            const texture = await this._textureLoader.loadAsync(blobUrl);
            texture.name = fileName;

            // Apply options
            if (options.wrapS !== undefined) texture.wrapS = options.wrapS;
            if (options.wrapT !== undefined) texture.wrapT = options.wrapT;
            if (options.encoding !== undefined) texture.encoding = options.encoding;
            if (options.generateMipmaps !== undefined) texture.generateMipmaps = options.generateMipmaps;
            if (options.flipY !== undefined) texture.flipY = options.flipY;

            // Store the texture
            this._textures.set(uuid, {
                resource: texture,
                refCount: 1,
                name: fileName,
                uuid: uuid
            });

            // Generate preview immediately after texture is loaded
            if (texture.image) {
                this.createAccessibleTextureImage(texture);
            }

            // Store blob URL for cleanup
            this._blobUrls.set(uuid, blobUrl);

            return texture;
        } catch (error) {
            URL.revokeObjectURL(blobUrl);
            throw error;
        }
    }

    /**
     * Load a texture from a URL
     */
    async loadTexture(path: string, options: {
        wrapS?: Wrapping;
        wrapT?: Wrapping;
        encoding?: TextureEncoding;
        generateMipmaps?: boolean;
        flipY?: boolean;
    } = {}): Promise<Texture> {
        // Check if texture already exists
        for (const [uuid, textureInfo] of this._textures.entries()) {
            if (textureInfo.resource.name === path) {
                textureInfo.refCount++;
                return textureInfo.resource;
            }
        }

        const isBlob = path.startsWith('blob:');
        const textureName = isBlob ? `texture_${Date.now()}` : path;
        const uuid = this.generateUUID();

        try {
            const texture = await this._textureLoader.loadAsync(path);
            texture.name = textureName;

            // Apply options
            if (options.wrapS !== undefined) texture.wrapS = options.wrapS;
            if (options.wrapT !== undefined) texture.wrapT = options.wrapT;
            if (options.encoding !== undefined) texture.encoding = options.encoding;
            if (options.generateMipmaps !== undefined) texture.generateMipmaps = options.generateMipmaps;
            if (options.flipY !== undefined) texture.flipY = options.flipY;

            // Store texture
            this._textures.set(uuid, {
                resource: texture,
                refCount: 1,
                name: textureName,
                uuid: uuid
            });

            // Generate preview immediately after texture is loaded
            if (texture.image) {
                this.createAccessibleTextureImage(texture);
            }

            if (isBlob) {
                this._blobUrls.set(uuid, path);
            }

            return texture;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Release a texture
     */
    releaseTexture(uuid: string): void {
        const textureInfo = this._textures.get(uuid);
        if (!textureInfo) return;

        textureInfo.refCount--;
        if (textureInfo.refCount <= 0) {
            textureInfo.resource.dispose();
            this._textures.delete(uuid);

            if (this._blobUrls.has(uuid)) {
                URL.revokeObjectURL(this._blobUrls.get(uuid)!);
                this._blobUrls.delete(uuid);
            }
        }
    }

    /**
     * Create an accessible image for a texture
     */
    createAccessibleTextureImage(texture: Texture): void {
        if (!texture.image) {
            console.warn('No image in texture');
            return;
        }

        try {
            const dataUrl = this.previewRenderer.createTexturePreview(texture);

            // Find the UUID for this texture
            let textureUuid: string | undefined;
            for (const [uuid, info] of this._textures.entries()) {
                if (info.resource === texture) {
                    textureUuid = uuid;
                    break;
                }
            }

            if (!textureUuid) {
                console.warn('Could not find UUID for texture when saving preview');
                return;
            }

            this.saveTexturePreview(textureUuid, dataUrl);
            console.log('Preview created for texture:', textureUuid);
        } catch (e) {
            console.error('Error creating accessible image for texture:', e);
        }
    }

    /**
     * Get a texture by UUID
     */
    getTexture(uuid: string): Texture | undefined {
        const info = this._textures.get(uuid);
        if (info) {
            info.refCount++;
            return info.resource;
        }
        return undefined;
    }

    /**
     * Dispose all textures
     */
    disposeAllTextures(): void {
        // Dispose all textures
        this._textures.forEach((textureInfo, uuid) => {
            textureInfo.resource.dispose();
            if (this._blobUrls.has(uuid)) {
                URL.revokeObjectURL(this._blobUrls.get(uuid)!);
            }
        });

        // Clear all maps
        this._textures.clear();
        this._blobUrls.clear();
        this._texturePreviewsMap.clear();
    }

    /**
     * Process a batch of textures efficiently
     */
    processTexturesBatch(textures: Texture[], modelName: string): void {
        const MAX_TEXTURES_PER_FRAME = 5;

        const processBatch = (startIndex: number) => {
            if (startIndex >= textures.length) return;

            const endIndex = Math.min(startIndex + MAX_TEXTURES_PER_FRAME, textures.length);

            for (let i = startIndex; i < endIndex; i++) {
                const texture = textures[i];

                if (!texture.name) {
                    texture.name = `${modelName}_Texture_${i + 1}`;
                }

                // Generate preview for each texture in the batch
                if (texture.image) {
                    this.createAccessibleTextureImage(texture);
                }
            }

            if (endIndex < textures.length) {
                requestAnimationFrame(() => processBatch(endIndex));
            }
        };

        processBatch(0);
    }

    /**
     * Add an existing texture to the manager
     * @param texture Texture to add
     * @param name Name for the texture
     * @returns UUID of the added texture
     */
    addTexture(texture: Texture, name: string): string {
        // Check if texture is already managed
        for (const [uuid, textureInfo] of this._textures.entries()) {
            if (textureInfo.resource === texture) {
                textureInfo.refCount++;
                return uuid;
            }
        }

        const uuid = this.generateUUID();
        
        // Store the texture
        this._textures.set(uuid, {
            resource: texture,
            refCount: 1,
            name: name,
            uuid: uuid
        });

        // Create preview if needed
        if (texture.image) {
            this.createAccessibleTextureImage(texture);
        }

        return uuid;
    }
} 