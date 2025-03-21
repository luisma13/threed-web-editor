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
import { ComponentInfo } from './component-selector/component-selector-dialog.component';
import { Component } from "../simple-engine/core/component";
import { BoxComponent } from "../simple-engine/components/geometry/box.component";
import { BoxColliderComponent } from "../simple-engine/components/geometry/box-collider.component";
import { TextureManagerAdapter } from './resource-manager/texture-manager-adapter.service';
import { MaterialManagerAdapter } from './resource-manager/material-manager-adapter.service';
import { ModelCacheAdapter } from './resource-manager/model-cache-adapter.service';
import { EditorEventsService } from './editor-events.service';

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
        private textureManager: TextureManagerAdapter,
        private materialManager: MaterialManagerAdapter,
        private modelCache: ModelCacheAdapter,
        private editorEventsService: EditorEventsService
    ) {
        // Solo crear el input si estamos en el navegador
        if (isPlatformBrowser(this.platformId)) {
            // Crear input para cargar archivos
            this.input = document.createElement('input');
            this.input.type = 'file';
            this.input.style.display = 'none';
            document.body.appendChild(this.input);

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
                                console.log('Loading model:', fileName);
                                const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();

                                // Use the file extension as the model type
                                const modelType = this.getModelTypeFromExtension(fileExtension);
                                const gameObject = await this.loadModelWithCache(fileUrl, modelType, fileName);
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

            // For direct URLs, extract the file name and determine model type
            const urlFileName = url.split('/').pop()?.split('?')[0] || 'Model';
            const modelType = this.getModelTypeFromExtension(extension);
            return this.loadModelWithCache(url, modelType, urlFileName);
        } catch (error) {
            console.error('Error adding model to scene:', error);
            return undefined;
        }
    }

    private getModelTypeFromExtension(extension: string): string {
        switch (extension.toLowerCase()) {
            case '.gltf':
            case '.glb':
                return 'gltf';
            case '.fbx':
                return 'fbx';
            case '.obj':
                return 'obj';
            case '.vrm':
                return 'vrm';
            default:
                throw new Error(`Unsupported model extension: ${extension}`);
        }
    }

    async loadModelWithCache(url: string, modelType: string, fileName: string): Promise<GameObject | undefined> {
        try {
            console.log('Loading model with name:', fileName);
            const model = await this.modelCache.loadModel(url, fileName);
            if (!model) {
                return undefined;
            }

            // Crear un nuevo GameObject para el modelo
            const gameObject = new GameObject();
            gameObject.name = fileName;
            gameObject.add(model);

            // Añadir el EditableObjectComponent
            gameObject.addComponent(new EditableObjectComponent());

            // Guardar referencia al UUID del modelo y nombre original
            gameObject.userData = {
                ...gameObject.userData,
                modelUuid: model.uuid,
                originalFileName: fileName
            };

            // Añadir el GameObject a la escena
            engine.addGameObjects(gameObject);

            return gameObject;
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
     * @param isChild Internal flag to handle child deletion differently
     */
    deleteGameObject(gameObject: GameObject, addToHistory: boolean = true, removeFromCache: boolean = false, isChild: boolean = false): void {
        if (!gameObject) return;

        // Handle model resources only for root objects (not children)
        if (!isChild) {
            const modelUuid = gameObject.userData?.['modelUuid'];
            if (modelUuid) {
                // Release model and its resources
                this.modelCache.releaseModel(modelUuid);
            }
        }

        // Unselect if selected
        if (this.editableSceneComponent.selectedObject.value === gameObject) {
            this.editableSceneComponent.unselectObject();
        }

        // Store parent references before removal
        const parentGameObject = gameObject.parentGameObject;

        // Delete children first
        if (gameObject.children && gameObject.children.length > 0) {
            // Create a copy of children array to avoid modification during iteration
            const children = [...gameObject.children];
            for (const child of children) {
                if (child instanceof GameObject) {
                    this.deleteGameObject(child, false, false, true);
                }
            }
        }

        // Remove from parent's children list if exists
        if (parentGameObject) {
            const childIndex = parentGameObject.childrenGameObjects.indexOf(gameObject);
            if (childIndex !== -1) {
                parentGameObject.childrenGameObjects.splice(childIndex, 1);
            }
        }

        // Remove from scene
        if (gameObject.parent) {
            gameObject.parent.remove(gameObject);
        }

        // Remove from engine's GameObject list
        const index = engine.gameObjects.indexOf(gameObject);
        if (index !== -1) {
            engine.gameObjects.splice(index, 1);
            engine.onGameobjectRemoved.next(gameObject);
        }

        // Clear circular references
        gameObject.childrenGameObjects = [];
        gameObject.parentGameObject = null;

        // Notify parent hierarchy change
        if (parentGameObject) {
            engine.onGameobjectHerarchyChanged.next(parentGameObject);
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
            const model = this.modelCache.getModel(uuid);
            if (!model) {
                return undefined;
            }

            // Crear un nuevo GameObject para el modelo
            const gameObject = new GameObject();
            gameObject.name = model.name || 'Model';
            gameObject.add(model.clone());

            // Añadir el EditableObjectComponent
            gameObject.addComponent(new EditableObjectComponent());

            // Guardar referencia al UUID del modelo
            gameObject.userData = {
                ...gameObject.userData,
                modelUuid: uuid
            };

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
     * Clona un modelo del caché
     * @param uuid UUID del modelo en caché
     * @returns Promise con el GameObject clonado
     */
    async cloneModelFromCache(uuid: string): Promise<GameObject | undefined> {
        return this.addModelToSceneFromCache(uuid);
    }
}