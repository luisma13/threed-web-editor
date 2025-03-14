import { Injectable, PLATFORM_ID, Inject, ElementRef, EventEmitter } from "@angular/core";
import { isPlatformBrowser } from '@angular/common';
import { EditableSceneComponent } from "../simple-engine/components/editor/editable-scene.component";
import { FirstPersonCameraComponent } from "../simple-engine/components/camera/first-camera.component";
import { EditableObjectComponent } from "../simple-engine/components/editor/editable-object.component";
import { GridHelperComponent } from "../simple-engine/components/helpers/grid-helper.component";
import { DirectionalLightComponent } from "../simple-engine/components/light/directional-light.component";
import { SpotLightComponent } from "../simple-engine/components/light/spot-light.component";
import { engine } from "../simple-engine/core/engine/engine";
import { GameObject } from "../simple-engine/core/gameobject";
import * as THREE from "three";
import { PlayerComponent } from "../simple-engine/components/players/player.component";
import { PlayerPhysicsComponent } from "../simple-engine/components/players/player-physics.component";
import { PlayerControllerComponent } from "../simple-engine/components/players/player-controller.component";
import { SceneExportService } from "./scene-export.service";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { ComponentInfo } from './component-selector/component-selector-dialog.component';
import { Component } from "../simple-engine/core/component";
import { BoxComponent } from "../simple-engine/components/geometry/box.component";
import { BoxColliderComponent } from "../simple-engine/components/geometry/box-collider.component";
import { ResourceService, ResourceInfo } from './resource-manager/resource.service';
import { MaterialManager } from '../simple-engine/managers/material-manager';
import { ModelCacheService } from './resource-manager/model-cache.service';
import { AddModelAction, RemoveModelAction } from './history/actions/model-action';
import { EditorEventsService } from './shared/editor-events.service';
import { ModelComponent } from "../simple-engine/components/geometry/model.component";

@Injectable({ providedIn: 'root' })
export class EditorService {

    input: HTMLInputElement;
    private currentSceneName: string = 'MyScene';

    // Componentes del editor que deben persistir independientemente de la escena
    gridHelperComponent: GridHelperComponent = new GridHelperComponent();
    editableSceneComponent: EditableSceneComponent = new EditableSceneComponent();
    firstPersonCameraComponent: FirstPersonCameraComponent = new FirstPersonCameraComponent();

    // GameObject que contiene los componentes del editor
    private editorCoreGameObject: GameObject;
    
    // Flag para saber si los componentes del editor ya fueron inicializados
    private editorComponentsInitialized: boolean = false;
    
    viewerElement: ElementRef;
    
    // Raycaster para detectar objetos en la escena
    private raycaster: THREE.Raycaster = new THREE.Raycaster();
    private mouse: THREE.Vector2 = new THREE.Vector2();

    // Componente copiado para pegar valores
    private copiedComponent: any = null;

    // Evento que se emite cuando se resetea un componente
    componentReset = new EventEmitter<any>();

    constructor(
        private sceneExportService: SceneExportService,
        @Inject(PLATFORM_ID) private platformId: Object,
        private resourceService: ResourceService,
        private modelCacheService: ModelCacheService,
        private editorEventsService: EditorEventsService
    ) {
        // Solo crear el input si estamos en el navegador
        if (isPlatformBrowser(this.platformId)) {
            // Crear input para cargar archivos
            this.input = document.createElement('input');
            this.input.type = 'file';
            this.input.style.display = 'none';
            document.body.appendChild(this.input);
            
            // Initialize MaterialManager with ResourceService
            MaterialManager.getInstance().setResourceService(this.resourceService);
            
            // Make the ResourceService available globally for components
            (window as any)['resourceService'] = this.resourceService;
            
            // Make the EditorEventsService available globally for components
            (window as any)['editorEventsService'] = this.editorEventsService;
        }
    }
    
    /**
     * Inicializa los componentes del editor que deben persistir
     * independientemente de la escena cargada
     */
    initializeEditorComponents() {
        // Verificar que no se hayan inicializado ya
        if (this.editorComponentsInitialized) return;
        
        // Verificar que el motor esté inicializado
        if (!engine.scene) {
            console.warn('Engine not initialized yet. Editor components will be initialized later.');
            return;
        }
        
        // Crear un GameObject especial para los componentes del editor
        this.editorCoreGameObject = new GameObject();
        this.editorCoreGameObject.name = '_EditorCore';
        
        // Marcar este GameObject como interno del editor para que no se muestre en la jerarquía
        // ni se exporte con la escena
        this.editorCoreGameObject.userData = { 
            isEditorCore: true,
            hideInHierarchy: true 
        };
        
        // Añadir los componentes esenciales del editor
        this.editorCoreGameObject.addComponent(this.editableSceneComponent);
        this.editorCoreGameObject.addComponent(this.firstPersonCameraComponent);
        
        // Añadir el GameObject a la escena
        engine.addGameObjects(this.editorCoreGameObject);
        
        // Marcar como inicializado
        this.editorComponentsInitialized = true;
    }

    setViewerElement(element: ElementRef) {
        this.viewerElement = element;
        
        // Si ya existe el componente de cámara, configurar el elemento del viewport
        if (this.firstPersonCameraComponent && this.viewerElement) {
            this.firstPersonCameraComponent.setViewportElement(this.viewerElement.nativeElement);
        }
    }

    /**
     * Crea la escena del editor con los elementos básicos
     * @returns Promesa que se resuelve cuando la escena está completamente cargada
     */
    async createEditorScene() {
        engine.PHYSICS_ENABLED = false;
        
        // Inicializar los componentes del editor ahora que el motor está listo
        this.initializeEditorComponents();
        
        // Crear el GameObject de Environment solo con el GridHelper
        const environment = new GameObject();
        environment.name = 'Environment';
        environment.addComponent(this.gridHelperComponent);
        environment.addComponent(new EditableObjectComponent());

        const directionalLight = new GameObject();
        directionalLight.position.set(10, 10, 10);
        directionalLight.name = 'DirectionalLight';
        directionalLight.addComponent(new DirectionalLightComponent("#ffffff", 1));
        directionalLight.addComponent(new EditableObjectComponent());

        const SpotLight = new GameObject();
        SpotLight.position.set(6, 4, -3);
        SpotLight.name = 'SpotLight';
        SpotLight.addComponent(new SpotLightComponent());
        SpotLight.addComponent(new EditableObjectComponent());

        engine.addGameObjects(environment);
        engine.addGameObjects(SpotLight);
        engine.addGameObjects(directionalLight);

        // Configurar el elemento del viewport para la cámara en primera persona
        if (this.firstPersonCameraComponent && this.viewerElement) {
            this.firstPersonCameraComponent.setViewportElement(this.viewerElement.nativeElement);
        }
        
        // Devolver el objeto Environment para que pueda ser seleccionado por defecto
        return environment;
    }

    /**
     * Limpia la escena actual pero mantiene los componentes del editor
     */
    clearScene() {
        // Filtrar el GameObject del editor para no eliminarlo
        const gameObjectsToRemove = engine.gameObjects.filter(obj => 
            obj && (!obj.userData || !obj.userData['isEditorCore'])
        );
        
        // Eliminar todos los GameObjects excepto el del editor
        if (gameObjectsToRemove.length > 0) {
            engine.removeGameObjects(...gameObjectsToRemove);
        }
    }

    newGameObject(parent?: GameObject) {
        const gameObject = new GameObject();
        gameObject.name = "New GameObject";
        
        // Añadir el EditableObjectComponent
        gameObject.addComponent(new EditableObjectComponent());
        
        // Si tiene padre, añadirlo como hijo
        if (parent) {
            parent.addGameObject(gameObject);
        } else {
            // Si no tiene padre, añadirlo a la escena
            engine.addGameObjects(gameObject);
        }

        // Asegurarnos de que el objeto está en la escena antes de seleccionarlo
        setTimeout(() => {
            // Seleccionar el nuevo objeto
            this.editableSceneComponent.selectedObject.next(gameObject);
            
            // Forzar la actualización de la UI
            if (this.editableSceneComponent.selectedObject.value !== gameObject) {
                console.warn('Reintentando selección del GameObject');
                this.editableSceneComponent.selectedObject.next(gameObject);
            }
        }, 0);
        
        return gameObject;
    }

    /**
     * Exporta la escena actual
     */
    exportScene() {
        // Pedir al usuario el nombre de la escena
        const sceneName = prompt('Nombre de la escena:', this.currentSceneName);
        if (sceneName) {
            this.currentSceneName = sceneName;
            this.sceneExportService.exportScene(sceneName);
        }
    }

    /**
     * Importa una escena desde un archivo
     */
    loadScene() {
        this.input.accept = '.scene';
        this.input.onchange = async (event) => {
            const file = this.input.files[0];
            if (file) {
                // Limpiar la escena actual pero mantener los componentes del editor
                this.clearScene();
                
                // Importar la nueva escena
                await this.sceneExportService.importScene(file);
                this.currentSceneName = file.name.replace('.scene', '');
            }
        };
        this.input.click();
    }

    /**
     * Carga un modelo con caché y lo añade a la escena
     * @param url URL del modelo
     * @param modelType Tipo de modelo
     * @returns Promise con el GameObject creado
     */
    async loadModelWithCache(url: string, modelType: string): Promise<GameObject | undefined> {
        try {
            // Comprobar si el modelo ya está en caché
            const cachedModel = this.modelCacheService.getModelByUrl(url);
            let modelUuid: string;
            
            if (cachedModel) {
                modelUuid = cachedModel.uuid;
        } else {
                // Cargar el modelo
                const result = await this.loadModel(url, modelType);
                if (!result) {
                    return undefined;
                }

                const { object, animations } = result;

                // Extraer el nombre del archivo de la URL
                const urlParts = url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                const name = fileName.split('.')[0];

                // Añadir el modelo al caché
                modelUuid = this.modelCacheService.addModel(object, url, modelType, name);
                
                // Guardar las animaciones en el caché
                if (animations && animations.length > 0) {
                    this.modelCacheService.addModelAnimations(modelUuid, animations);
                }
            }

            // Añadir el modelo a la escena desde el caché
            return this.addModelToSceneFromCache(modelUuid);
        } catch (error) {
            console.error('Error loading model with cache:', error);
            return undefined;
        }
    }

    /**
     * Deletes a GameObject and releases its model from the cache if applicable
     * @param gameObject GameObject to delete
     * @param addToHistory Whether to add the action to history for undo/redo
     * @param removeFromCache Whether to remove the model from the cache (defaults to false)
     */
    deleteGameObject(gameObject: GameObject, addToHistory: boolean = true, removeFromCache: boolean = false): void {
        if (!gameObject) return;
        
        // Check if this GameObject has a cached model
        const modelUuid = gameObject.userData?.['modelUuid'];
        
        // Store model info before deletion if needed for history
        let modelInfo = null;
        if (modelUuid && addToHistory) {
            modelInfo = this.modelCacheService.getModel(modelUuid);
        }
        
        // Si hay información del modelo, decrementar los contadores de referencia
        if (modelInfo) {
            // Decrementar el contador de referencias del modelo
            this.modelCacheService.releaseModel(modelUuid, removeFromCache);
            
            // Decrementar el contador de referencias de los materiales asociados
            if (modelInfo.materials && modelInfo.materials.length > 0) {
                modelInfo.materials.forEach(materialUuid => {
                    const materialInfo = this.resourceService.materials.get(materialUuid);
                    if (materialInfo && materialInfo.refCount > 0) {
                        materialInfo.refCount--;
                    }
                });
                // Notificar cambios en los materiales
                this.resourceService.materialsSubject.next(new Map(this.resourceService.materials));
            }
            
            // Decrementar el contador de referencias de las texturas asociadas
            if (modelInfo.textures && modelInfo.textures.length > 0) {
                modelInfo.textures.forEach(textureUuid => {
                    const textureInfo = this.resourceService.textures.get(textureUuid);
                    if (textureInfo && textureInfo.refCount > 0) {
                        textureInfo.refCount--;
                    }
                });
                // Notificar cambios en las texturas
                this.resourceService.texturesSubject.next(new Map(this.resourceService.textures));
            }
        }
        
        // Si el objeto está seleccionado, deseleccionarlo
        if (this.editableSceneComponent.selectedObject.value === gameObject) {
            this.editableSceneComponent.unselectObject();
        }
        
        // Guardar referencia al padre antes de eliminarlo
        const parent = gameObject.parent;
        const parentGameObject = gameObject.parentGameObject;
        
        // Eliminar también los hijos recursivamente primero
        // Importante: Hacer esto antes de eliminar el objeto de la escena
        if (gameObject.children && gameObject.children.length > 0) {
            // Crear una copia del array de hijos para evitar problemas al modificar el array original
            const children = [...gameObject.children];
            for (const child of children) {
                if (child instanceof GameObject) {
                    this.deleteGameObject(child, false); // No añadir los hijos al historial
                }
            }
        }
        
        // Si tiene un padre GameObject, eliminarlo de la lista de hijos del padre
        if (parentGameObject) {
            const childIndex = parentGameObject.childrenGameObjects.indexOf(gameObject);
            if (childIndex !== -1) {
                parentGameObject.childrenGameObjects.splice(childIndex, 1);
            }
        }
        
        // Eliminar el GameObject de la escena
        if (parent) {
            parent.remove(gameObject);
        }
        
        // Eliminar el GameObject de la lista de GameObjects del motor
        const index = engine.gameObjects.indexOf(gameObject);
        if (index !== -1) {
            engine.gameObjects.splice(index, 1);
            
            // Emitir el evento onGameobjectRemoved para que la jerarquía se actualice
            engine.onGameobjectRemoved.next(gameObject);
        }
        
        // Limpiar referencias circulares
        if (gameObject.childrenGameObjects) {
            gameObject.childrenGameObjects = [];
        }
        gameObject.parentGameObject = null;
        
        // Si tenía un padre, notificar que la jerarquía del padre ha cambiado
        if (parentGameObject) {
            // Emitir evento de cambio en la jerarquía para que el padre actualice su lista de hijos
            engine.onGameobjectHerarchyChanged.next(parentGameObject);
        }
        
        // If it has a cached model and we should add to history, create a RemoveModelAction
        if (modelUuid && addToHistory && modelInfo) {
            const removeModelAction = new RemoveModelAction({
                modelUuid: modelUuid,
                gameObject: gameObject,
                url: modelInfo.url,
                modelType: modelInfo.modelType,
                name: modelInfo.name
            }, this.modelCacheService);
            
            // Emit the action through the events service
            this.editorEventsService.emitAction(removeModelAction);
        }
    }

    /**
     * Adds a model to the scene
     * @param extension File extension or model type
     * @param url Optional URL to load the model from
     * @returns Promise with the created GameObject
     */
    async addModelToScene(extension: string, url?: string): Promise<GameObject | undefined> {
        try {
            if (!url) {
                // Create a file input element
                const input = document.createElement('input');
                input.type = 'file';
                
                // Set accepted file types based on extension
        switch (extension) {
            case '.gltf':
                        input.accept = '.gltf,.glb';
                        break;
                    case '.glb':
                        input.accept = '.glb';
                break;
            case '.fbx':
                        input.accept = '.fbx';
                break;
            case '.obj':
                        input.accept = '.obj';
                break;
            case '.vrm':
                        input.accept = '.vrm';
                break;
                    default:
                        input.accept = '.gltf,.glb,.fbx,.obj,.vrm';
                }
                
                // Create a promise to handle the file selection
                return new Promise<GameObject | undefined>((resolve) => {
                    input.onchange = async (event) => {
                        const files = (event.target as HTMLInputElement).files;
                        const file = files ? files[0] : null;
                        
                        if (file) {
                            const fileUrl = URL.createObjectURL(file);
                            try {
                                // Determine the file extension from the file name
                                const fileName = file.name;
                                const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();
                                
                                // Use the file extension as the model type
                                const gameObject = await this.addModelToScene(fileExtension, fileUrl);
                                resolve(gameObject);
                            } catch (error) {
                                console.error('Error loading model:', error);
                                resolve(undefined);
                            }
                        } else {
                            resolve(undefined);
                        }
                    };
                    
                    // Trigger the file dialog
                    input.click();
                });
            }
            
            // Determine the model type from the extension
            let modelType = '';
            switch (extension.toLowerCase()) {
                case '.gltf':
                case '.glb':
                    modelType = 'gltf';
                    break;
                case '.fbx':
                    modelType = 'fbx';
                    break;
                case '.obj':
                    modelType = 'obj';
                    break;
                case '.vrm':
                    modelType = 'vrm';
                    break;
                default:
                    throw new Error(`Unsupported model extension: ${extension}`);
            }
            
            // Load the model using the cache and add it to the scene
            return this.loadModelWithCache(url, modelType);
        } catch (error) {
            console.error('Error adding model to scene:', error);
            return undefined;
        }
    }

    /**
     * Obtiene el GameObject intersectado por el rayo en la posición del mouse
     * @param event Evento del mouse
     * @returns GameObject intersectado o null si no hay intersección
     */
    getIntersectedObject(event: MouseEvent): GameObject | null {
        if (!this.viewerElement || !engine.camera) {
            return null;
        }
        
        // Obtener las dimensiones y posición del elemento del visor
        const rect = this.viewerElement.nativeElement.getBoundingClientRect();
        
        // Calcular las coordenadas normalizadas del mouse (-1 a 1)
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Actualizar el raycaster
        this.raycaster.setFromCamera(this.mouse, engine.camera);
        
        // Obtener todos los objetos en la escena que pueden ser intersectados
        const objects = [];
        
        // Recorrer todos los GameObjects y agregar sus meshes a la lista de objetos
        for (const gameObject of engine.gameObjects) {
            if (gameObject && 
                gameObject.userData && 
                !gameObject.userData['isEditorCore'] && 
                !gameObject.userData['hideInHierarchy']) {
                
                // Agregar el objeto THREE.Object3D del GameObject
                objects.push(gameObject);
                
                // Agregar los hijos del GameObject
                if (gameObject.children) {
                    for (const child of gameObject.children) {
                        if (child instanceof THREE.Mesh || child instanceof THREE.Object3D) {
                            objects.push(child);
                        }
                    }
                }
            }
        }
        
        // Calcular las intersecciones
        const intersects = this.raycaster.intersectObjects(objects, true);
        
        // Si hay intersecciones, encontrar el GameObject correspondiente
        if (intersects.length > 0) {
            const intersectedObject = intersects[0].object;
            
            // Verificar si el objeto intersectado tiene una referencia directa a un GameObject padre
            if (intersectedObject.userData && intersectedObject.userData['parentGameObject']) {
                return intersectedObject.userData['parentGameObject'];
            }
            
            // Buscar el GameObject que contiene el objeto intersectado
            for (const gameObject of engine.gameObjects) {
                if (!gameObject) continue;
                
                // Verificar si el objeto intersectado es el GameObject
                if (gameObject === intersectedObject) {
                    return gameObject;
                }
                
                // Verificar si el objeto intersectado es un hijo del GameObject
                if (gameObject.children) {
                    let parent = intersectedObject.parent;
                    while (parent) {
                        if (parent === gameObject) {
                            return gameObject;
                        }
                        parent = parent.parent;
                    }
                }
            }
        }
        
        return null;
    }

    /**
     * Resetea un componente a sus valores por defecto
     * @param component Componente a resetear
     */
    resetComponent(component: any): void {
        if (!component) return;
        
        const componentType = component.constructor;
        const newComponent = new componentType();

        // Obtener los metadatos de las propiedades editables
        const keys = Object.keys(newComponent);
        for (const key of keys) {
            const metadata = Reflect.getMetadata("isEditable", component, key);
            if (metadata) {
                // Copiar el valor por defecto del nuevo componente al componente actual
                component.set(key, newComponent[key]);
            }
        }
        
        // Emitir evento de componente reseteado
        this.componentReset.emit(component);
    }
    
    /**
     * Elimina un componente de su GameObject
     * @param component Componente a eliminar
     */
    removeComponent(component: Component): void {
        if (!component || !component.gameObject) return;        
        // Eliminar el componente del GameObject
        component.gameObject.removeComponent(component);
    }
    
    /**
     * Copia un componente para pegar sus valores posteriormente
     * @param component Componente a copiar
     */
    copyComponent(component: any): void {
        if (!component) return;
        
        // Guardar referencia al componente copiado
        this.copiedComponent = component;
    }
    
    /**
     * Pega los valores del componente copiado en otro componente
     * @param targetComponent Componente destino
     */
    pasteComponentValues(targetComponent: any): void {
        if (!this.copiedComponent || !targetComponent) return;
        
        // Verificar que ambos componentes sean del mismo tipo
        if (this.copiedComponent.constructor !== targetComponent.constructor) {
            console.warn('No se pueden pegar valores entre componentes de diferentes tipos');
            return;
        }
        
        const keys = Object.keys(this.copiedComponent);
        for (const key of keys) {
            const metadata = Reflect.getMetadata("isEditable", this.copiedComponent, key);
            if (metadata) {
                targetComponent.set(key, this.copiedComponent[key]);
            }
        }
    }
    
    /**
     * Verifica si hay un componente copiado disponible para pegar
     * @returns true si hay un componente copiado, false en caso contrario
     */
    hasCopiedComponent(): boolean {
        return this.copiedComponent !== null;
    }

    /**
     * Obtiene la lista de componentes disponibles para añadir a un GameObject
     * @returns Lista de información de componentes disponibles
     */
    getAvailableComponents(): ComponentInfo[] {
        const components: ComponentInfo[] = [];
        
        // Geometría
        components.push({
            name: 'Box',
            description: 'Crea una caja 3D básica',
            icon: 'crop_square',
            type: BoxComponent
        });

        components.push({
            name: 'Box Collider',
            description: 'Añade un colisionador en forma de caja',
            icon: 'select_all',
            type: BoxColliderComponent
        });

        // Luces
        components.push({
            name: 'Directional Light',
            description: 'Luz direccional que ilumina toda la escena desde una dirección',
            icon: 'wb_sunny',
            type: DirectionalLightComponent
        });
        
        components.push({
            name: 'Spot Light',
            description: 'Luz focal que ilumina en forma de cono desde un punto',
            icon: 'highlight',
            type: SpotLightComponent
        });
        
        // Jugador
        components.push({
            name: 'Player Component',
            description: 'Componente para controlar un personaje jugable',
            icon: 'person',
            type: PlayerComponent
        });
        
        components.push({
            name: 'Player Physics',
            description: 'Añade física al personaje jugable',
            icon: 'directions_run',
            type: PlayerPhysicsComponent
        });
        
        components.push({
            name: 'Player Controller',
            description: 'Controla el movimiento del personaje jugable',
            icon: 'gamepad',
            type: PlayerControllerComponent
        });
        
        // Rejilla
        components.push({
            name: 'Grid Helper',
            description: 'Muestra una rejilla de referencia en la escena',
            icon: 'grid_on',
            type: GridHelperComponent
        });
        
        return components;
    }

    /**
     * Añade un componente a un GameObject
     * @param gameObject GameObject al que añadir el componente
     * @param componentType Tipo de componente a añadir
     * @returns El componente añadido
     */
    addComponentToGameObject(gameObject: GameObject, componentType: any): any {
        if (!gameObject) return null;
        
        try {
            // Crear una nueva instancia del componente
            const component = new componentType();
            gameObject.addComponent(component);
            return component;
        } catch (error) {
            console.error('Error al añadir componente:', error);
            return null;
        }
    }

    /**
     * Renombra un GameObject
     * @param gameObject GameObject a renombrar
     * @param newName Nuevo nombre
     */
    public renameGameObject(gameObject: GameObject, newName: string) {
        if (!gameObject || !newName) return;
        
        // Verificar que el nombre sea único
        const existingObject = engine.gameObjects.find(go => go.name === newName);
        if (existingObject) {
            console.warn(`Ya existe un GameObject con el nombre ${newName}`);
            return;
        }
        
        // Renombrar el GameObject
        gameObject.setName(newName);
    }

    /**
     * Añade un modelo a la escena desde el caché
     * @param uuid UUID del modelo en caché
     * @returns Promise con el GameObject creado
     */
    async addModelToSceneFromCache(uuid: string): Promise<GameObject | undefined> {
        try {
            // Obtener el modelo del caché
            const modelInfo = this.modelCacheService.getModel(uuid);
            if (!modelInfo) {
                return undefined;
            }
            
            // Incrementar el contador de referencias del modelo
            this.modelCacheService.incrementReferenceCount(uuid);
            
            // Crear un nuevo GameObject
            const gameObject = new GameObject();
            gameObject.name = modelInfo.name;
            
            // Añadir el modelo como hijo del GameObject
            const modelObject = modelInfo.rootObject.clone();
            gameObject.add(modelObject);
            
            // Añadir el EditableObjectComponent
            const editableObjectComponent = new EditableObjectComponent();
            gameObject.addComponent(editableObjectComponent);
            
            // Añadir el ModelComponent e inicializarlo con los datos del modelo
            const modelComponent = new ModelComponent();
            
            // Recopilar todas las mallas en el modelo y registrar materiales y texturas
            const meshes: THREE.Mesh[] = [];
            const materials: Set<THREE.Material> = new Set();
            const textures: THREE.Texture[] = [];
            
            modelObject.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    meshes.push(child);
                    
                    // Asegurarse de que el mesh tenga userData para ser seleccionable
                    child.userData = child.userData || {};
                    // Referencia al GameObject padre para facilitar la selección
                    child.userData['parentGameObject'] = gameObject;
                    
                    // Registrar materiales
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => materials.add(mat));
                        } else {
                            materials.add(child.material);
                        }
                    }
                }
            });
            
            // Extraer todas las texturas del modelo
            modelObject.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(mat => {
                            if (mat instanceof THREE.MeshStandardMaterial) {
                                if (mat.map) textures.push(mat.map);
                                if (mat.normalMap) textures.push(mat.normalMap);
                                if (mat.roughnessMap) textures.push(mat.roughnessMap);
                                if (mat.metalnessMap) textures.push(mat.metalnessMap);
                                if (mat.emissiveMap) textures.push(mat.emissiveMap);
                                if (mat.aoMap) textures.push(mat.aoMap);
                                if (mat.displacementMap) textures.push(mat.displacementMap);
                            }
                        });
                    } else if (object.material instanceof THREE.MeshStandardMaterial) {
                        const mat = object.material;
                        if (mat.map) textures.push(mat.map);
                        if (mat.normalMap) textures.push(mat.normalMap);
                        if (mat.roughnessMap) textures.push(mat.roughnessMap);
                        if (mat.metalnessMap) textures.push(mat.metalnessMap);
                        if (mat.emissiveMap) textures.push(mat.emissiveMap);
                        if (mat.aoMap) textures.push(mat.aoMap);
                        if (mat.displacementMap) textures.push(mat.displacementMap);
                    }
                }
            });
            
            // Procesar las texturas en lotes para mejorar el rendimiento
            this.processTexturesBatch(textures, modelInfo.name);
            
            // Registrar materiales en el ResourceService si no están ya registrados
            const materialUuids: string[] = [];
            materials.forEach(material => {
                // Asegurarse de que el material tenga un nombre
                if (!material.name) {
                    material.name = `${modelInfo.name}_Material_${materialUuids.length + 1}`;
                }
                
                // Check if this material is already in the model's materials list in the cache
                const existingMaterialUuid = modelInfo.materials.find(uuid => {
                    const cachedMaterial = this.resourceService.materials.get(uuid);
                    return cachedMaterial && cachedMaterial.resource.uuid === material.uuid;
                });
                
                if (existingMaterialUuid) {
                    // Material is already in the cache, just increment its reference count
                    const existingMaterial = this.resourceService.materials.get(existingMaterialUuid);
                    if (existingMaterial) {
                        existingMaterial.refCount++;
                        materialUuids.push(existingMaterialUuid);
                    }
                } else {
                    // Check if the material is already in the resource service by its UUID
                    let materialUuid = '';
                    let materialAlreadyExists = false;
                    
                    // Check all materials to find if this one already exists
                    for (const [uuid, info] of this.resourceService.materials.entries()) {
                        if (info.resource.uuid === material.uuid) {
                            info.refCount++;
                            materialUuid = uuid;
                            materialAlreadyExists = true;
                            break;
                        }
                    }
                    
                    // If not found, register the material
                    if (!materialAlreadyExists) {
                        const materialName = material.name || `${modelInfo.name}_Material_${materialUuids.length + 1}`;
                        materialUuid = this.resourceService.addMaterial(material, materialName);
                        
                        // Add the UUID to the model's materials list if not already there
                        if (!modelInfo.materials.includes(materialUuid)) {
                            modelInfo.materials.push(materialUuid);
                        }
                    }
                    
                    materialUuids.push(materialUuid);
                }
            });
            
            // Registrar texturas en el ResourceService si no están ya registradas
            const textureUuids: string[] = [];
            textures.forEach(texture => {
                // Check if this texture is already in the model's textures list in the cache
                const existingTextureUuid = modelInfo.textures.find(uuid => {
                    const cachedTexture = this.resourceService.textures.get(uuid);
                    return cachedTexture && cachedTexture.resource.uuid === texture.uuid;
                });
                
                if (existingTextureUuid) {
                    // Texture is already in the cache, just increment its reference count
                    const existingTexture = this.resourceService.textures.get(existingTextureUuid);
                    if (existingTexture) {
                        existingTexture.refCount++;
                        textureUuids.push(existingTextureUuid);
                    }
                } else {
                    // Check if the texture is already in the resource service by its UUID
                    let textureUuid = '';
                    let textureAlreadyExists = false;
                    
                    // Check all textures to find if this one already exists
                    for (const [uuid, info] of this.resourceService.textures.entries()) {
                        if (info.resource.uuid === texture.uuid) {
                            info.refCount++;
                            textureUuid = uuid;
                            textureAlreadyExists = true;
                            break;
                        }
                    }
                    
                    // If not found, register the texture
                    if (!textureAlreadyExists) {
                        // Create a name for the texture based on the model
                        const textureName = texture.name || `${modelInfo.name}_Texture_${textureUuids.length + 1}`;
                        
                        // Register the texture in the ResourceService
                        const textureInfo: ResourceInfo<THREE.Texture> = {
                            resource: texture,
                            refCount: 1,
                            name: textureName,
                            uuid: texture.uuid
                        };
                        this.resourceService.textures.set(texture.uuid, textureInfo);
                        textureUuid = texture.uuid;
                        
                        // Add the UUID to the model's textures list if not already there
                        if (!modelInfo.textures.includes(textureUuid)) {
                            modelInfo.textures.push(textureUuid);
                        }
                    }
                    
                    textureUuids.push(textureUuid);
                }
            });
            
            // Notificar cambios en materiales y texturas
            this.resourceService.materialsSubject.next(new Map(this.resourceService.materials));
            this.resourceService.texturesSubject.next(new Map(this.resourceService.textures));
            
            // Si encontramos al menos una malla, inicializar el ModelComponent con el objeto del modelo
            if (meshes.length > 0) {
                // Obtener animaciones del modelo
                const animations = this.modelCacheService.getModelAnimations(modelInfo.uuid);
                
                // Inicializar con el objeto del modelo y las animaciones
                modelComponent.initWithObject(modelObject, animations);
                modelComponent.setModelData(modelInfo.url, modelInfo.modelType, modelInfo.uuid);
                gameObject.addComponent(modelComponent);
                
                // Guardar referencia al UUID del modelo en el userData del GameObject
                gameObject.userData = gameObject.userData || {};
                gameObject.userData['modelUuid'] = modelInfo.uuid;
                
                // Registrar la acción para el historial
                const actionState = {
                    modelUuid: modelInfo.uuid,
                    gameObject: gameObject,
                    url: modelInfo.url,
                    modelType: modelInfo.modelType,
                    name: modelInfo.name
                };
                const addModelAction = new AddModelAction(actionState, this.modelCacheService);
                this.editorEventsService.emitAction(addModelAction);
            }
            
            // Añadir el GameObject a la escena
            engine.addGameObjects(gameObject);
            
            // Seleccionar el GameObject recién creado
            if (this.editableSceneComponent) {
                this.editableSceneComponent.selectedObject.next(gameObject);
            }
            
            return gameObject;
        } catch (error) {
            console.error('Error adding model from cache:', error);
            return undefined;
        }
    }
    
    /**
     * Crea una imagen accesible para una textura
     * @param texture Textura para la que crear una imagen accesible
     */
    private createAccessibleTextureImage(texture: THREE.Texture): void {
        if (!texture.image) return;
        
        try {
            // Si la textura ya tiene una imagen con src, no hacer nada
            if (texture.image.src) return;
            
            // Verificar si ya existe una previsualización en caché o si se puede obtener una
            if (texture.uuid) {
                const previewUrl = this.resourceService.getTexturePreviewUrl(texture);
                if (previewUrl) {
                    return;
                }
            }
            
            // Crear un canvas y dibujar la imagen de la textura en él
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) return;
            
            // Establecer el tamaño del canvas (limitar a un tamaño máximo para mejorar rendimiento)
            const maxSize = 128; // Tamaño máximo para previsualizaciones
            const width = Math.min(texture.image.width || 64, maxSize);
            const height = Math.min(texture.image.height || 64, maxSize);
            canvas.width = width;
            canvas.height = height;
            
            // Dibujar la imagen en el canvas
            if (texture.image instanceof HTMLImageElement || 
                texture.image instanceof HTMLCanvasElement ||
                texture.image instanceof ImageBitmap) {
                ctx.drawImage(texture.image, 0, 0, width, height);
            } else if (texture.image instanceof ImageData) {
                ctx.putImageData(texture.image, 0, 0);
            } else {
                // Si no podemos dibujar la imagen, crear una imagen de color sólido
                ctx.fillStyle = '#888888';
                ctx.fillRect(0, 0, width, height);
            }
            
            // Generar una URL de datos con calidad reducida para mejorar rendimiento
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            
            // Guardar la previsualización en el ResourceService
            if (texture.uuid && this.resourceService.saveTexturePreview) {
                this.resourceService.saveTexturePreview(texture.uuid, dataUrl);
            }
            
            // No reemplazamos la imagen original de la textura para evitar problemas de rendimiento
            // Solo guardamos la previsualización en el ResourceService
        } catch (e) {
            console.warn('Error al crear imagen accesible para textura:', e);
        }
    }
    
    /**
     * Clona un modelo del caché
     * @param uuid UUID del modelo en caché
     * @returns Promise con el GameObject clonado
     */
    async cloneModelFromCache(uuid: string): Promise<GameObject | undefined> {
        return this.addModelToSceneFromCache(uuid);
    }

    /**
     * Carga un modelo 3D
     * @param url URL del modelo
     * @param modelType Tipo de modelo
     * @returns Promise con el objeto cargado y sus animaciones
     */
    async loadModel(url: string, modelType: string): Promise<{ object: THREE.Object3D, animations: THREE.AnimationClip[] } | undefined> {
        try {
            // Determinar el loader adecuado según el tipo de modelo
            let loader;
            switch (modelType.toLowerCase()) {
                case 'gltf':
                case '.gltf':
                case 'glb':
                case '.glb':
                    loader = new GLTFLoader();
                    // Configurar el loader GLTF con extensiones
                    const dracoLoader = new DRACOLoader();
                    dracoLoader.setDecoderPath('assets/draco/');
                    loader.setDRACOLoader(dracoLoader);
                    
                    // Cargar el modelo GLTF/GLB
                    const gltf = await loader.loadAsync(url);
                    return {
                        object: gltf.scene,
                        animations: gltf.animations || []
                    };
                    
                case 'fbx':
                case '.fbx':
                    loader = new FBXLoader();
                    const fbx = await loader.loadAsync(url);
                    return {
                        object: fbx,
                        animations: fbx.animations || []
                    };
                    
                case 'obj':
                case '.obj':
                    loader = new OBJLoader();
                    const obj = await loader.loadAsync(url);
                    return {
                        object: obj,
                        animations: [] // OBJ no soporta animaciones
                    };
                    
                case 'vrm':
                case '.vrm':
                    // Para VRM, usamos el loader GLTF con el plugin VRM
                    loader = new GLTFLoader();
                    // Si tienes el plugin VRM, descomentar estas líneas:
                    // const vrmPlugin = new VRMLoaderPlugin();
                    // loader.register(callback => callback(vrmPlugin));
                    
                    const vrm = await loader.loadAsync(url);
                    return {
                        object: vrm.scene,
                        animations: vrm.animations || []
                    };
                    
                default:
                    console.error(`Tipo de modelo no soportado: ${modelType}`);
                    return undefined;
            }
        } catch (error) {
            console.error('Error cargando modelo:', error);
            return undefined;
        }
    }

    /**
     * Procesa un lote de texturas de forma eficiente
     * @param textures Array de texturas a procesar
     * @param modelName Nombre del modelo al que pertenecen las texturas
     */
    private processTexturesBatch(textures: THREE.Texture[], modelName: string): void {
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
                    const previewUrl = this.resourceService.getTexturePreviewUrl(texture);
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