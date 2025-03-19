import { ChangeDetectorRef, Component, ElementRef, HostListener, Inject, ViewChild, afterNextRender, CUSTOM_ELEMENTS_SCHEMA, PLATFORM_ID } from '@angular/core';
import { engine } from '../simple-engine/core/engine/engine';
import { GameObject } from '../simple-engine/core/gameobject';
import { CommonModule } from '@angular/common';
import { ComponentComponent } from './component/component.component';
import { EditorService } from './editor.service';
import { ContextMenuComponent } from './context-menu/context-menu.component';
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
import { ContextMenuService } from './context-menu/context-menu.service';
import { ResourceDialogService } from './resource-manager/resource-dialog.service';
import { ResizablePanelComponent } from './resizable-panel/resizable-panel.component';
import { ResourceExplorerComponent } from './resource-explorer/resource-explorer.component';

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
        ResourceExplorerComponent,
        ResizablePanelComponent
    ],
    templateUrl: './editor.component.html',
    styleUrl: './editor.component.scss',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
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
        private resourceDialogService: ResourceDialogService,
        @Inject(PLATFORM_ID) private platformId: Object
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
        this.editorService.componentReset.subscribe(() => {
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
        
        
        // Seleccionar el objeto Environment por defecto
        if (environmentObject) {
            this.selectGameObject(environmentObject);
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
        if (engine.scene && engine.camera) {
            engine.onResize(event);
        }
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

    ngAfterViewInit() {
        // Registrar el menú contextual en el servicio
        this.contextMenuService.registerContextMenu(this.contextMenu);
    }
    
    /**
     * Actualiza el viewport del motor para que coincida con el tamaño actual del contenedor
     */
    private updateEngineViewport() {        
        if (this.viewer && this.viewer.nativeElement && engine.scene && engine.camera) {
            // Forzar una actualización del tamaño del motor
            engine.onResize();
        }
    }
    
    /**
     * Método llamado cuando cambian las dimensiones de los paneles
     */
    onPanelDimensionsChanged() {
        // Actualizar el viewport del motor
        this.updateEngineViewport();
    }
}