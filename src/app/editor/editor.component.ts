import { ChangeDetectorRef, Component, ElementRef, HostListener, NgModule, ViewChild, afterNextRender } from '@angular/core';
import { engine } from '../simple-engine/core/engine/engine';
import { GameObject } from '../simple-engine/core/gameobject';
import { CommonModule } from '@angular/common';
import { ComponentComponent } from './component/component.component';
import { EditorService } from './editor.service';
import { ContextMenuComponent, ContextType } from './context-menu/context-menu.component';
import { FormsModule } from '@angular/forms';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { MatIconModule } from '@angular/material/icon';
import { GameObjectsDraggableComponent } from './gameobject-draggables/gameobjects-draggables.component';
import { HistoryService } from './history/history.service';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FirstPersonCameraComponent } from '../simple-engine/components/camera/first-camera.component';
import { ContextMenuService } from './context-menu/context-menu.service';
import { ResourceManagerComponent } from './resource-manager/resource-manager.component';
import { ResourceDialogService } from './resource-manager/resource-dialog.service';

export class EditorModule { }

@Component({
    selector: 'app-editor',
    standalone: true,
    imports: [
        CommonModule,
        ComponentComponent,
        ContextMenuComponent,
        FormsModule,
        ToolbarComponent,
        MatIconModule,
        GameObjectsDraggableComponent,
        MatExpansionModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatTooltipModule,
        DragDropModule,
        ResourceManagerComponent
    ],
    templateUrl: './editor.component.html',
    styleUrl: './editor.component.scss'
})
export class EditorComponent {

    @ViewChild('viewer', { static: true }) viewer: ElementRef;
    @ViewChild('contextMenu', { static: true }) contextMenu: ContextMenuComponent;

    engine = engine;
    objectSelected: GameObject;

    keyTimers = {}

    constructor(
        private editorService: EditorService,
        private historyService: HistoryService,
        private changeDetector: ChangeDetectorRef,
        private contextMenuService: ContextMenuService,
        private resourceDialogService: ResourceDialogService
    ) {
        afterNextRender(() => this.initScene());
    }

    async initScene() {
        // Inicializar el motor
        engine.init(this.viewer.nativeElement, "#c3c3c3");

        this.animate = this.animate.bind(this);
        this.animate();

        const input = document.createElement('input');
        input.type = 'file';
        input.style.display = 'none';

        this.editorService.input = input;
        
        // Configurar el elemento del viewport en el EditorService
        this.editorService.setViewerElement(this.viewer);
        
        // Inicializar los componentes del editor ahora que el motor está listo
        this.editorService.initializeEditorComponents();
        
        // Suscribirse al evento de componente reseteado
        this.editorService.componentReset.subscribe(component => {
            console.log('Componente reseteado, actualizando UI:', component.name);
            // Forzar la actualización de la UI
            this.changeDetector.detectChanges();
        });

        // Crear la escena del editor y obtener el objeto Environment
        const environmentObject = await this.editorService.createEditorScene();
        
        this.editorService.editableSceneComponent?.selectedObject.subscribe(object => {
            if (object === this.objectSelected) return;

            // Verificar que el objeto no sea undefined o null
            if (object) {
                for (const go of GameObjectsDraggableComponent.gameObjectsHtmlElements) {
                    if (go) {
                        go.isSelected = go.gameObject === object;
                    }
                }

                this.objectSelected = object;
                this.editorService.editableSceneComponent?.selectObject(object);

                for (const obj of engine.gameObjects) {
                    if (obj) {
                        for (const component of obj.components) {
                            if (component && component['setHelperVisibility']) {
                                component['setHelperVisibility'](obj === object);
                            }
                        }
                    }
                }

                this.changeDetector.detectChanges();
            }
        });

        this.viewer.nativeElement.ondragover = (event) => event.preventDefault();
        this.viewer.nativeElement.ondrop = (event) => this.onDragged(event);
        
        // Configurar el elemento del viewport para la cámara en primera persona
        this.configureFirstPersonCamera();
        
        // Configurar eventos de clic derecho para el menú contextual
        this.setupContextMenuEvents();
        
        // Seleccionar el objeto Environment por defecto
        if (environmentObject) {
            this.selectGameObject(environmentObject);
        } else {
            // Si no hay objeto Environment, seleccionar el primero disponible
            setTimeout(() => {
                this.selectDefaultGameObject();
            }, 500);
        }
    }
    
    /**
     * Configura los eventos para el menú contextual
     */
    private setupContextMenuEvents() {
        // Desactivar el menú contextual predeterminado del navegador
        document.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
        
        // Configurar el evento de clic derecho en el visor
        this.viewer.nativeElement.addEventListener('contextmenu', (event: MouseEvent) => {
            this.handleContextMenu(event);
        });
        
        // Configurar eventos para los elementos de la jerarquía y componentes
        // Estos se manejarán en sus respectivos componentes
    }
    
    /**
     * Maneja el evento de clic derecho y determina el tipo de contexto
     */
    private handleContextMenu(event: MouseEvent) {
        event.preventDefault();
        
        // Determinar si se hizo clic en un GameObject en la escena
        const intersectedObject = this.editorService.getIntersectedObject(event);
        
        if (intersectedObject) {
            // Si se hizo clic en un GameObject, mostrar el menú contextual para GameObject
            this.contextMenuService.showContextMenu(event, 'gameObject', intersectedObject);
            
            // Seleccionar el objeto si no está seleccionado
            if (this.objectSelected !== intersectedObject) {
                this.selectGameObject(intersectedObject);
            }
        } else {
            // Si no se hizo clic en un GameObject, mostrar el menú contextual para la escena
            this.contextMenuService.showContextMenu(event, 'scene');
        }
    }
    
    /**
     * Maneja el evento de clic derecho en un componente
     */
    handleComponentContextMenu(event: MouseEvent, component: any) {
        event.preventDefault();
        event.stopPropagation();
        
        // Mostrar el menú contextual para el componente
        this.contextMenuService.showContextMenu(event, 'component', component);
    }
    
    /**
     * Maneja el evento de clic derecho en un GameObject de la jerarquía
     */
    handleGameObjectContextMenu(event: MouseEvent, gameObject: GameObject) {
        event.preventDefault();
        event.stopPropagation();
        
        // Mostrar el menú contextual para el GameObject
        this.contextMenuService.showContextMenu(event, 'gameObject', gameObject);
        
        // Seleccionar el GameObject si no está seleccionado
        if (this.objectSelected !== gameObject) {
            this.selectGameObject(gameObject);
        }
    }
    
    private configureFirstPersonCamera() {
        // Ya no es necesario buscar el componente en los GameObjects
        // porque ahora está en el EditorCoreGameObject
        if (this.editorService.firstPersonCameraComponent) {
            this.editorService.firstPersonCameraComponent.setViewportElement(this.viewer.nativeElement);
        }
    }

    animate() {
        engine.update();
        requestAnimationFrame(this.animate);

        if (engine.input.controlLeft && engine.input.keys.get('z')) {
            if (!this.keyTimers['z']) {
                this.historyService.undo();
                this.keyTimers['z'] = setTimeout(() => {
                    delete this.keyTimers['z'];
                }, 300);
            }
        }

        if (engine.input.controlLeft && engine.input.keys.get('y')) {
            if (!this.keyTimers['y']) {
                this.historyService.redo();
                this.keyTimers['y'] = setTimeout(() => {
                    delete this.keyTimers['y'];
                }, 300);
            }
        }

        if (engine.draggingObject) {
            this.changeDetector.detectChanges();
        }
    }

    @HostListener('window:resize', ['$event'])
    onResize(event) {
        engine.onResize(event);
    }

    async onDragged(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        const file = event.dataTransfer.files[0];
        const url = URL.createObjectURL(file);
        let extension = "." + file.name.split('.').pop();
        if (extension === ".glb") {
            extension = ".gltf";
        }
        await this.editorService.addModelToScene(extension, url);
    }

    // Métodos para incrementar/decrementar valores de transformación
    incrementValue(object: any, property: string, axis: string, amount: number = 0.1) {
        if (object && object[property] && object[property][axis] !== undefined) {
            object[property][axis] += amount;
        }
    }

    decrementValue(object: any, property: string, axis: string, amount: number = 0.1) {
        if (object && object[property] && object[property][axis] !== undefined) {
            object[property][axis] -= amount;
        }
    }

    /**
     * Verifica si un componente es interno del editor
     * @param component Componente a verificar
     * @returns true si es un componente interno del editor
     */
    isEditorComponent(component: any): boolean {
        return component && component.constructor && (component.constructor as any).isEditorComponent === true;
    }

    /**
     * Selecciona un GameObject específico
     * @param gameObject GameObject a seleccionar
     */
    private selectGameObject(gameObject: GameObject) {
        if (!gameObject) return;
        
        this.objectSelected = gameObject;
        this.editorService.editableSceneComponent?.selectObject(gameObject);
        
        // Actualizar la UI para mostrar el objeto seleccionado
        for (const go of GameObjectsDraggableComponent.gameObjectsHtmlElements) {
            if (go) {
                go.isSelected = go.gameObject === gameObject;
            }
        }
        
        // Actualizar la visibilidad de los helpers
        for (const obj of engine.gameObjects) {
            if (obj) {
                for (const component of obj.components) {
                    if (component && component['setHelperVisibility']) {
                        component['setHelperVisibility'](obj === gameObject);
                    }
                }
            }
        }
        
        this.changeDetector.detectChanges();
    }

    /**
     * Selecciona por defecto el GameObject de Environment o el primero disponible
     */
    private selectDefaultGameObject() {
        // Filtrar los GameObjects válidos que no son internos del editor
        const validGameObjects = engine.gameObjects.filter(obj => 
            obj && obj.userData && !obj.userData['isEditorCore'] && !obj.userData['hideInHierarchy']
        );
        
        // Buscar el GameObject de Environment entre los válidos
        let environmentObject = validGameObjects.find(obj => obj.name === 'Environment');
        
        // Si no se encuentra Environment, usar el primer GameObject válido
        if (!environmentObject && validGameObjects.length > 0) {
            environmentObject = validGameObjects[0];
        }
        
        // Si se encontró un objeto, seleccionarlo
        if (environmentObject) {
            this.selectGameObject(environmentObject);
        }
    }

    ngAfterViewInit() {
        // Registrar el menú contextual en el servicio
        this.contextMenuService.registerContextMenu(this.contextMenu);
    }
}