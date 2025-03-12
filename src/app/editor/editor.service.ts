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
import { loadGLB, loadFBX, loadObj, loadVRM } from "../simple-engine/loaders/modelsLoader";
import * as THREE from "three";
import { PlayerComponent } from "../simple-engine/components/players/player.component";
import { PlayerPhysicsComponent } from "../simple-engine/components/players/player-physics.component";
import { PlayerControllerComponent } from "../simple-engine/components/players/player-controller.component";
import { loadDefaultEquirectangularHDR } from "../simple-engine/loaders/hdrLoader";
import { SceneExportService } from "./scene-export.service";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { ComponentInfo } from './component-selector/component-selector-dialog.component';
import { Component } from "../simple-engine/core/component";

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
        @Inject(PLATFORM_ID) private platformId: Object
    ) {
        // Solo crear el input si estamos en el navegador
        if (isPlatformBrowser(this.platformId)) {
            // Crear input para cargar archivos
            this.input = document.createElement('input');
            this.input.type = 'file';
            this.input.style.display = 'none';
            document.body.appendChild(this.input);
            
            // No inicializamos los componentes del editor aquí
            // Se inicializarán después de que el motor esté listo
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
        
        console.log('Editor components initialized successfully');
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

        // loadDefaultEquirectangularHDR();

        // Create cube
        // for (let i = 0; i < 5; i++) {
        //     const cube = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x000 }));
        //     const cubeObject = new GameObject(cube);
        //     cubeObject.name = "Cube " + i;
        //     cubeObject.position.set(i + 0.5, 0.25, 0);
        //     cubeObject.addComponent(new EditableObjectComponent());
        //     engine.addGameObjects(cubeObject);
        // }

        // load VRM
        const { vrm } = await loadVRM("assets/avatar.vrm");

        const player = new GameObject();
        player.name = "Player"
        player.isEnabled = true;
        // Añadir el componente EditableObjectComponent para que sea seleccionable
        player.addComponent(new EditableObjectComponent());
        engine.addGameObjects(player);

        const playerComponent = new PlayerComponent(player);
        await playerComponent.changeAvatar(vrm);

        // Asegurarse de que el modelo VRM sea seleccionable
        if (vrm && vrm.scene) {
            // Recorrer todos los meshes del modelo VRM y asegurarse de que sean seleccionables
            vrm.scene.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    // Asegurarse de que el mesh tenga userData para ser seleccionable
                    object.userData = object.userData || {};
                    // Referencia al GameObject padre para facilitar la selección
                    object.userData['parentGameObject'] = player;
                }
            });
        }

        // await playerComponent.addUserAnimToMap("Test", "assets/Idle_Aiming_1H_Art_Flipped.fbx")
        playerComponent.changeAnim("Idle");

        // player.addComponent(playerComponent);
        // player.addComponent(new PlayerPhysicsComponent());
        // player.addComponent(new PlayerControllerComponent());
        // player.addComponent(new EditableObjectComponent());

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
        if (parent)
            parent.addGameObject(gameObject, false);
        else
            engine.addGameObjects(gameObject);

        this.editableSceneComponent.selectedObject.next(gameObject);
        return gameObject;
    }

    /**
     * Exporta la escena actual
     */
    exportScene() {
        // Verificar que estamos en el navegador
        if (!isPlatformBrowser(this.platformId)) return;

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
        // Verificar que estamos en el navegador
        if (!isPlatformBrowser(this.platformId)) return;

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

    async addModelToScene(extension: string, url?: string) {
        if (!url) {
            return new Promise<void>((resolve) => {
                this.input.onchange = async (event) => {
                    const file = (event.target as HTMLInputElement).files[0];
                    const fileUrl = URL.createObjectURL(file);
                    await this.loadModel(extension, fileUrl);
                    resolve();
                };
                this.input.click();
            });
        } else {
            await this.loadModel(extension, url);
        }
    }

    private async loadModel(extension: string, url: string) {
        let model: THREE.Object3D;
        switch (extension) {
            case '.gltf':
                model = await this.loadGLTF(url);
                break;
            case '.fbx':
                model = await this.loadFBX(url);
                break;
            case '.obj':
                model = await this.loadOBJ(url);
                break;
            case '.vrm':
                // Usar GLTFLoader para VRM si VRMLoader no está disponible
                model = await this.loadGLTF(url);
                break;
        }

        if (model) {
            // Crear un nuevo GameObject con el nombre del archivo
            const fileName = url.split('/').pop().split('.')[0];
            const gameObject = new GameObject();
            gameObject.name = fileName;
            
            // Añadir el modelo 3D al GameObject
            gameObject.add(model);
            
            // Añadir el GameObject a la escena
            engine.addGameObjects(gameObject);

            // Seleccionar el objeto recién creado
            if (this.editableSceneComponent) {
                this.editableSceneComponent.selectedObject.next(gameObject);
            }
        }
    }

    private loadGLTF(url: string): Promise<THREE.Object3D> {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.load(url, (gltf) => {
                resolve(gltf.scene);
            }, undefined, (error) => {
                console.error('Error loading GLTF model:', error);
                reject(error);
            });
        });
    }

    private loadFBX(url: string): Promise<THREE.Object3D> {
        return new Promise((resolve, reject) => {
            const loader = new FBXLoader();
            loader.load(url, (fbx) => {
                resolve(fbx);
            }, undefined, (error) => {
                console.error('Error loading FBX model:', error);
                reject(error);
            });
        });
    }

    private loadOBJ(url: string): Promise<THREE.Object3D> {
        return new Promise((resolve, reject) => {
            const loader = new OBJLoader();
            loader.load(url, (obj) => {
                resolve(obj);
            }, undefined, (error) => {
                console.error('Error loading OBJ model:', error);
                reject(error);
            });
        });
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
        
        // Verificar si el componente tiene un método reset
        if (typeof component.reset === 'function') {
            component.reset();
            
            // Emitir evento de componente reseteado
            this.componentReset.emit(component);
            return;
        }
        
        // Si no tiene un método reset, crear una nueva instancia del mismo tipo
        const gameObject = component.gameObject;
        const componentType = component.constructor;
        
        // Guardar los valores personalizados que queremos preservar
        const preservedValues = {};
        
        // Obtener los metadatos de las propiedades editables
        const keys = Object.keys(component);
        for (const key of keys) {
            const metadata = Reflect.getMetadata("isEditable", component, key);
            if (metadata) {
                preservedValues[key] = component[key];
            }
        }
        
        // Limpiar el componente antes de eliminarlo
        if (typeof component.cleanup === 'function') {
            console.log('Llamando al método cleanup antes de resetear:', componentType.name);
            component.cleanup();
        } else if (typeof component.dispose === 'function') {
            console.log('Llamando al método dispose antes de resetear:', componentType.name);
            component.dispose();
        } else {
            console.log('El componente no tiene método cleanup o dispose:', componentType.name);
            // Intentar limpiar objetos THREE.js comunes
            this.cleanupCommonThreeObjects(component);
        }
        
        // Eliminar el componente actual
        gameObject.removeComponent(component);
        
        // Añadir una nueva instancia del mismo tipo
        const newComponent = new componentType();
        gameObject.addComponent(newComponent);
        
        // Restaurar los valores personalizados
        for (const key in preservedValues) {
            if (newComponent.hasOwnProperty(key)) {
                newComponent[key] = preservedValues[key];
                
                // Si el componente tiene un método set, llamarlo para actualizar el valor
                if (typeof newComponent.set === 'function') {
                    newComponent.set(key, preservedValues[key]);
                }
            }
        }
        
        console.log('Componente reseteado correctamente:', componentType.name);
        
        // Emitir evento de componente reseteado
        this.componentReset.emit(newComponent);
    }
    
    /**
     * Elimina un componente de su GameObject
     * @param component Componente a eliminar
     */
    removeComponent(component: any): void {
        if (!component || !component.gameObject) return;
        
        // Verificar si el componente tiene un método de limpieza
        if (typeof component.cleanup === 'function') {
            console.log('Llamando al método cleanup del componente:', component.constructor.name);
            component.cleanup();
        } else if (typeof component.dispose === 'function') {
            console.log('Llamando al método dispose del componente:', component.constructor.name);
            component.dispose();
        } else {
            console.log('El componente no tiene método cleanup o dispose:', component.constructor.name);
            // Intentar limpiar objetos THREE.js comunes
            this.cleanupCommonThreeObjects(component);
        }
        
        // Eliminar el componente del GameObject
        component.gameObject.removeComponent(component);
    }
    
    /**
     * Intenta limpiar objetos THREE.js comunes que podrían estar asociados al componente
     * @param component Componente a limpiar
     */
    private cleanupCommonThreeObjects(component: any): void {
        // Verificar si el componente tiene propiedades que podrían ser objetos THREE.js
        for (const key in component) {
            const value = component[key];
            
            // Ignorar propiedades nulas, indefinidas o que no son objetos
            if (!value || typeof value !== 'object') continue;
            
            // Limpiar luces
            if (value instanceof THREE.Light) {
                console.log('Eliminando luz:', value.type);
                if (value.parent) {
                    value.parent.remove(value);
                }
                // Limpiar sombras si existen
                if (value.shadow && value.shadow.map) {
                    value.shadow.map.dispose();
                }
            }
            
            // Limpiar geometrías
            if (value instanceof THREE.BufferGeometry) {
                console.log('Eliminando geometría');
                value.dispose();
            }
            
            // Limpiar materiales
            if (value instanceof THREE.Material) {
                console.log('Eliminando material');
                value.dispose();
            }
            
            // Limpiar texturas
            if (value instanceof THREE.Texture) {
                console.log('Eliminando textura');
                value.dispose();
            }
            
            // Limpiar mallas
            if (value instanceof THREE.Mesh) {
                console.log('Eliminando malla');
                if (value.parent) {
                    value.parent.remove(value);
                }
                if (value.geometry) {
                    value.geometry.dispose();
                }
                if (value.material) {
                    if (Array.isArray(value.material)) {
                        value.material.forEach(material => material.dispose());
                    } else {
                        value.material.dispose();
                    }
                }
            }
        }
    }
    
    /**
     * Copia un componente para pegar sus valores posteriormente
     * @param component Componente a copiar
     */
    copyComponent(component: any): void {
        if (!component) return;
        
        // Guardar referencia al componente copiado
        this.copiedComponent = component;
        
        // Habilitar la opción de pegar en el menú contextual
        // Esto se implementará en el ContextMenuComponent
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
        
        // Copiar los valores de las propiedades
        for (const key in this.copiedComponent) {
            // Evitar copiar propiedades internas o referencias
            if (
                key !== 'gameObject' && 
                key !== 'id' && 
                !key.startsWith('_') && 
                typeof this.copiedComponent[key] !== 'function'
            ) {
                // Copiar el valor
                targetComponent[key] = this.copiedComponent[key];
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
        // Lista de componentes disponibles con su información
        const components: ComponentInfo[] = [];
        
        // Añadir componentes de luz
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
        
        // Añadir componentes de jugador
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
        
        // Añadir componente de rejilla
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
            
            // Añadir el componente al GameObject
            gameObject.addComponent(component);
            
            // No necesitamos seleccionar el GameObject de nuevo
            // ya que ya está seleccionado en el contexto del menú
            
            return component;
        } catch (error) {
            console.error('Error al añadir componente:', error);
            return null;
        }
    }
}