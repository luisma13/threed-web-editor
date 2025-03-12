import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, Input } from '@angular/core';
import { EditorService } from '../editor.service';
import { HistoryService } from '../history/history.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ComponentSelectorDialogComponent } from '../component-selector/component-selector-dialog.component';

export interface MenuItem {
  label?: string;
  action?: string;
  icon?: string;
  disabled?: boolean;
  items?: MenuItem[];
  type?: 'normal' | 'separator';
}

export type ContextType = 'scene' | 'gameObject' | 'component' | null;

@Component({
    standalone: true,
    imports: [CommonModule, MatDialogModule],
    selector: 'app-context-menu',
    templateUrl: './context-menu.component.html',
    styleUrls: ['./context-menu.component.scss']
})
export class ContextMenuComponent {
    @Input() viewerMenuItems: MenuItem[] = [];

    isVisible: boolean = false;
    x: number = 0;
    y: number = 0;
    
    contextType: ContextType = null;
    contextObject: any = null;
    currentMenuItems: MenuItem[] = [];

    // Menú para la escena
    private sceneMenuItems: MenuItem[] = [
        { label: 'Undo', action: 'undo', icon: 'undo', disabled: true },
        { label: 'Redo', action: 'redo', icon: 'redo', disabled: true },
        { type: 'separator' },
        { 
            label: 'Scene', 
            icon: 'cubes',
            items: [
                { label: 'Export Scene', action: 'export:scene', icon: 'file-export' },
                { label: 'Import Scene', action: 'import:scene', icon: 'file-import' }
            ]
        },
        { 
            label: 'Create', 
            icon: 'plus',
            items: [
                { label: 'Empty GameObject', action: 'create:empty', icon: 'cube' },
                { label: 'Primitive', icon: 'shapes', items: [
                    { label: 'Cube', action: 'create:cube', icon: 'cube' },
                    { label: 'Sphere', action: 'create:sphere', icon: 'circle' },
                    { label: 'Plane', action: 'create:plane', icon: 'square' },
                    { label: 'Cylinder', action: 'create:cylinder', icon: 'cylinder' }
                ]},
                { type: 'separator' },
                { label: 'Light', icon: 'lightbulb', items: [
                    { label: 'Directional Light', action: 'create:directionalLight', icon: 'sun' },
                    { label: 'Point Light', action: 'create:pointLight', icon: 'lightbulb' },
                    { label: 'Spot Light', action: 'create:spotLight', icon: 'flashlight' }
                ]}
            ]
        },
        { 
            label: 'Import', 
            icon: 'file-import',
            items: [
                { label: 'Load GLTF/GLB', action: 'load:.gltf', icon: 'file-import' },
                { label: 'Load FBX', action: 'load:.fbx', icon: 'file-import' },
                { label: 'Load OBJ', action: 'load:.obj', icon: 'file-import' },
                { label: 'Load VRM', action: 'load:.vrm', icon: 'user' }
            ]
        }
    ];

    // Menú para GameObjects
    private gameObjectMenuItems: MenuItem[] = [
        { label: 'Rename', action: 'gameObject:rename', icon: 'edit' },
        { label: 'Duplicate', action: 'gameObject:duplicate', icon: 'copy' },
        { label: 'Delete', action: 'gameObject:delete', icon: 'trash' },
        { type: 'separator' },
        { label: 'Add Component', action: 'component:add', icon: 'plus' }
    ];

    // Menú para componentes
    private componentMenuItems: MenuItem[] = [
        { label: 'Reset', action: 'component:reset', icon: 'undo' },
        { label: 'Remove', action: 'component:remove', icon: 'trash' },
        { label: 'Copy', action: 'component:copy', icon: 'copy' },
        { label: 'Paste Values', action: 'component:paste', icon: 'paste', disabled: true }
    ];

    constructor(
        private editorService: EditorService,
        private historyService: HistoryService,
        private changeDetectorRef: ChangeDetectorRef,
        private dialog: MatDialog
    ) {}

    ngOnInit() {
        // Actualizar estado de undo/redo
        this.historyService.canUndo.subscribe(canUndo => {
            this.updateMenuItemState('undo', !canUndo);
        });
        
        this.historyService.canRedo.subscribe(canRedo => {
            this.updateMenuItemState('redo', !canRedo);
        });
        
        // Verificar si hay un componente copiado al mostrar el menú
        this.editorService.hasCopiedComponent();
    }

    get contextTypeTitle(): string {
        switch (this.contextType) {
            case 'scene': return 'Scene';
            case 'gameObject': 
                return this.contextObject?.name || 'GameObject';
            case 'component': 
                return this.contextObject?.constructor.name || 'Component';
            default: return '';
        }
    }

    updateMenuItemState(action: string, disabled: boolean) {
        const updateItems = (items: MenuItem[]) => {
            items.forEach(item => {
                if (item.action === action) {
                    item.disabled = disabled;
                }
                if (item.items) {
                    updateItems(item.items);
                }
            });
        };
        
        updateItems(this.sceneMenuItems);
        updateItems(this.gameObjectMenuItems);
        updateItems(this.componentMenuItems);
    }

    showContextMenu(event: MouseEvent, type: ContextType, contextObject: any = null) {
        event.preventDefault();
        console.log('ContextMenuComponent.showContextMenu:', type, contextObject?.name || contextObject?.constructor?.name);
        
        // Asegurarse de que las coordenadas estén dentro de la ventana
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Obtener las coordenadas del evento
        let x = event.clientX;
        let y = event.clientY;
        
        // Asegurarse de que el menú no se salga de la ventana
        if (x + 180 > windowWidth) {
            x = windowWidth - 180;
        }
        
        if (y + 200 > windowHeight) {
            y = windowHeight - 200;
        }
        
        this.x = x;
        this.y = y;
        this.contextType = type;
        this.contextObject = contextObject;
        
        // Seleccionar el menú adecuado según el contexto
        switch (type) {
            case 'scene':
                this.currentMenuItems = [...this.sceneMenuItems];
                break;
            case 'gameObject':
                this.currentMenuItems = [...this.gameObjectMenuItems];
                break;
            case 'component':
                this.currentMenuItems = [...this.componentMenuItems];
                // Actualizar el estado del botón de pegar según si hay un componente copiado
                this.updateMenuItemState('component:paste', !this.editorService.hasCopiedComponent());
                break;
            default:
                this.currentMenuItems = [...this.viewerMenuItems];
        }
        
        // Forzar la visibilidad del menú
        setTimeout(() => {
            this.isVisible = true;
            console.log('Menú contextual visible:', this.isVisible, 'en posición:', this.x, this.y);
            
            // Forzar la detección de cambios
            this.changeDetectorRef.detectChanges();
        }, 0);
    }

    @HostListener('document:contextmenu', ['$event'])
    onRightClick(event: MouseEvent) {
        // Este método será reemplazado por la lógica en el editor.component.ts
        // que determinará el tipo de contexto
        event.preventDefault();
        this.showContextMenu(event, 'scene');
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        if (this.isVisible) {
            this.isVisible = false;
        }
    }

    @HostListener('document:keydown', ['$event'])
    onEscapeDown(event: KeyboardEvent) {
        if (event.key === 'Escape' && this.isVisible) {
            this.isVisible = false;
        }
    }

    onItemClick(item: MenuItem, event?: MouseEvent) {
        if (event) {
            event.stopPropagation();
        }
        
        if (item.disabled || !item.action) {
            return;
        }
        
        this.isVisible = false;
        this.executeAction(item.action);
    }

    executeAction(action: string) {
        // Acciones generales
        if (action === 'undo') {
            this.historyService.undo();
            return;
        }
        
        if (action === 'redo') {
            this.historyService.redo();
            return;
        }
        
        // Acciones de escena
        if (action === 'export:scene') {
            // Deshabilitar la cámara durante la exportación
            if (this.editorService.firstPersonCameraComponent) {
                this.editorService.firstPersonCameraComponent.setEnabled(false);
            }
            
            this.editorService.exportScene();
            
            // Habilitar la cámara después de la exportación
            setTimeout(() => {
                if (this.editorService.firstPersonCameraComponent) {
                    this.editorService.firstPersonCameraComponent.setEnabled(true);
                }
            }, 100);
            
            return;
        }
        
        if (action === 'import:scene') {
            // Deshabilitar la cámara durante la importación
            if (this.editorService.firstPersonCameraComponent) {
                this.editorService.firstPersonCameraComponent.setEnabled(false);
            }
            
            this.editorService.loadScene();
            
            // Habilitar la cámara después de la importación
            setTimeout(() => {
                if (this.editorService.firstPersonCameraComponent) {
                    this.editorService.firstPersonCameraComponent.setEnabled(true);
                }
            }, 100);
            
            return;
        }
        
        // Acciones de creación
        if (action.startsWith('create:')) {
            const objectType = action.split(':')[1];
            // Implementar en EditorService
            console.log('Create GameObject:', objectType);
            return;
        }
        
        // Acciones de carga de modelos
        if (action.startsWith('load:')) {
            const fileExtension = action.split(':')[1];
            
            // Deshabilitar la cámara durante la carga del modelo
            if (this.editorService.firstPersonCameraComponent) {
                this.editorService.firstPersonCameraComponent.setEnabled(false);
            }
            
            this.editorService.addModelToScene(fileExtension).then(() => {
                // Habilitar la cámara después de cargar el modelo
                if (this.editorService.firstPersonCameraComponent) {
                    this.editorService.firstPersonCameraComponent.setEnabled(true);
                }
            }).catch(() => {
                // En caso de error, asegurarse de habilitar la cámara
                if (this.editorService.firstPersonCameraComponent) {
                    this.editorService.firstPersonCameraComponent.setEnabled(true);
                }
            });
            
            return;
        }
        
        // Acciones de GameObject
        if (action.startsWith('gameObject:')) {
            const gameObjectAction = action.split(':')[1];
            
            // Para acciones que podrían abrir diálogos, deshabilitar la cámara
            if (gameObjectAction === 'rename') {
                // Deshabilitar la cámara durante el renombrado
                if (this.editorService.firstPersonCameraComponent) {
                    this.editorService.firstPersonCameraComponent.setEnabled(false);
                }
                
                // Implementar en EditorService
                console.log('GameObject action:', gameObjectAction);
                
                // Habilitar la cámara después del renombrado
                setTimeout(() => {
                    if (this.editorService.firstPersonCameraComponent) {
                        this.editorService.firstPersonCameraComponent.setEnabled(true);
                    }
                }, 100);
            } else {
                // Implementar en EditorService
                console.log('GameObject action:', gameObjectAction);
            }
            
            return;
        }
        
        // Acciones de componentes
        if (action.startsWith('component:')) {
            const parts = action.split(':');
            const componentAction = parts[1];
            
            if (componentAction === 'add') {
                // Abrir el diálogo de selección de componentes
                this.openComponentSelectorDialog();
                return;
            }
            
            // Ejecutar la acción correspondiente en el componente
            switch (componentAction) {
                case 'reset':
                    this.editorService.resetComponent(this.contextObject);
                    break;
                case 'remove':
                    this.editorService.removeComponent(this.contextObject);
                    break;
                case 'copy':
                    this.editorService.copyComponent(this.contextObject);
                    // Habilitar la opción de pegar
                    this.updateMenuItemState('component:paste', false);
                    break;
                case 'paste':
                    this.editorService.pasteComponentValues(this.contextObject);
                    break;
                default:
                    console.log('Component action not implemented:', componentAction);
            }
        }
    }

    /**
     * Abre el diálogo de selección de componentes
     */
    private openComponentSelectorDialog(): void {
        try {
            // Obtener la lista de componentes disponibles
            const availableComponents = this.editorService.getAvailableComponents();
            
            if (!availableComponents || availableComponents.length === 0) {
                console.warn('No hay componentes disponibles para añadir');
                return;
            }
            
            // Guardar referencia al GameObject actual para mantenerlo seleccionado
            const currentGameObject = this.contextObject;
            
            // Deshabilitar la cámara mientras el diálogo está abierto
            if (this.editorService.firstPersonCameraComponent) {
                this.editorService.firstPersonCameraComponent.setEnabled(false);
            }
            
            // Abrir el diálogo
            const dialogRef = this.dialog.open(ComponentSelectorDialogComponent, {
                width: '500px',
                data: { components: availableComponents },
                panelClass: 'component-selector-dialog'
            });
            
            // Manejar el resultado del diálogo
            dialogRef.afterClosed().subscribe(result => {
                // Habilitar la cámara nuevamente cuando se cierra el diálogo
                if (this.editorService.firstPersonCameraComponent) {
                    this.editorService.firstPersonCameraComponent.setEnabled(true);
                }
                
                if (result) {
                    console.log('Componente seleccionado:', result.name);
                    
                    // Añadir el componente seleccionado al GameObject
                    const addedComponent = this.editorService.addComponentToGameObject(currentGameObject, result.type);
                    
                    if (addedComponent) {
                        console.log('Componente añadido con éxito:', addedComponent);
                        
                        // Asegurarse de que el GameObject siga seleccionado
                        if (this.editorService.editableSceneComponent) {
                            this.editorService.editableSceneComponent.selectObject(currentGameObject);
                            this.editorService.editableSceneComponent.selectedObject.next(currentGameObject);
                        }
                    } else {
                        console.error('Error al añadir el componente');
                    }
                } else {
                    console.log('Diálogo cerrado sin seleccionar componente');
                }
            });
        } catch (error) {
            // En caso de error, asegurarse de habilitar la cámara nuevamente
            if (this.editorService.firstPersonCameraComponent) {
                this.editorService.firstPersonCameraComponent.setEnabled(true);
            }
            
            console.error('Error al abrir el diálogo de selección de componentes:', error);
        }
    }
}
