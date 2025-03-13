import { ChangeDetectorRef, Component, ElementRef, HostListener, NgModule, ViewChild, afterNextRender, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
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
import { DragDropModule, CdkDragMove } from '@angular/cdk/drag-drop';
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
    styleUrl: './editor.component.scss',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class EditorComponent {

    @ViewChild('viewer', { static: true }) viewer: ElementRef;
    @ViewChild('contextMenu', { static: true }) contextMenu: ContextMenuComponent;

    engine = engine;
    objectSelected: GameObject;

    keyTimers = {}

    // Variables para el manejo de los divisores ajustables
    private isDraggingDivider = false;
    private dividerType: 'horizontal' | 'vertical-left' | 'vertical-right' = 'horizontal';
    private hierarchyPanel: HTMLElement | null = null;
    private resourcesPanel: HTMLElement | null = null;
    private leftSidebar: HTMLElement | null = null;
    private rightSidebar: HTMLElement | null = null;
    private initialHierarchyHeight = 0;
    private initialResourcesHeight = 0;
    private initialLeftSidebarWidth = 0;
    private initialRightSidebarWidth = 0;
    private sidebarHeight = 0;
    private viewportWidth = 0;
    private initialMouseX = 0;
    private initialMouseY = 0;

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

        // Inicializar los paneles ajustables
        this.initResizablePanels();
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
            this.onTransformChange();
        }
    }

    decrementValue(object: any, property: string, axis: string, amount: number = 0.1) {
        if (object && object[property] && object[property][axis] !== undefined) {
            object[property][axis] -= amount;
            this.onTransformChange();
        }
    }

    /**
     * Maneja los cambios en las propiedades de transformación
     */
    onTransformChange() {
        if (this.objectSelected) {
            // Actualizar la posición, rotación y escala del objeto seleccionado
            this.objectSelected.updateMatrix();
            this.objectSelected.updateMatrixWorld(true);
            
            // Notificar a los componentes que necesiten actualizarse
            if (this.editorService.editableSceneComponent) {
                this.editorService.editableSceneComponent.onChange(this.objectSelected);
            }
            
            // Forzar la actualización de la UI
            this.changeDetector.detectChanges();
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

    /**
     * Inicializa los paneles ajustables
     */
    private initResizablePanels() {
        // Obtener referencias a los paneles
        this.hierarchyPanel = document.querySelector('.hierarchy-panel');
        this.resourcesPanel = document.querySelector('.resources-panel');
        this.leftSidebar = document.querySelector('.editor-sidebar-left');
        this.rightSidebar = document.querySelector('.editor-sidebar-right');
        
        if (!this.hierarchyPanel || !this.resourcesPanel || !this.leftSidebar || !this.rightSidebar) {
            console.error('No se pudieron encontrar los elementos del panel');
            return;
        }
        
        // Cargar las alturas y anchos guardados o usar los predeterminados
        this.loadPanelDimensions();
    }
    
    /**
     * Carga las dimensiones de los paneles desde el almacenamiento local
     */
    private loadPanelDimensions() {
        if (!this.hierarchyPanel || !this.resourcesPanel || !this.leftSidebar || !this.rightSidebar) return;
        
        try {
            // Obtener las dimensiones guardadas
            const savedDimensions = localStorage.getItem('editorPanelDimensions');
            
            if (savedDimensions) {
                const dimensions = JSON.parse(savedDimensions);
                
                // Obtener el contenedor del sidebar y del editor
                const sidebarElement = this.hierarchyPanel.parentElement;
                const editorContent = document.querySelector('.editor-content');
                if (!sidebarElement || !editorContent) return;
                
                // Obtener las dimensiones totales disponibles
                const totalHeight = sidebarElement.offsetHeight;
                const totalWidth = editorContent.clientWidth;
                
                // Aplicar las dimensiones guardadas, asegurándose de que sean válidas
                if (dimensions.hierarchyHeight && dimensions.resourcesHeight) {
                    this.applyPanelHeights(dimensions.hierarchyHeight, dimensions.resourcesHeight, totalHeight);
                }
                
                if (dimensions.leftSidebarWidth && dimensions.rightSidebarWidth) {
                    this.applyPanelWidths(dimensions.leftSidebarWidth, dimensions.rightSidebarWidth, totalWidth);
                }
                
                return;
            }
        } catch (error) {
            console.error('Error al cargar las dimensiones de los paneles:', error);
        }
        
        // Si no hay dimensiones guardadas o hay un error, usar las predeterminadas
        this.applyDefaultDimensions();
    }
    
    /**
     * Aplica las alturas de los paneles
     */
    private applyPanelHeights(hierarchyHeight: number, resourcesHeight: number, totalHeight: number) {
        // Verificar que las alturas no excedan el espacio disponible
        const minHeight = 100; // Altura mínima en píxeles
        const dividerHeight = 8; // Altura del divisor
        
        // Calcular las alturas ajustadas
        let adjustedHierarchyHeight = Math.max(minHeight, hierarchyHeight);
        let adjustedResourcesHeight = Math.max(minHeight, resourcesHeight);
        
        // Ajustar si las alturas combinadas exceden el espacio disponible
        const totalRequiredHeight = adjustedHierarchyHeight + adjustedResourcesHeight + dividerHeight;
        if (totalRequiredHeight > totalHeight) {
            // Reducir proporcionalmente ambas alturas
            const ratio = (totalHeight - dividerHeight) / (adjustedHierarchyHeight + adjustedResourcesHeight);
            adjustedHierarchyHeight = Math.max(minHeight, Math.floor(adjustedHierarchyHeight * ratio));
            adjustedResourcesHeight = Math.max(minHeight, Math.floor(adjustedResourcesHeight * ratio));
        }
        
        // Aplicar las alturas ajustadas
        this.hierarchyPanel.style.flex = 'none';
        this.hierarchyPanel.style.height = `${adjustedHierarchyHeight}px`;
        this.resourcesPanel.style.height = `${adjustedResourcesHeight}px`;
        
        // Actualizar las alturas iniciales
        this.initialHierarchyHeight = adjustedHierarchyHeight;
        this.initialResourcesHeight = adjustedResourcesHeight;
        this.sidebarHeight = totalHeight;
    }
    
    /**
     * Aplica los anchos de los paneles
     */
    private applyPanelWidths(leftSidebarWidth: number, rightSidebarWidth: number, totalWidth: number) {
        // Verificar que los anchos no excedan el espacio disponible
        const minWidth = 200; // Ancho mínimo en píxeles
        const minViewportWidth = 400; // Ancho mínimo para el viewport
        
        // Calcular los anchos ajustados
        let adjustedLeftWidth = Math.max(minWidth, leftSidebarWidth);
        let adjustedRightWidth = Math.max(minWidth, rightSidebarWidth);
        
        // Asegurarse de que quede espacio para el viewport
        const availableWidth = totalWidth - adjustedLeftWidth - adjustedRightWidth;
        if (availableWidth < minViewportWidth) {
            // Reducir proporcionalmente ambos anchos
            const excessWidth = minViewportWidth - availableWidth;
            const ratio = excessWidth / (adjustedLeftWidth + adjustedRightWidth);
            adjustedLeftWidth = Math.max(minWidth, Math.floor(adjustedLeftWidth * (1 - ratio)));
            adjustedRightWidth = Math.max(minWidth, Math.floor(adjustedRightWidth * (1 - ratio)));
        }
        
        // Aplicar los anchos ajustados
        this.leftSidebar.style.width = `${adjustedLeftWidth}px`;
        this.rightSidebar.style.width = `${adjustedRightWidth}px`;
        
        // Actualizar los anchos iniciales
        this.initialLeftSidebarWidth = adjustedLeftWidth;
        this.initialRightSidebarWidth = adjustedRightWidth;
        this.viewportWidth = totalWidth - adjustedLeftWidth - adjustedRightWidth;
    }
    
    /**
     * Aplica dimensiones predeterminadas a los paneles
     */
    private applyDefaultDimensions() {
        // Obtener el contenedor del sidebar y del editor
        const sidebarElement = this.hierarchyPanel.parentElement;
        const editorContent = document.querySelector('.editor-content');
        if (!sidebarElement || !editorContent) return;
        
        // Calcular alturas predeterminadas
        const totalHeight = sidebarElement.offsetHeight;
        const dividerHeight = 8;
        this.initialHierarchyHeight = Math.floor((totalHeight - dividerHeight) * 0.7); // 70% para la jerarquía
        this.initialResourcesHeight = totalHeight - this.initialHierarchyHeight - dividerHeight; // El resto para recursos
        
        // Aplicar las alturas predeterminadas
        this.hierarchyPanel.style.flex = 'none';
        this.hierarchyPanel.style.height = `${this.initialHierarchyHeight}px`;
        this.resourcesPanel.style.height = `${this.initialResourcesHeight}px`;
        
        this.sidebarHeight = totalHeight;
        
        // Calcular anchos predeterminados
        const totalWidth = editorContent.clientWidth;
        this.initialLeftSidebarWidth = 300; // Ancho predeterminado del sidebar izquierdo
        this.initialRightSidebarWidth = 300; // Ancho predeterminado del sidebar derecho
        
        // Aplicar los anchos predeterminados
        this.leftSidebar.style.width = `${this.initialLeftSidebarWidth}px`;
        this.rightSidebar.style.width = `${this.initialRightSidebarWidth}px`;
        
        this.viewportWidth = totalWidth - this.initialLeftSidebarWidth - this.initialRightSidebarWidth;
    }

    /**
     * Guarda las dimensiones de los paneles en el almacenamiento local
     */
    private savePanelDimensions() {
        if (!this.hierarchyPanel || !this.resourcesPanel || !this.leftSidebar || !this.rightSidebar) return;
        
        try {
            // Guardar las dimensiones actuales
            const dimensions = {
                hierarchyHeight: this.hierarchyPanel.offsetHeight,
                resourcesHeight: this.resourcesPanel.offsetHeight,
                leftSidebarWidth: this.leftSidebar.offsetWidth,
                rightSidebarWidth: this.rightSidebar.offsetWidth
            };
            
            localStorage.setItem('editorPanelDimensions', JSON.stringify(dimensions));
        } catch (error) {
            console.error('Error al guardar las dimensiones de los paneles:', error);
        }
    }
    
    /**
     * Inicia el arrastre del divisor
     * @param e Evento del mouse
     * @param type Tipo de divisor ('horizontal', 'vertical-left', 'vertical-right')
     */
    public startDividerDrag(e: MouseEvent, type: 'horizontal' | 'vertical-left' | 'vertical-right') {
        e.preventDefault();
        this.isDraggingDivider = true;
        this.dividerType = type;
        
        // Guardar la posición inicial del mouse
        this.initialMouseX = e.clientX;
        this.initialMouseY = e.clientY;
        
        // Guardar las dimensiones iniciales según el tipo de divisor
        if (type === 'horizontal' && this.hierarchyPanel && this.resourcesPanel) {
            this.initialHierarchyHeight = this.hierarchyPanel.offsetHeight;
            this.initialResourcesHeight = this.resourcesPanel.offsetHeight;
            this.sidebarHeight = this.hierarchyPanel.offsetHeight + this.resourcesPanel.offsetHeight;
        } else if (type === 'vertical-left' && this.leftSidebar) {
            this.initialLeftSidebarWidth = this.leftSidebar.offsetWidth;
        } else if (type === 'vertical-right' && this.rightSidebar) {
            this.initialRightSidebarWidth = this.rightSidebar.offsetWidth;
        }
        
        // Añadir eventos temporales para el arrastre
        document.addEventListener('mousemove', this.onDividerDrag);
        document.addEventListener('mouseup', this.stopDividerDrag);
    }
    
    /**
     * Maneja el arrastre del divisor
     */
    private onDividerDrag = (e: MouseEvent) => {
        if (!this.isDraggingDivider) return;
        
        // Manejar el arrastre según el tipo de divisor
        if (this.dividerType === 'horizontal') {
            this.handleHorizontalDrag(e);
        } else if (this.dividerType === 'vertical-left') {
            this.handleVerticalLeftDrag(e);
        } else if (this.dividerType === 'vertical-right') {
            this.handleVerticalRightDrag(e);
        }
    }
    
    /**
     * Maneja el arrastre horizontal (ajuste de altura)
     */
    private handleHorizontalDrag(e: MouseEvent) {
        if (!this.hierarchyPanel || !this.resourcesPanel) return;
        
        // Obtener el contenedor del sidebar
        const sidebarElement = this.hierarchyPanel.parentElement;
        if (!sidebarElement) return;
        
        // Calcular la posición relativa del ratón dentro del sidebar
        const sidebarRect = sidebarElement.getBoundingClientRect();
        const relativeY = Math.max(0, Math.min(e.clientY - sidebarRect.top, sidebarRect.height));
        
        // Calcular las nuevas alturas
        const minHeight = 100; // Altura mínima en píxeles
        const maxHierarchyHeight = sidebarRect.height - minHeight - 8; // Restar la altura del divisor
        
        // Limitar la altura del panel de jerarquía entre minHeight y maxHierarchyHeight
        let newHierarchyHeight = Math.max(minHeight, Math.min(relativeY, maxHierarchyHeight));
        
        // La altura del panel de recursos es el resto del espacio disponible menos la altura del divisor
        let newResourcesHeight = sidebarRect.height - newHierarchyHeight - 8; // 8px es la altura del divisor
        
        // Aplicar las nuevas alturas
        this.hierarchyPanel.style.flex = 'none';
        this.hierarchyPanel.style.height = `${newHierarchyHeight}px`;
        this.resourcesPanel.style.height = `${newResourcesHeight}px`;
    }
    
    /**
     * Maneja el arrastre vertical del sidebar izquierdo (ajuste de ancho)
     */
    private handleVerticalLeftDrag(e: MouseEvent) {
        if (!this.leftSidebar) return;
        
        // Calcular el desplazamiento del mouse
        const deltaX = e.clientX - this.initialMouseX;
        
        // Calcular el nuevo ancho
        const minWidth = 200; // Ancho mínimo en píxeles
        const maxWidth = window.innerWidth - 600; // Ancho máximo (dejar espacio para el viewport y el sidebar derecho)
        
        // Limitar el ancho entre minWidth y maxWidth
        let newWidth = Math.max(minWidth, Math.min(this.initialLeftSidebarWidth + deltaX, maxWidth));
        
        // Aplicar el nuevo ancho
        this.leftSidebar.style.width = `${newWidth}px`;
    }
    
    /**
     * Maneja el arrastre vertical del sidebar derecho (ajuste de ancho)
     */
    private handleVerticalRightDrag(e: MouseEvent) {
        if (!this.rightSidebar) return;
        
        // Calcular el desplazamiento del mouse
        const deltaX = e.clientX - this.initialMouseX;
        
        // Calcular el nuevo ancho (negativo porque se arrastra desde la izquierda)
        const minWidth = 200; // Ancho mínimo en píxeles
        const maxWidth = window.innerWidth - 600; // Ancho máximo (dejar espacio para el viewport y el sidebar izquierdo)
        
        // Limitar el ancho entre minWidth y maxWidth
        let newWidth = Math.max(minWidth, Math.min(this.initialRightSidebarWidth - deltaX, maxWidth));
        
        // Aplicar el nuevo ancho
        this.rightSidebar.style.width = `${newWidth}px`;
    }
    
    /**
     * Detiene el arrastre del divisor
     */
    private stopDividerDrag = () => {
        this.isDraggingDivider = false;
        
        // Eliminar los eventos temporales
        document.removeEventListener('mousemove', this.onDividerDrag);
        document.removeEventListener('mouseup', this.stopDividerDrag);
        
        // Guardar las dimensiones actuales
        this.savePanelDimensions();
    }
}