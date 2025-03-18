import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TextureLoader, Texture, Wrapping, TextureEncoding } from 'three';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EventEmitter } from '@angular/core';

export interface TextureInfo {
    resource: Texture;
    refCount: number;
    name: string;
    uuid: string;
}

@Injectable({
    providedIn: 'root'
})
export class TextureService {
    private _textures = new Map<string, TextureInfo>();
    private _textureLoader = new TextureLoader();
    private _blobUrls = new Map<string, string>(); // Map to track blob URLs
    
    // Mapa para almacenar las previsualizaciones de las texturas
    private _texturePreviewsMap = new Map<string, string>();

    // Observable maps for UI updates
    private _texturesSubject = new BehaviorSubject<Map<string, TextureInfo>>(this._textures);
    
    // Event emitter para notificar cuando una textura ha sido actualizada
    textureUpdated = new EventEmitter<{uuid: string, oldTexture: Texture, newTexture: Texture}>();
    
    private isBrowser: boolean;

    get textures() {
        return this._textures;
    }

    get texturesSubject() {
        return this._texturesSubject;
    }

    constructor(
        private snackBar: MatSnackBar,
        private http: HttpClient,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    // Método para generar un UUID
    generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    /**
     * Guarda una previsualización de textura
     * @param uuid UUID de la textura
     * @param dataUrl URL de datos de la previsualización
     */
    saveTexturePreview(uuid: string, dataUrl: string): void {
        // Almacenar la URL de datos en un mapa privado
        this._texturePreviewsMap.set(uuid, dataUrl);
    }
    
    /**
     * Obtiene la previsualización de una textura
     * @param uuid UUID de la textura
     * @returns URL de datos de la previsualización o null si no existe
     */
    getTexturePreview(uuid: string): string | null {
        return this._texturePreviewsMap.get(uuid) || null;
    }
    
    /**
     * Obtiene la URL de previsualización para una textura
     * @param texture Textura para la que obtener la URL de previsualización
     * @returns URL de previsualización o null si no se puede generar
     */
    getTexturePreviewUrl(texture: Texture | null): string | null {
        if (!texture) return null;
        
        // Si la textura tiene una imagen con src, usarla directamente
        if (texture.image && texture.image.src) {
            return texture.image.src;
        }
        
        // Si la textura tiene una propiedad uuid, intentar usar una URL en caché
        if (texture.uuid) {
            const cachedUrl = this.getTexturePreview(texture.uuid);
            if (cachedUrl) return cachedUrl;
        }
        
        // Si no hay previsualización, devolver null
        return null;
    }
    
    // Método para actualizar el nombre de una textura
    updateTextureName(uuid: string, newName: string): boolean {
        if (this._textures.has(uuid)) {
            const textureInfo = this._textures.get(uuid)!;
            textureInfo.name = newName;
            textureInfo.resource.name = newName; // Actualizar también el nombre en el recurso
            this._texturesSubject.next(new Map(this._textures));
            return true;
        }
        return false;
    }
    
    // Método para obtener una textura por su nombre
    getTextureByName(name: string): { uuid: string, info: TextureInfo } | null {
        for (const [uuid, info] of this._textures.entries()) {
            if (info.name === name) {
                return { uuid, info };
            }
        }
        return null;
    }

    /**
     * Creates a texture from a File object
     * @param file The file to create a texture from
     * @param options Texture options
     * @param customFileName Optional custom name for the texture (if not provided, uses file.name)
     * @returns Promise with the created texture
     */
    async createTextureFromFile(file: File, options: {
        wrapS?: Wrapping;
        wrapT?: Wrapping;
        encoding?: TextureEncoding;
        generateMipmaps?: boolean;
        flipY?: boolean;
    } = {}, customFileName?: string): Promise<Texture> {
        if (!this.isBrowser) {
            throw new Error('Cannot create texture from file in non-browser environment');
        }
        
        // Use custom file name if provided, otherwise use the original file name
        const fileName = customFileName || file.name;
        const uuid = this.generateUUID();
        
        // Create a blob URL for the file
        const blobUrl = URL.createObjectURL(file);
        
        try {
            // Load the texture from the blob URL
            const texture = await this._textureLoader.loadAsync(blobUrl);
            
            // Set the name to the file name for reference
            texture.name = fileName;
            
            // Apply options
            if (options.wrapS !== undefined) texture.wrapS = options.wrapS;
            if (options.wrapT !== undefined) texture.wrapT = options.wrapT;
            if (options.encoding !== undefined) texture.encoding = options.encoding;
            if (options.generateMipmaps !== undefined) texture.generateMipmaps = options.generateMipmaps;
            if (options.flipY !== undefined) texture.flipY = options.flipY;

            // Create preview immediately
            if (texture.image) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                if (ctx) {
                    const maxSize = 128;
                    let width = maxSize;
                    let height = maxSize;
                    
                    if (texture.image instanceof HTMLImageElement || texture.image instanceof HTMLCanvasElement) {
                        width = Math.min(texture.image.width || 64, maxSize);
                        height = Math.min(texture.image.height || 64, maxSize);
                    } else if (texture.image instanceof ImageBitmap) {
                        width = Math.min(texture.image.width, maxSize);
                        height = Math.min(texture.image.height, maxSize);
                    } else if (texture.image instanceof ImageData) {
                        width = Math.min(texture.image.width, maxSize);
                        height = Math.min(texture.image.height, maxSize);
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    try {
                        if (texture.image instanceof HTMLImageElement || texture.image instanceof HTMLCanvasElement) {
                            ctx.drawImage(texture.image, 0, 0, width, height);
                        } else if (texture.image instanceof ImageBitmap) {
                            ctx.drawImage(texture.image, 0, 0, width, height);
                        } else if (texture.image instanceof ImageData) {
                            ctx.putImageData(texture.image, 0, 0);
                        }
                        
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                        this.saveTexturePreview(uuid, dataUrl);
                        console.log('Preview created and saved for new texture:', uuid);
                    } catch (e) {
                        console.error('Error creating preview for new texture:', e);
                    }
                }
            }
            
            // Store the texture with the UUID as the key
            this._textures.set(uuid, {
                resource: texture,
                refCount: 1,
                name: fileName,
                uuid: uuid
            });
            
            // Store the blob URL for cleanup later
            this._blobUrls.set(uuid, blobUrl);
            
            this._texturesSubject.next(this._textures);
            return texture;
        } catch (error) {
            // Clean up the blob URL if there's an error
            URL.revokeObjectURL(blobUrl);
            console.error('Error creating texture from file:', error);
            throw error;
        }
    }

    async loadTexture(path: string, options: {
        wrapS?: Wrapping;
        wrapT?: Wrapping;
        encoding?: TextureEncoding;
        generateMipmaps?: boolean;
        flipY?: boolean;
    } = {}): Promise<Texture> {
        if (!this.isBrowser) {
            throw new Error('Cannot load texture in non-browser environment');
        }
        
        // Check if texture already exists
        if (this._textures.has(path)) {
            const textureInfo = this._textures.get(path)!;
            textureInfo.refCount++;
            this._texturesSubject.next(this._textures);
            return textureInfo.resource;
        }

        // Check if path is a blob URL (starts with blob:)
        const isBlob = path.startsWith('blob:');
        const textureName = isBlob ? `texture_${Date.now()}` : path;
        const uuid = this.generateUUID();

        // Load new texture
        try {
            const texture = await this._textureLoader.loadAsync(path);
            
            // Set name for reference
            texture.name = textureName;

            // Apply options
            if (options.wrapS !== undefined) texture.wrapS = options.wrapS;
            if (options.wrapT !== undefined) texture.wrapT = options.wrapT;
            if (options.encoding !== undefined) texture.encoding = options.encoding;
            if (options.generateMipmaps !== undefined) texture.generateMipmaps = options.generateMipmaps;
            if (options.flipY !== undefined) texture.flipY = options.flipY;

            // Create preview immediately
            if (texture.image) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                if (ctx) {
                    const maxSize = 128;
                    let width = maxSize;
                    let height = maxSize;
                    
                    if (texture.image instanceof HTMLImageElement || texture.image instanceof HTMLCanvasElement) {
                        width = Math.min(texture.image.width || 64, maxSize);
                        height = Math.min(texture.image.height || 64, maxSize);
                    } else if (texture.image instanceof ImageBitmap) {
                        width = Math.min(texture.image.width, maxSize);
                        height = Math.min(texture.image.height, maxSize);
                    } else if (texture.image instanceof ImageData) {
                        width = Math.min(texture.image.width, maxSize);
                        height = Math.min(texture.image.height, maxSize);
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    try {
                        if (texture.image instanceof HTMLImageElement || texture.image instanceof HTMLCanvasElement) {
                            ctx.drawImage(texture.image, 0, 0, width, height);
                        } else if (texture.image instanceof ImageBitmap) {
                            ctx.drawImage(texture.image, 0, 0, width, height);
                        } else if (texture.image instanceof ImageData) {
                            ctx.putImageData(texture.image, 0, 0);
                        }
                        
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                        this.saveTexturePreview(uuid, dataUrl);
                        console.log('Preview created and saved for loaded texture:', uuid);
                    } catch (e) {
                        console.error('Error creating preview for loaded texture:', e);
                    }
                }
            }

            // Store texture
            this._textures.set(uuid, {
                resource: texture,
                refCount: 1,
                name: textureName,
                uuid: uuid
            });
            
            // If it's a blob URL, store it for cleanup
            if (isBlob) {
                this._blobUrls.set(uuid, path);
            }

            this._texturesSubject.next(this._textures);
            return texture;
        } catch (error) {
            console.error('Error loading texture:', error);
            throw error;
        }
    }

    releaseTexture(uuid: string): void {
        const textureInfo = this._textures.get(uuid);
        if (!textureInfo) return;

        textureInfo.refCount--;
        if (textureInfo.refCount <= 0) {
            textureInfo.resource.dispose();
            this._textures.delete(uuid);
            
            // Revoke blob URL if it exists
            if (this._blobUrls.has(uuid)) {
                URL.revokeObjectURL(this._blobUrls.get(uuid)!);
                this._blobUrls.delete(uuid);
            }
        }

        this._texturesSubject.next(this._textures);
    }

    /**
     * Aplica opciones a una textura
     * @param texture Textura a la que aplicar las opciones
     * @param options Opciones a aplicar
     * @private
     */
    private applyTextureOptions(
        texture: Texture, 
        options: {
            wrapS?: Wrapping;
            wrapT?: Wrapping;
            encoding?: TextureEncoding;
            generateMipmaps?: boolean;
            flipY?: boolean;
        }
    ): void {
        
        // Aplicar opciones
        if (options.wrapS !== undefined) {
            texture.wrapS = options.wrapS;
        }
        
        if (options.wrapT !== undefined) {
            texture.wrapT = options.wrapT;
        }
        
        if (options.encoding !== undefined) {
            // Forzar la actualización de la codificación estableciéndola explícitamente
            
            // En Three.js, algunas propiedades necesitan un manejo especial
            // Para la codificación, necesitamos asegurarnos de que se establezca correctamente
            Object.defineProperty(texture, 'encoding', {
                value: options.encoding,
                writable: true,
                configurable: true
            });
        }
        
        if (options.generateMipmaps !== undefined) {
            texture.generateMipmaps = options.generateMipmaps;
        }
        
        if (options.flipY !== undefined) {
            texture.flipY = options.flipY;
        }
        
        // Siempre marcar la textura como necesitada de actualización
        texture.needsUpdate = true;
    }

    /**
     * Método común para actualizar una textura y notificar a los observadores
     * @param uuid Clave de la textura en el mapa
     * @param texture Nueva textura o textura actualizada
     * @param textureInfo Información de la textura existente
     * @param blobUrl URL del blob si existe (para almacenar o revocar)
     * @private
     */
    private updateTextureCommon(
        uuid: string, 
        texture: Texture, 
        textureInfo: TextureInfo,
        blobUrl?: string
    ): void {
        // Guardar la textura anterior para actualizar referencias
        const oldTexture = textureInfo.resource;
        
        // Actualizar la textura en el mapa con la misma clave
        this._textures.set(uuid, {
            resource: texture,
            refCount: textureInfo.refCount,
            name: textureInfo.name,
            uuid: textureInfo.uuid
        });
        
        // Almacenar la URL del blob si se proporciona
        if (blobUrl) {
            this._blobUrls.set(uuid, blobUrl);
        }
        
        // Notificar a los suscriptores
        this._texturesSubject.next(new Map(this._textures));
        
        // Emitir evento para notificar que la textura ha sido actualizada
        // Esto permitirá al MaterialService actualizar los materiales que usan esta textura
        this.textureUpdated.emit({
            uuid: textureInfo.uuid,
            oldTexture: oldTexture,
            newTexture: texture
        });
    }

    /**
     * Actualiza las propiedades de una textura existente
     * @param uuid Clave de la textura en el mapa
     * @param options Opciones de la textura a actualizar
     */
    updateTexture(uuid: string, options: {
        wrapS?: Wrapping;
        wrapT?: Wrapping;
        encoding?: TextureEncoding;
        generateMipmaps?: boolean;
        flipY?: boolean;
    }): void {
        const textureInfo = this._textures.get(uuid);
        if (!textureInfo) {
            console.error(`Texture not found: ${uuid}`);
            return;
        }

        const texture = textureInfo.resource;
        
        // Aplicar opciones a la textura
        this.applyTextureOptions(texture, options);
        
        // Usar el método común para actualizar la textura y notificar
        this.updateTextureCommon(uuid, texture, textureInfo);
    }

    /**
     * Carga una textura desde una URL
     * @param url URL de la textura a cargar
     * @param options Opciones de la textura
     * @param forceUniqueName Si es true, genera un nombre único para la textura
     * @returns Promise con la textura cargada
     */
    async loadTextureFromUrl(url: string, options: {
        wrapS?: Wrapping;
        wrapT?: Wrapping;
        encoding?: TextureEncoding;
        generateMipmaps?: boolean;
        flipY?: boolean;
    } = {}, forceUniqueName: boolean = false): Promise<Texture> {
        if (!this.isBrowser) {
            throw new Error('Cannot load texture in non-browser environment');
        }
        
        // Extraer el nombre del archivo de la URL
        const urlParts = url.split('/');
        let fileName = urlParts[urlParts.length - 1] || `texture_${Date.now()}.jpg`;
        
        // Si se solicita un nombre único, añadir timestamp
        if (forceUniqueName) {
            const nameParts = fileName.split('.');
            const extension = nameParts.pop() || 'jpg';
            const baseName = nameParts.join('.');
            fileName = `${baseName}_${Date.now()}.${extension}`;
            console.log(`Generando nombre único para textura: ${fileName}`);
        }
        
        const uuid = this.generateUUID();
        
        // Comprobar si la textura ya existe
        if (this._textures.has(fileName) && !forceUniqueName) {
            const textureInfo = this._textures.get(fileName)!;
            textureInfo.refCount++;
            this._texturesSubject.next(this._textures);
            return textureInfo.resource;
        }
        
        // Cargar nueva textura
        try {
            const texture = await this._textureLoader.loadAsync(url);
            
            // Establecer nombre para referencia
            texture.name = fileName;
            
            // Aplicar opciones
            if (options.wrapS !== undefined) texture.wrapS = options.wrapS;
            if (options.wrapT !== undefined) texture.wrapT = options.wrapT;
            if (options.encoding !== undefined) texture.encoding = options.encoding;
            if (options.generateMipmaps !== undefined) texture.generateMipmaps = options.generateMipmaps;
            if (options.flipY !== undefined) texture.flipY = options.flipY;
            
            // Almacenar textura
            this._textures.set(uuid, {
                resource: texture,
                refCount: 1,
                name: fileName,
                uuid: uuid
            });
            
            this._texturesSubject.next(this._textures);
            return texture;
        } catch (error) {
            console.error('Error loading texture from URL:', error);
            throw error;
        }
    }

    /**
     * Actualiza una textura existente con un nuevo archivo
     * @param uuid Clave de la textura en el mapa
     * @param file Nuevo archivo para la textura
     * @param options Opciones de la textura
     * @returns Promise con la textura actualizada
     */
    async updateTextureFromFile(uuid: string, file: File, options: {
        wrapS?: Wrapping;
        wrapT?: Wrapping;
        encoding?: TextureEncoding;
        generateMipmaps?: boolean;
        flipY?: boolean;
    } = {}): Promise<Texture> {
        if (!this.isBrowser) {
            throw new Error('Cannot update texture from file in non-browser environment');
        }
        
        // Verificar si la textura existe
        const textureInfo = this._textures.get(uuid);
        if (!textureInfo) {
            console.error(`Texture not found: ${uuid}`);
            throw new Error(`Texture not found: ${uuid}`);
        }
        
        // Revocar la URL del blob anterior si existe
        if (this._blobUrls.has(uuid)) {
            console.log(`Revocando blob URL anterior para ${uuid}: ${this._blobUrls.get(uuid)}`);
            URL.revokeObjectURL(this._blobUrls.get(uuid)!);
        }
        
        // Crear una nueva URL de blob para el archivo
        const blobUrl = URL.createObjectURL(file);
        console.log(`Creado nuevo blob URL para ${uuid}: ${blobUrl}`);
        
        try {
            // Cargar la textura desde la URL del blob
            const texture = await this._textureLoader.loadAsync(blobUrl);
            
            // Establecer el nombre para preservar el nombre original de la textura
            texture.name = textureInfo.name;
            
            // Aplicar opciones a la textura
            this.applyTextureOptions(texture, options);
            
            // Asegurarse de que la imagen tenga una propiedad src válida
            if (texture.image && !texture.image.src) {
                texture.image.src = blobUrl;
            }
            
            // Liberar la textura anterior
            textureInfo.resource.dispose();
            
            // Usar el método común para actualizar la textura y notificar
            this.updateTextureCommon(uuid, texture, textureInfo, blobUrl);
            
            return texture;
        } catch (error) {
            // Limpiar la URL del blob si hay un error
            URL.revokeObjectURL(blobUrl);
            console.error('Error updating texture from file:', error);
            throw error;
        }
    }

    /**
     * Actualiza una textura existente con una nueva URL
     * @param uuid Clave de la textura en el mapa
     * @param url Nueva URL para la textura
     * @param options Opciones de la textura
     * @returns Promise con la textura actualizada
     */
    async updateTextureFromUrl(uuid: string, url: string, options: {
        wrapS?: Wrapping;
        wrapT?: Wrapping;
        encoding?: TextureEncoding;
        generateMipmaps?: boolean;
        flipY?: boolean;
    } = {}): Promise<Texture> {
        if (!this.isBrowser) {
            throw new Error('Cannot update texture from URL in non-browser environment');
        }
        
        // Verificar si la textura existe
        const textureInfo = this._textures.get(uuid);
        if (!textureInfo) {
            console.error(`Texture not found: ${uuid}`);
            throw new Error(`Texture not found: ${uuid}`);
        }
        
        // Revocar la URL del blob anterior si existe
        if (this._blobUrls.has(uuid)) {
            console.log(`Revocando blob URL anterior para ${uuid}: ${this._blobUrls.get(uuid)}`);
            URL.revokeObjectURL(this._blobUrls.get(uuid)!);
            this._blobUrls.delete(uuid);
        }
        
        try {
            // Cargar la textura desde la URL
            const texture = await this._textureLoader.loadAsync(url);
            
            // Establecer el nombre para preservar el nombre original de la textura
            texture.name = textureInfo.name;
            
            // Aplicar opciones a la textura
            this.applyTextureOptions(texture, options);
            
            // Asegurarse de que la imagen tenga una propiedad src válida
            if (texture.image && !texture.image.src) {
                texture.image.src = url;
            }
            
            // Liberar la textura anterior
            textureInfo.resource.dispose();
            
            // Usar el método común para actualizar la textura y notificar
            this.updateTextureCommon(uuid, texture, textureInfo);
            
            return texture;
        } catch (error) {
            console.error('Error updating texture from URL:', error);
            throw error;
        }
    }

    /**
     * Libera todos los recursos de texturas
     */
    disposeAllTextures(): void {
        if (!this.isBrowser) return;
        
        console.log('Disposing all textures in TextureService');
        
        // Liberar todas las texturas
        this.textures.forEach((textureInfo, uuid) => {
            console.log(`Disposing texture: ${uuid}`);
            if (textureInfo.resource instanceof Texture) {
                textureInfo.resource.dispose();
            }
            
            // Revocar URL de blob si existe
            if (this._blobUrls.has(uuid)) {
                URL.revokeObjectURL(this._blobUrls.get(uuid)!);
                this._blobUrls.delete(uuid);
            }
        });
        this.textures.clear();
        
        // Notificar a los suscriptores
        this._texturesSubject.next(this.textures);
    }

    /**
     * Obtiene una textura por su UUID
     * @param uuid UUID de la textura
     * @returns La textura o undefined si no existe
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
     * Crea una imagen accesible para una textura
     * @param texture Textura para la que crear una imagen accesible
     */
    createAccessibleTextureImage(texture: Texture): void {
        if (!texture.image) {
            console.warn('No image in texture');
            return;
        }

        try {
            // Si la textura ya tiene una imagen con src, no hacer nada
            if (texture.image.src) {
                console.log('Texture already has src:', texture.image.src);
                return;
            }

            // Verificar si ya existe una previsualización en caché
            if (texture.uuid && this.getTexturePreview(texture.uuid)) {
                console.log('Preview already exists in cache for texture:', texture.uuid);
                return;
            }

            // Crear un canvas y obtener su contexto
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                console.warn('Could not get 2D context');
                return;
            }

            // Establecer el tamaño del canvas (limitar a un tamaño máximo para mejorar rendimiento)
            const maxSize = 128;
            let width = maxSize;
            let height = maxSize;

            // Obtener las dimensiones correctas según el tipo de imagen
            if (texture.image instanceof HTMLImageElement || texture.image instanceof HTMLCanvasElement) {
                width = Math.min(texture.image.width || 64, maxSize);
                height = Math.min(texture.image.height || 64, maxSize);
            } else if (texture.image instanceof ImageBitmap) {
                width = Math.min(texture.image.width, maxSize);
                height = Math.min(texture.image.height, maxSize);
            } else if (texture.image instanceof ImageData) {
                width = Math.min(texture.image.width, maxSize);
                height = Math.min(texture.image.height, maxSize);
            }

            canvas.width = width;
            canvas.height = height;

            // Dibujar la imagen en el canvas según su tipo
            if (texture.image instanceof HTMLImageElement || texture.image instanceof HTMLCanvasElement) {
                ctx.drawImage(texture.image, 0, 0, width, height);
            } else if (texture.image instanceof ImageBitmap) {
                ctx.drawImage(texture.image, 0, 0, width, height);
                
                // Crear y guardar la URL de datos inmediatamente
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                if (texture.uuid) {
                    console.log('Saving preview for ImageBitmap texture:', texture.uuid);
                    this.saveTexturePreview(texture.uuid, dataUrl);
                }
            } else if (texture.image instanceof ImageData) {
                ctx.putImageData(texture.image, 0, 0);
            }

            // Para otros tipos de imágenes, generar y guardar la URL de datos
            if (!(texture.image instanceof ImageBitmap)) {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                if (texture.uuid) {
                    console.log('Saving preview for texture:', texture.uuid);
                    this.saveTexturePreview(texture.uuid, dataUrl);
                }
            }

            // Verificar si se guardó correctamente
            if (texture.uuid) {
                const preview = this.getTexturePreview(texture.uuid);
                console.log('Preview saved successfully:', !!preview);
            }

        } catch (e) {
            console.error('Error creating accessible image for texture:', e);
        }
    }

    /**
     * Procesa un lote de texturas de forma eficiente
     * @param textures Array de texturas a procesar
     * @param modelName Nombre del modelo al que pertenecen las texturas
     */
    processTexturesBatch(textures: Texture[], modelName: string): void {
        // Limitar el número de texturas a procesar por frame
        const MAX_TEXTURES_PER_FRAME = 5;

        // Función para procesar un lote de texturas
        const processBatch = (startIndex: number) => {
            if (startIndex >= textures.length) return;

            const endIndex = Math.min(startIndex + MAX_TEXTURES_PER_FRAME, textures.length);

            for (let i = startIndex; i < endIndex; i++) {
                const texture = textures[i];

                // Asegurarse de que la textura tenga un nombre
                if (!texture.name) {
                    texture.name = `${modelName}_Texture_${i + 1}`;
                }

                // Crear previsualización solo si es necesario
                if (texture.image && !texture.image.src) {
                    // Verificar si ya existe una previsualización o si se puede obtener una
                    const previewUrl = this.getTexturePreviewUrl(texture);
                    if (!previewUrl) {
                        // No existe previsualización, crear una
                        this.createAccessibleTextureImage(texture);
                    }
                }
            }

            // Programar el siguiente lote para el siguiente frame
            if (endIndex < textures.length) {
                requestAnimationFrame(() => processBatch(endIndex));
            }
        };

        // Iniciar el procesamiento por lotes
        processBatch(0);
    }
} 