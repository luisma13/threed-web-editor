import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TextureLoader, Texture, Material, Wrapping, TextureEncoding, MeshStandardMaterial, Color, FrontSide, BackSide, DoubleSide, Side } from 'three';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface ResourceInfo<T> {
    resource: T;
    refCount: number;
    name: string;
    uuid: string;
}

// Añadir esta interfaz para las previsualizaciones de materiales
export interface MaterialPreview {
    dataUrl: string;
    timestamp: number;
}

@Injectable({
    providedIn: 'root'
})
export class ResourceService {
    private _textures = new Map<string, ResourceInfo<Texture>>();
    private _materials = new Map<string, ResourceInfo<Material>>();
    private _textureLoader = new TextureLoader();
    private _blobUrls = new Map<string, string>(); // Map to track blob URLs
    
    // Mapa para almacenar las previsualizaciones de los materiales
    private _materialPreviews = new Map<string, MaterialPreview>();
    
    // Mapa para almacenar las previsualizaciones de las texturas
    private _texturePreviewsMap = new Map<string, string>();

    // Observable maps for UI updates
    private _texturesSubject = new BehaviorSubject<Map<string, ResourceInfo<Texture>>>(this._textures);
    private _materialsSubject = new BehaviorSubject<Map<string, ResourceInfo<Material>>>(this._materials);
    private _materialPreviewsSubject = new BehaviorSubject<Map<string, MaterialPreview>>(this._materialPreviews);

    // Flag para indicar si el servicio está siendo destruido
    private isBrowser: boolean;

    get textures() {
        return this._textures;
    }

    get texturesSubject() {
        return this._texturesSubject;
    }

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
        private snackBar: MatSnackBar,
        private http: HttpClient,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
        
        // Solo ejecutar código relacionado con el navegador si estamos en un entorno de navegador
        if (this.isBrowser) {
            // Escuchar eventos de pérdida de contexto WebGL a nivel de ventana
            window.addEventListener('webglcontextlost', (event) => {
                console.warn('WebGL context lost at window level');
                // Prevenir el comportamiento por defecto
                event.preventDefault();
                
                // Notificar al usuario
                this.snackBar.open('WebGL context lost. Some 3D resources may need to be reloaded.', 'OK', {
                    duration: 5000,
                });
            });
        }
    }

    // Método para generar un UUID
    private generateUUID(): string {
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
        if (texture.uuid && this.getTexturePreview) {
            const cachedUrl = this.getTexturePreview(texture.uuid);
            if (cachedUrl) return cachedUrl;
        }
        
        // Si la textura tiene una imagen pero no src (como en texturas de modelos importados)
        if (texture.image) {
            // Si la imagen ya es un canvas, intentar obtener su URL directamente
            if (texture.image instanceof HTMLCanvasElement) {
                try {
                    return texture.image.toDataURL('image/png');
                } catch (e) {
                    console.warn('Error al obtener URL de canvas:', e);
                }
            }
        }
        
        // Si no se puede generar una previsualización, devolver null
        return null;
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
    
    // Método para obtener un material por su nombre
    getMaterialByName(name: string): { uuid: string, info: ResourceInfo<Material> } | null {
        for (const [uuid, info] of this._materials.entries()) {
            if (info.name === name) {
                return { uuid, info };
            }
        }
        return null;
    }
    
    // Método para obtener una textura por su nombre
    getTextureByName(name: string): { uuid: string, info: ResourceInfo<Texture> } | null {
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

    releaseTexture(path: string): void {
        const textureInfo = this._textures.get(path);
        if (!textureInfo) return;

        textureInfo.refCount--;
        if (textureInfo.refCount <= 0) {
            textureInfo.resource.dispose();
            this._textures.delete(path);
            
            // Revoke blob URL if it exists
            if (this._blobUrls.has(path)) {
                URL.revokeObjectURL(this._blobUrls.get(path)!);
                this._blobUrls.delete(path);
            }
        }

        this._texturesSubject.next(this._textures);
    }

    /**
     * Aplica opciones a una textura
     * @param texture Textura a la que aplicar las opciones
     * @param options Opciones a aplicar
     * @param logChanges Si es true, registra los cambios en la consola
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
     * Método común para actualizar una textura y notificar a los materiales que la usan
     * @param path Clave de la textura en el mapa
     * @param texture Nueva textura o textura actualizada
     * @param textureInfo Información de la textura existente
     * @param blobUrl URL del blob si existe (para almacenar o revocar)
     * @private
     */
    private updateTextureCommon(
        path: string, 
        texture: Texture, 
        textureInfo: ResourceInfo<Texture>,
        blobUrl?: string
    ): void {
        // Guardar la textura anterior para actualizar referencias
        const oldTexture = textureInfo.resource;
        
        // Actualizar la textura en el mapa con la misma clave
        this._textures.set(path, {
            resource: texture,
            refCount: textureInfo.refCount,
            name: textureInfo.name,
            uuid: textureInfo.uuid
        });
        
        // Almacenar la URL del blob si se proporciona
        if (blobUrl) {
            this._blobUrls.set(path, blobUrl);
        }
        
        // Actualizar las referencias a la textura en los materiales
        this._materials.forEach((materialInfo, materialUuid) => {
            if (materialInfo.resource instanceof MeshStandardMaterial) {
                const material = materialInfo.resource as MeshStandardMaterial;
                
                // Actualizar cada mapa de textura si usa la textura anterior
                if (material.map === oldTexture) {
                    material.map = texture;
                    material.needsUpdate = true;
                }
                if (material.normalMap === oldTexture) {
                    material.normalMap = texture;
                    material.needsUpdate = true;
                }
                if (material.roughnessMap === oldTexture) {
                    material.roughnessMap = texture;
                    material.needsUpdate = true;
                }
                if (material.metalnessMap === oldTexture) {
                    material.metalnessMap = texture;
                    material.needsUpdate = true;
                }
                if (material.emissiveMap === oldTexture) {
                    material.emissiveMap = texture;
                    material.needsUpdate = true;
                }
                if (material.aoMap === oldTexture) {
                    material.aoMap = texture;
                    material.needsUpdate = true;
                }
                if (material.displacementMap === oldTexture) {
                    material.displacementMap = texture;
                    material.needsUpdate = true;
                }
            }
        });
        
        // Notificar a los suscriptores
        this._texturesSubject.next(new Map(this._textures));
        this._materialsSubject.next(new Map(this._materials));
        
        // Actualizar todos los materiales que usan esta textura
        this.updateMaterialsUsingTexture(textureInfo.uuid);
    }

    /**
     * Actualiza las propiedades de una textura existente
     * @param path Clave de la textura en el mapa
     * @param options Opciones de la textura a actualizar
     */
    updateTexture(path: string, options: {
        wrapS?: Wrapping;
        wrapT?: Wrapping;
        encoding?: TextureEncoding;
        generateMipmaps?: boolean;
        flipY?: boolean;
    }): void {
        const textureInfo = this._textures.get(path);
        if (!textureInfo) {
            console.error(`Texture not found: ${path}`);
            return;
        }

        const texture = textureInfo.resource;
        
        // Aplicar opciones a la textura
        this.applyTextureOptions(texture, options);
        
        // Usar el método común para actualizar la textura y notificar
        this.updateTextureCommon(path, texture, textureInfo);
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
        if (properties.map && this._textures.has(properties.map)) {
            material.map = this._textures.get(properties.map)?.resource;
        }
        
        if (properties.normalMap && this._textures.has(properties.normalMap)) {
            material.normalMap = this._textures.get(properties.normalMap)?.resource;
        }
        
        if (properties.roughnessMap && this._textures.has(properties.roughnessMap)) {
            material.roughnessMap = this._textures.get(properties.roughnessMap)?.resource;
        }
        
        if (properties.metalnessMap && this._textures.has(properties.metalnessMap)) {
            material.metalnessMap = this._textures.get(properties.metalnessMap)?.resource;
        }
        
        if (properties.emissiveMap && this._textures.has(properties.emissiveMap)) {
            material.emissiveMap = this._textures.get(properties.emissiveMap)?.resource;
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
        console.log('Propiedades a actualizar:', properties);
        
        const materialInfo = this._materials.get(uuid);
        if (!materialInfo) {
            console.error(`Material not found: ${uuid}`);
            console.log('Materiales disponibles:', Array.from(this._materials.keys()));
            return;
        }
        
        const material = materialInfo.resource;
        
        // Only update MeshStandardMaterial
        if (!(material instanceof MeshStandardMaterial)) {
            console.error(`Material ${materialInfo.name} is not a MeshStandardMaterial`);
            return;
        }
        
        // Actualizar el nombre si se proporciona
        if (properties.name !== undefined) {
            console.log(`Actualizando nombre de material de "${materialInfo.name}" a "${properties.name}"`);
            materialInfo.name = properties.name;
            material.name = properties.name;
        }
        
        console.log('Before update - Material properties:', {
            name: materialInfo.name,
            color: material.color.getHexString(),
            roughness: material.roughness,
            metalness: material.metalness,
            transparent: material.transparent,
            opacity: material.opacity,
            side: material.side,
            flatShading: material.flatShading,
            wireframe: material.wireframe,
            alphaTest: material.alphaTest,
            depthTest: material.depthTest,
            depthWrite: material.depthWrite,
            emissive: material.emissive.getHexString(),
            emissiveIntensity: material.emissiveIntensity
        });
        
        // Update basic properties
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
        
        // Update advanced properties
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
        
        // Update texture maps
        // Handle albedo map
        if (properties.map !== undefined) {
            // If there was a previous map, decrease its refCount
            if (material.map) {
                const oldMapPath = material.map.name;
                if (oldMapPath && this._textures.has(oldMapPath)) {
                    const oldTextureInfo = this._textures.get(oldMapPath)!;
                    oldTextureInfo.refCount--;
                }
            }
            
            // Set new map if provided
            if (properties.map && this._textures.has(properties.map)) {
                const textureInfo = this._textures.get(properties.map)!;
                material.map = textureInfo.resource;
                textureInfo.refCount++;
            } else {
                material.map = null;
            }
        }
        
        // Handle normal map
        if (properties.normalMap !== undefined) {
            // If there was a previous map, decrease its refCount
            if (material.normalMap) {
                const oldMapPath = material.normalMap.name;
                if (oldMapPath && this._textures.has(oldMapPath)) {
                    const oldTextureInfo = this._textures.get(oldMapPath)!;
                    oldTextureInfo.refCount--;
                }
            }
            
            // Set new map if provided
            if (properties.normalMap && this._textures.has(properties.normalMap)) {
                const textureInfo = this._textures.get(properties.normalMap)!;
                material.normalMap = textureInfo.resource;
                textureInfo.refCount++;
            } else {
                material.normalMap = null;
            }
        }
        
        // Handle roughness map
        if (properties.roughnessMap !== undefined) {
            // If there was a previous map, decrease its refCount
            if (material.roughnessMap) {
                const oldMapPath = material.roughnessMap.name;
                if (oldMapPath && this._textures.has(oldMapPath)) {
                    const oldTextureInfo = this._textures.get(oldMapPath)!;
                    oldTextureInfo.refCount--;
                }
            }
            
            // Set new map if provided
            if (properties.roughnessMap && this._textures.has(properties.roughnessMap)) {
                const textureInfo = this._textures.get(properties.roughnessMap)!;
                material.roughnessMap = textureInfo.resource;
                textureInfo.refCount++;
            } else {
                material.roughnessMap = null;
            }
        }
        
        // Handle metalness map
        if (properties.metalnessMap !== undefined) {
            // If there was a previous map, decrease its refCount
            if (material.metalnessMap) {
                const oldMapPath = material.metalnessMap.name;
                if (oldMapPath && this._textures.has(oldMapPath)) {
                    const oldTextureInfo = this._textures.get(oldMapPath)!;
                    oldTextureInfo.refCount--;
                }
            }
            
            // Set new map if provided
            if (properties.metalnessMap && this._textures.has(properties.metalnessMap)) {
                const textureInfo = this._textures.get(properties.metalnessMap)!;
                material.metalnessMap = textureInfo.resource;
                textureInfo.refCount++;
            } else {
                material.metalnessMap = null;
            }
        }
        
        // Handle emissive map
        if (properties.emissiveMap !== undefined) {
            // If there was a previous map, decrease its refCount
            if (material.emissiveMap) {
                const oldMapPath = material.emissiveMap.name;
                if (oldMapPath && this._textures.has(oldMapPath)) {
                    const oldTextureInfo = this._textures.get(oldMapPath)!;
                    oldTextureInfo.refCount--;
                }
            }
            
            // Set new map if provided
            if (properties.emissiveMap && this._textures.has(properties.emissiveMap)) {
                const textureInfo = this._textures.get(properties.emissiveMap)!;
                material.emissiveMap = textureInfo.resource;
                textureInfo.refCount++;
            } else {
                material.emissiveMap = null;
            }
        }
        
        // Mark material as needing update
        material.needsUpdate = true;
        
        console.log('After update - Material properties:', {
            name: materialInfo.name,
            color: material.color.getHexString(),
            roughness: material.roughness,
            metalness: material.metalness,
            transparent: material.transparent,
            opacity: material.opacity,
            side: material.side,
            flatShading: material.flatShading,
            wireframe: material.wireframe,
            alphaTest: material.alphaTest,
            depthTest: material.depthTest,
            depthWrite: material.depthWrite,
            emissive: material.emissive.getHexString(),
            emissiveIntensity: material.emissiveIntensity
        });
        
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

    /**
     * Libera todos los recursos cuando el servicio es destruido
     */
    public disposeAllResources(): void {
        if (!this.isBrowser) return;
        
        console.log('Disposing all resources in ResourceService');
        
        // Liberar todas las texturas
        this.textures.forEach((textureInfo, path) => {
            console.log(`Disposing texture: ${path}`);
            if (textureInfo.resource instanceof Texture) {
                textureInfo.resource.dispose();
            }
            
            // Revocar URL de blob si existe
            if (path.startsWith('blob:')) {
                URL.revokeObjectURL(path);
            }
        });
        this.textures.clear();
        
        // Liberar todos los materiales
        this.materials.forEach((materialInfo, name) => {
            console.log(`Disposing material: ${name}`);
            if (materialInfo.resource instanceof Material) {
                materialInfo.resource.dispose();
            }
        });
        this.materials.clear();
        
        // Notificar a los suscriptores
        this._texturesSubject.next(this.textures);
        this._materialsSubject.next(this.materials);
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
     * @param path Clave de la textura en el mapa
     * @param file Nuevo archivo para la textura
     * @param options Opciones de la textura
     * @returns Promise con la textura actualizada
     */
    async updateTextureFromFile(path: string, file: File, options: {
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
        const textureInfo = this._textures.get(path);
        if (!textureInfo) {
            console.error(`Texture not found: ${path}`);
            throw new Error(`Texture not found: ${path}`);
        }
        
        // Revocar la URL del blob anterior si existe
        if (this._blobUrls.has(path)) {
            console.log(`Revocando blob URL anterior para ${path}: ${this._blobUrls.get(path)}`);
            URL.revokeObjectURL(this._blobUrls.get(path)!);
        }
        
        // Crear una nueva URL de blob para el archivo
        const blobUrl = URL.createObjectURL(file);
        console.log(`Creado nuevo blob URL para ${path}: ${blobUrl}`);
        
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
            this.updateTextureCommon(path, texture, textureInfo, blobUrl);
            
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
     * @param path Clave de la textura en el mapa
     * @param url Nueva URL para la textura
     * @param options Opciones de la textura
     * @returns Promise con la textura actualizada
     */
    async updateTextureFromUrl(path: string, url: string, options: {
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
        const textureInfo = this._textures.get(path);
        if (!textureInfo) {
            console.error(`Texture not found: ${path}`);
            throw new Error(`Texture not found: ${path}`);
        }
        
        // Revocar la URL del blob anterior si existe
        if (this._blobUrls.has(path)) {
            console.log(`Revocando blob URL anterior para ${path}: ${this._blobUrls.get(path)}`);
            URL.revokeObjectURL(this._blobUrls.get(path)!);
            this._blobUrls.delete(path);
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
            this.updateTextureCommon(path, texture, textureInfo);
            
            return texture;
        } catch (error) {
            console.error('Error updating texture from URL:', error);
            throw error;
        }
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
        const textureInfo = this._textures.get(textureUuid);
        
        if (!textureInfo) {
            console.warn(`Texture with UUID ${textureUuid} not found`);
            return materialsUsingTexture;
        }
        
        // Get the texture resource
        const texture = textureInfo.resource;
        
        console.log(`Buscando materiales que usan la textura ${textureInfo.name} (UUID: ${textureUuid})`);
        
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
                    
                    console.log(`Material ${materialInfo.name} (UUID: ${materialUuid}) usa la textura ${textureInfo.name}`);
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
        const materialsToUpdate = this.findMaterialsUsingTexture(textureUuid);
        
        if (materialsToUpdate.length === 0) {
            console.log(`No materials found using texture ${textureUuid}`);
            return;
        }
        
        console.log(`Updating ${materialsToUpdate.length} materials that use texture ${textureUuid}`);
        
        // Update each material to ensure the texture changes are applied
        materialsToUpdate.forEach(materialUuid => {
            const materialInfo = this._materials.get(materialUuid);
            if (materialInfo && materialInfo.resource) {
                // Mark the material as needing update
                materialInfo.resource.needsUpdate = true;
                
                // Forzar la actualización de las texturas en el material
                if (materialInfo.resource instanceof MeshStandardMaterial) {
                    const material = materialInfo.resource as MeshStandardMaterial;
                    
                    // Forzar la actualización de cada mapa de textura
                    if (material.map) material.map.needsUpdate = true;
                    if (material.normalMap) material.normalMap.needsUpdate = true;
                    if (material.roughnessMap) material.roughnessMap.needsUpdate = true;
                    if (material.metalnessMap) material.metalnessMap.needsUpdate = true;
                    if (material.emissiveMap) material.emissiveMap.needsUpdate = true;
                    if (material.aoMap) material.aoMap.needsUpdate = true;
                    if (material.displacementMap) material.displacementMap.needsUpdate = true;
                }
                
                console.log(`Updated material ${materialInfo.name} (${materialUuid})`);
            }
        });
        
        // Notify subscribers about the material updates
        this._materialsSubject.next(new Map(this._materials));
    }
} 