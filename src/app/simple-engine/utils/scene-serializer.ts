import * as THREE from 'three';
import { GameObject } from '../core/gameobject';
import { Component } from '../core/component';
import { engine } from '../core/engine/engine';
import { AttributeType } from '../core/component';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ComponentRegistry } from './component-registry';
import { EditableObjectComponent } from '../components/editor/editable-object.component';

export interface SerializedComponent {
    name: string;
    type: string;
    properties: Record<string, any>;
}

export interface SerializedGameObject {
    id: string;
    name: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    components: SerializedComponent[];
    children: SerializedGameObject[];
    originalModelUrl?: string; // URL del modelo original
}

export interface SerializedScene {
    version: string;
    name: string;
    rootObjects: SerializedGameObject[];
    resources: Record<string, string>; // URL original -> URL relativa en el ZIP
}

export class SceneSerializer {
    private static readonly VERSION = '1.0.0';
    private resourceMap: Map<string, string> = new Map();
    private resourceBlobs: Map<string, Blob> = new Map();

    /**
     * Serializa la escena actual
     * @param name Nombre de la escena
     * @returns Objeto serializado de la escena
     */
    public serializeScene(name: string): SerializedScene {
        this.resourceMap.clear();
        this.resourceBlobs.clear();

        const rootObjects: SerializedGameObject[] = [];
        
        // Obtener todos los objetos raíz (sin padre), excluyendo los internos del editor
        engine.gameObjects.forEach(gameObject => {
            if (!gameObject.parentGameObject && !this.isEditorInternalGameObject(gameObject)) {
                rootObjects.push(this.serializeGameObject(gameObject));
            }
        });

        return {
            version: SceneSerializer.VERSION,
            name,
            rootObjects,
            resources: Object.fromEntries(this.resourceMap)
        };
    }

    /**
     * Verifica si un GameObject es interno del editor
     * @param gameObject GameObject a verificar
     * @returns true si es un GameObject interno del editor
     */
    private isEditorInternalGameObject(gameObject: GameObject): boolean {
        // Verificar que el gameObject no sea undefined o null
        if (!gameObject) return false;
        
        // Verificar que userData exista antes de acceder a sus propiedades
        return gameObject.userData && 
               (gameObject.userData['isEditorCore'] === true || 
                gameObject.userData['hideInHierarchy'] === true);
    }

    /**
     * Serializa un GameObject y sus hijos
     * @param gameObject GameObject a serializar
     * @returns Objeto serializado
     */
    private serializeGameObject(gameObject: GameObject): SerializedGameObject {
        const components: SerializedComponent[] = [];
        const children: SerializedGameObject[] = [];

        // Serializar componentes (excluyendo los componentes internos del editor)
        gameObject.components.forEach(component => {
            // Verificar si es un componente interno del editor
            const isEditorComponent = (component.constructor as any).isEditorComponent === true;
            
            // Solo serializar componentes que no son internos del editor
            if (!isEditorComponent) {
                components.push(this.serializeComponent(component));
            }
        });

        // Serializar hijos
        gameObject.childrenGameObjects.forEach(child => {
            children.push(this.serializeGameObject(child));
        });

        const serializedGameObject: SerializedGameObject = {
            id: gameObject.uuid,
            name: gameObject.name || 'GameObject',
            position: [gameObject.position.x, gameObject.position.y, gameObject.position.z],
            rotation: [gameObject.rotation.x, gameObject.rotation.y, gameObject.rotation.z],
            scale: [gameObject.scale.x, gameObject.scale.y, gameObject.scale.z],
            components,
            children
        };

        // Guardar la URL del modelo original si existe
        if (gameObject.userData && gameObject.userData['originalModelUrl']) {
            serializedGameObject.originalModelUrl = gameObject.userData['originalModelUrl'];
            this.addResourceToMap(gameObject.userData['originalModelUrl']);
        }

        // Buscar meshes en el GameObject y sus hijos
        this.findAndSerializeMeshes(gameObject);

        return serializedGameObject;
    }

    /**
     * Busca y serializa los meshes en un GameObject y sus hijos
     * @param gameObject GameObject a analizar
     */
    private findAndSerializeMeshes(gameObject: GameObject): void {
        // Buscar meshes en el GameObject actual
        gameObject.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                // Serializar materiales y texturas
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => this.serializeMaterial(material));
                    } else {
                        this.serializeMaterial(object.material);
                    }
                }
            }
        });
    }

    /**
     * Serializa un componente
     * @param component Componente a serializar
     * @returns Objeto serializado
     */
    private serializeComponent(component: Component): SerializedComponent {
        const properties: Record<string, any> = {};
        const componentType = component.constructor.name;

        // Obtener todas las propiedades del componente
        for (const key in component) {
            // Ignorar propiedades internas o referencias circulares
            if (key === 'gameObject' || key === 'name' || typeof component[key] === 'function') {
                continue;
            }

            const value = component[key];
            
            // Manejar tipos especiales
            if (value instanceof THREE.Texture) {
                // Guardar referencia a la textura
                const textureUrl = (value as any).source.data?.src;
                if (textureUrl) {
                    this.addResourceToMap(textureUrl);
                    properties[key] = { type: 'texture', url: textureUrl };
                }
            } else if (value instanceof THREE.Material) {
                // Serializar material
                properties[key] = this.serializeMaterial(value);
            } else if (value instanceof THREE.Vector3) {
                properties[key] = { type: 'vector3', x: value.x, y: value.y, z: value.z };
            } else if (value instanceof THREE.Color) {
                properties[key] = { type: 'color', r: value.r, g: value.g, b: value.b };
            } else if (value instanceof THREE.Euler) {
                properties[key] = { type: 'euler', x: value.x, y: value.y, z: value.z };
            } else if (typeof value !== 'object' || value === null) {
                // Valores primitivos
                properties[key] = value;
            }
            // Ignorar otros objetos complejos
        }

        return {
            name: component.name,
            type: componentType,
            properties
        };
    }

    /**
     * Serializa un material de Three.js
     * @param material Material a serializar
     * @returns Objeto serializado
     */
    private serializeMaterial(material: THREE.Material): any {
        const result: any = {
            type: material.type,
            properties: {}
        };

        // Propiedades comunes
        result.properties.transparent = material.transparent;
        result.properties.opacity = material.opacity;
        result.properties.visible = material.visible;

        // Propiedades específicas según el tipo de material
        if (material instanceof THREE.MeshStandardMaterial) {
            result.properties.color = material.color.getHex();
            result.properties.roughness = material.roughness;
            result.properties.metalness = material.metalness;
            
            // Manejar mapas/texturas
            if (material.map) {
                const mapUrl = (material.map as any).source.data?.src;
                if (mapUrl) {
                    this.addResourceToMap(mapUrl);
                    result.properties.map = { type: 'texture', url: mapUrl };
                }
            }
            
            // Otros mapas (normalMap, roughnessMap, etc.)
            if (material.normalMap) {
                const normalMapUrl = (material.normalMap as any).source.data?.src;
                if (normalMapUrl) {
                    this.addResourceToMap(normalMapUrl);
                    result.properties.normalMap = { type: 'texture', url: normalMapUrl };
                }
            }
            
            if (material.roughnessMap) {
                const roughnessMapUrl = (material.roughnessMap as any).source.data?.src;
                if (roughnessMapUrl) {
                    this.addResourceToMap(roughnessMapUrl);
                    result.properties.roughnessMap = { type: 'texture', url: roughnessMapUrl };
                }
            }
            
            if (material.metalnessMap) {
                const metalnessMapUrl = (material.metalnessMap as any).source.data?.src;
                if (metalnessMapUrl) {
                    this.addResourceToMap(metalnessMapUrl);
                    result.properties.metalnessMap = { type: 'texture', url: metalnessMapUrl };
                }
            }
        }
        
        return result;
    }

    /**
     * Añade un recurso al mapa de recursos
     * @param url URL del recurso
     */
    private addResourceToMap(url: string): void {
        if (!this.resourceMap.has(url)) {
            this.resourceMap.set(url, url);
            // Descargar el recurso y guardarlo como blob
            this.downloadResource(url);
        }
    }

    /**
     * Descarga un recurso para incluirlo en el archivo de la escena
     * @param url URL del recurso
     */
    private async downloadResource(url: string): Promise<void> {
        try {
            // Verificar que estamos en un entorno con fetch
            if (typeof fetch === 'undefined') {
                console.warn('fetch API not available, skipping resource download');
                return;
            }

            // Evitar descargar URLs de datos o recursos locales que no son URLs
            if (url.startsWith('data:') || !url.match(/^https?:\/\//i)) {
                // Para URLs de datos, extraer directamente el blob
                if (url.startsWith('data:')) {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    this.resourceBlobs.set(url, blob);
                }
                return;
            }

            const response = await fetch(url);
            const blob = await response.blob();
            this.resourceBlobs.set(url, blob);
        } catch (error) {
            console.error(`Error downloading resource ${url}:`, error);
        }
    }

    /**
     * Exporta la escena a un archivo .scene
     * @param name Nombre de la escena
     */
    public async exportScene(name: string): Promise<void> {
        const serializedScene = this.serializeScene(name);
        
        // Crear un archivo ZIP
        const zip = new JSZip();
        
        // Añadir el archivo de la escena
        zip.file('scene.json', JSON.stringify(serializedScene, null, 2));
        
        // Añadir los recursos
        const resourcesFolder = zip.folder('resources');
        const modelsFolder = zip.folder('models');
        
        // Procesar cada recurso
        for (const [url, _] of this.resourceBlobs.entries()) {
            const blob = this.resourceBlobs.get(url);
            if (!blob) continue;
            
            // Determinar si es un modelo o una textura basado en la extensión
            const isModel = this.isModelFile(url);
            const filename = this.getFilenameFromUrl(url);
            const folder = isModel ? modelsFolder : resourcesFolder;
            const relativePath = isModel ? `models/${filename}` : `resources/${filename}`;
            
            // Añadir el archivo al ZIP
            folder.file(filename, blob);
            
            // Actualizar la referencia en el objeto serializado
            serializedScene.resources[url] = relativePath;
        }
        
        // Actualizar el archivo de la escena con las nuevas referencias
        zip.file('scene.json', JSON.stringify(serializedScene, null, 2));
        
        // Generar el archivo ZIP
        const content = await zip.generateAsync({ type: 'blob' });
        
        // Descargar el archivo
        saveAs(content, `${name}.scene`);
    }

    /**
     * Determina si una URL corresponde a un archivo de modelo 3D
     * @param url URL a verificar
     * @returns true si es un archivo de modelo
     */
    private isModelFile(url: string): boolean {
        const modelExtensions = ['.gltf', '.glb', '.fbx', '.obj', '.vrm'];
        const lowercaseUrl = url.toLowerCase();
        return modelExtensions.some(ext => lowercaseUrl.endsWith(ext));
    }

    /**
     * Obtiene el nombre de archivo de una URL
     * @param url URL
     * @returns Nombre de archivo
     */
    private getFilenameFromUrl(url: string): string {
        // Extraer el nombre de archivo de la URL
        const urlParts = url.split('/');
        let filename = urlParts[urlParts.length - 1];
        
        // Eliminar parámetros de consulta si existen
        if (filename.includes('?')) {
            filename = filename.split('?')[0];
        }
        
        return filename;
    }

    /**
     * Importa una escena desde un archivo .scene
     * @param file Archivo .scene
     * @returns Promesa que se resuelve cuando la escena se ha importado
     */
    public async importScene(file: File): Promise<void> {
        // Leer el archivo ZIP
        const zip = await JSZip.loadAsync(file);
        
        // Leer el archivo de la escena
        const sceneContent = await zip.file('scene.json').async('text');
        const serializedScene = JSON.parse(sceneContent) as SerializedScene;
        
        // Filtrar los GameObjects internos del editor para no eliminarlos
        const gameObjectsToRemove = engine.gameObjects.filter(obj => 
            obj && (!obj.userData || !obj.userData['isEditorCore'])
        );
        
        // Limpiar la escena actual pero mantener los componentes del editor
        if (gameObjectsToRemove.length > 0) {
            engine.removeGameObjects(...gameObjectsToRemove);
        }
        
        // Cargar los recursos
        const resourcesMap = new Map<string, string>();
        for (const [url, path] of Object.entries(serializedScene.resources)) {
            // Obtener el archivo del ZIP
            const zipPath = path;
            const resourceFile = zip.file(zipPath);
            
            if (resourceFile) {
                const blob = await resourceFile.async('blob');
                const objectUrl = URL.createObjectURL(blob);
                resourcesMap.set(url, objectUrl);
            }
        }
        
        // Recrear la escena
        for (const rootObject of serializedScene.rootObjects) {
            await this.deserializeGameObject(rootObject, null, resourcesMap);
        }
    }

    /**
     * Deserializa un GameObject y sus hijos
     * @param serialized Objeto serializado
     * @param parent Padre del GameObject
     * @param resourcesMap Mapa de recursos
     * @returns GameObject deserializado
     */
    private async deserializeGameObject(
        serialized: SerializedGameObject, 
        parent: GameObject | null,
        resourcesMap: Map<string, string>
    ): Promise<GameObject> {
        let gameObject: GameObject;
        
        // Si tiene una URL de modelo original, cargar el modelo
        if (serialized.originalModelUrl) {
            const url = resourcesMap.get(serialized.originalModelUrl) || serialized.originalModelUrl;
            const extension = this.getFileExtension(url);
            gameObject = await this.loadModel(url, extension);
            
            // Guardar la URL original para futuras exportaciones
            if (!gameObject.userData) gameObject.userData = {};
            gameObject.userData['originalModelUrl'] = serialized.originalModelUrl;
        } else {
            // Crear un GameObject vacío
            gameObject = new GameObject();
        }
        
        // Establecer propiedades básicas
        gameObject.name = serialized.name;
        gameObject.position.set(serialized.position[0], serialized.position[1], serialized.position[2]);
        gameObject.rotation.set(serialized.rotation[0], serialized.rotation[1], serialized.rotation[2]);
        gameObject.scale.set(serialized.scale[0], serialized.scale[1], serialized.scale[2]);
        
        // Añadir al padre si existe
        if (parent) {
            parent.addGameObject(gameObject);
        } else {
            engine.addGameObjects(gameObject);
        }
        
        // Deserializar componentes
        for (const serializedComponent of serialized.components) {
            await this.deserializeComponent(serializedComponent, gameObject, resourcesMap);
        }
        
        // Añadir el componente EditableObjectComponent para que sea editable en el editor
        gameObject.addComponent(new EditableObjectComponent());
        
        // Deserializar hijos
        for (const serializedChild of serialized.children) {
            await this.deserializeGameObject(serializedChild, gameObject, resourcesMap);
        }
        
        return gameObject;
    }

    /**
     * Obtiene la extensión de un archivo a partir de su URL
     * @param url URL del archivo
     * @returns Extensión del archivo
     */
    private getFileExtension(url: string): string {
        const filename = this.getFilenameFromUrl(url);
        const parts = filename.split('.');
        if (parts.length > 1) {
            return '.' + parts[parts.length - 1].toLowerCase();
        }
        return '';
    }

    /**
     * Carga un modelo 3D según su extensión
     * @param url URL del modelo
     * @param extension Extensión del archivo
     * @returns GameObject con el modelo cargado
     */
    private async loadModel(url: string, extension: string): Promise<GameObject> {
        // Importar los loaders dinámicamente para evitar dependencias circulares
        const { loadGLB, loadFBX, loadObj, loadVRM } = await import('../loaders/modelsLoader');
        
        let gameObject: GameObject;
        
        switch (extension.toLowerCase()) {
            case '.gltf':
            case '.glb':
                gameObject = await loadGLB(url);
                break;
            case '.fbx':
                gameObject = await loadFBX(url);
                break;
            case '.obj':
                gameObject = await loadObj(url);
                break;
            case '.vrm':
                const { scene } = await loadVRM(url);
                gameObject = new GameObject(null, scene);
                break;
            default:
                // Si no se reconoce la extensión, crear un GameObject vacío
                gameObject = new GameObject();
                console.warn(`Unsupported model extension: ${extension}`);
        }
        
        return gameObject;
    }

    /**
     * Deserializa un componente
     * @param serialized Componente serializado
     * @param gameObject GameObject al que añadir el componente
     * @param resourcesMap Mapa de recursos
     */
    private async deserializeComponent(
        serialized: SerializedComponent,
        gameObject: GameObject,
        resourcesMap: Map<string, string>
    ): Promise<void> {
        // Usar el registro de componentes para crear la instancia
        const component = ComponentRegistry.getInstance().createComponent(serialized.type);
        
        if (!component) {
            console.warn(`Component type ${serialized.type} not found in registry`);
            return;
        }
        
        // Establecer propiedades
        for (const [key, value] of Object.entries(serialized.properties)) {
            if (typeof value === 'object' && value !== null) {
                // Manejar tipos especiales
                if (value.type === 'texture') {
                    // Cargar textura
                    const textureUrl = resourcesMap.get(value.url) || value.url;
                    const texture = await this.loadTexture(textureUrl);
                    component[key] = texture;
                } else if (value.type === 'vector3') {
                    component[key] = new THREE.Vector3(value.x, value.y, value.z);
                } else if (value.type === 'color') {
                    component[key] = new THREE.Color(value.r, value.g, value.b);
                } else if (value.type === 'euler') {
                    component[key] = new THREE.Euler(value.x, value.y, value.z);
                }
            } else {
                // Valores primitivos
                component[key] = value;
            }
        }
        
        // Añadir el componente al GameObject
        gameObject.addComponent(component);
    }

    /**
     * Carga una textura desde una URL
     * @param url URL de la textura
     * @returns Promesa que se resuelve con la textura cargada
     */
    private loadTexture(url: string): Promise<THREE.Texture> {
        return new Promise((resolve, reject) => {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(
                url,
                texture => resolve(texture),
                undefined,
                error => reject(error)
            );
        });
    }
} 