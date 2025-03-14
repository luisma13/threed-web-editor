import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, Input } from '@angular/core';
import { EditorService } from '../editor.service';
import { HistoryService } from '../history/history.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ComponentSelectorDialogComponent } from '../component-selector/component-selector-dialog.component';
import { BoxComponent } from '../../simple-engine/components/geometry/box.component';
import { DirectionalLightComponent } from '../../simple-engine/components/light/directional-light.component';
import { SpotLightComponent } from '../../simple-engine/components/light/spot-light.component';
import { GameObject } from '../../simple-engine/core/gameobject';
import { SphereComponent } from '../../simple-engine/components/geometry/sphere.component';
import { PlaneComponent } from '../../simple-engine/components/geometry/plane.component';
import { CylinderComponent } from '../../simple-engine/components/geometry/cylinder.component';

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
                { label: 'Primitives', icon: 'shapes', items: [
                    { label: 'Cube', action: 'create:cube', icon: 'cube' },
                    { label: 'Sphere', action: 'create:sphere', icon: 'circle' },
                    { label: 'Plane', action: 'create:plane', icon: 'square' },
                    { label: 'Cylinder', action: 'create:cylinder', icon: 'cylinder' }
                ]},
                { type: 'separator' },
                { label: 'Lights', icon: 'lightbulb', items: [
                    { label: 'Directional Light', action: 'create:directionalLight', icon: 'sun' },
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
        { 
            label: 'Create', 
            icon: 'plus',
            items: [
                { label: 'Empty GameObject', action: 'create:empty', icon: 'cube' },
                { label: 'Primitives', icon: 'shapes', items: [
                    { label: 'Cube', action: 'create:cube', icon: 'cube' },
                    { label: 'Sphere', action: 'create:sphere', icon: 'circle' },
                    { label: 'Plane', action: 'create:plane', icon: 'square' },
                    { label: 'Cylinder', action: 'create:cylinder', icon: 'cylinder' }
                ]},
                { type: 'separator' },
                { label: 'Lights', icon: 'lightbulb', items: [
                    { label: 'Directional Light', action: 'create:directionalLight', icon: 'sun' },
                    { label: 'Spot Light', action: 'create:spotLight', icon: 'flashlight' }
                ]}
            ]
        },
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

    private executeAction(action: string): void {
        // Handle undo/redo actions first
        if (action === 'undo') {
            this.historyService.undo();
            return;
        }
        if (action === 'redo') {
            this.historyService.redo();
            return;
        }

        const [category, type] = action.split(':');

        switch (category) {
            case 'create':
                const parent = this.contextType === 'gameObject' ? this.contextObject as GameObject : undefined;
                let newGameObject: GameObject;

                switch (type) {
                    case 'empty':
                        newGameObject = this.editorService.newGameObject(parent);
                        newGameObject.name = 'Empty GameObject';
                        break;
                    case 'cube':
                        newGameObject = this.editorService.newGameObject(parent);
                        newGameObject.name = 'Cube';
                        newGameObject.addComponent(new BoxComponent());
                        break;
                    case 'sphere':
                        newGameObject = this.editorService.newGameObject(parent);
                        newGameObject.name = 'Sphere';
                        newGameObject.addComponent(new SphereComponent());
                        break;
                    case 'plane':
                        newGameObject = this.editorService.newGameObject(parent);
                        newGameObject.name = 'Plane';
                        newGameObject.addComponent(new PlaneComponent());
                        break;
                    case 'cylinder':
                        newGameObject = this.editorService.newGameObject(parent);
                        newGameObject.name = 'Cylinder';
                        newGameObject.addComponent(new CylinderComponent());
                        break;
                    case 'directionalLight':
                        newGameObject = this.editorService.newGameObject(parent);
                        newGameObject.name = 'Directional Light';
                        newGameObject.addComponent(new DirectionalLightComponent());
                        break;
                    case 'spotLight':
                        newGameObject = this.editorService.newGameObject(parent);
                        newGameObject.name = 'Spot Light';
                        newGameObject.addComponent(new SpotLightComponent());
                        break;
                    default:
                        console.warn(`Unhandled create type: ${type}`);
                }
                break;
            case 'gameObject':
                const gameObject = this.contextObject as GameObject;
                switch (type) {
                    case 'rename':
                        const newName = prompt('Enter new name:', gameObject.name);
                        if (newName) {
                            this.editorService.renameGameObject(gameObject, newName);
                        }
                        break;
                    case 'delete':
                        this.editorService.deleteGameObject(gameObject);
                        break;
                    default:
                        console.warn(`Unhandled gameObject action: ${type}`);
                }
                break;
            case 'component':
                switch (type) {
                    case 'add':
                        this.openComponentSelectorDialog();
                        break;
                    case 'reset':
                        this.editorService.resetComponent(this.contextObject);
                        break;
                    case 'remove':
                        this.editorService.removeComponent(this.contextObject);
                        break;
                    case 'copy':
                        this.editorService.copyComponent(this.contextObject);
                        // Enable paste option
                        this.updateMenuItemState('component:paste', false);
                        break;
                    case 'paste':
                        this.editorService.pasteComponentValues(this.contextObject);
                        break;
                    default:
                        console.warn(`Unhandled component action: ${type}`);
                }
                break;
            case 'export':
                switch (type) {
                    case 'scene':
                        this.editorService.exportScene();
                        break;
                    default:
                        console.warn(`Unhandled export type: ${type}`);
                }
                break;
            case 'import':
                switch (type) {
                    case 'scene':
                        this.editorService.loadScene();
                        break;
                    default:
                        console.warn(`Unhandled import type: ${type}`);
                }
                break;
            case 'load':
                switch (type) {
                    case '.gltf':
                    case '.glb':
                        this.editorService.addModelToScene('glb');
                        break;
                    case '.fbx':
                        this.editorService.addModelToScene('fbx');
                        break;
                    case '.obj':
                        this.editorService.addModelToScene('obj');
                        break;
                    case '.vrm':
                        this.editorService.addModelToScene('vrm');
                        break;
                    default:
                        console.warn(`Unhandled load type: ${type}`);
                }
                break;
            default:
                console.warn(`Unhandled action category: ${category}`);
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
                    // Añadir el componente seleccionado al GameObject
                    const addedComponent = this.editorService.addComponentToGameObject(currentGameObject, result.type);
                    
                    if (addedComponent) {
                        // Asegurarse de que el GameObject siga seleccionado
                        if (this.editorService.editableSceneComponent) {
                            this.editorService.editableSceneComponent.selectObject(currentGameObject);
                            this.editorService.editableSceneComponent.selectedObject.next(currentGameObject);
                        }
                    } else {
                        console.error('Error al añadir el componente');
                    }
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
