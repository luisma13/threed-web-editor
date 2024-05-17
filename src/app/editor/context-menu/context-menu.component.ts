import { CommonModule } from '@angular/common';
import { Component, HostListener, Input } from '@angular/core';
import { EditorService } from '../editor.service';

@Component({
    standalone: true,
    imports: [CommonModule],
    selector: 'app-context-menu',
    templateUrl: './context-menu.component.html',
    styleUrls: ['./context-menu.component.scss']
})
export class ContextMenuComponent {

    @Input() viewerMenuItems: any[] = [];
    isVisible: boolean = false;

    position = { x: 0, y: 0 };
    

    constructor(private editorService: EditorService) {

    }

    ngOnInit() {
        this.viewerMenuItems.push(...[
            { label: 'Undo', action: 'undo', disabled: true },
            { label: 'Redo', action: 'redo', disabled: true },
            {
                label: 'Scene', subItems: [
                    { label: 'Export Scene', action: 'export:scene' },
                    { label: 'Import Scene', action: 'import:scene' }
                ]
            },
            {
                label: 'Load 3D model', subItems: [
                    { label: 'Load GLTF/GLB', action: 'load:.gltf' },
                    { label: 'Load FBX', action: 'load:.fbx' },
                    { label: 'Load OBJ', action: 'load:.obj' },
                    { label: 'Load VRM', action: 'load:.vrm' }
                ]
            },
        ]);
    }

    async ngAfterViewInit() {
        this.editorService.editableSceneComponent?.historySubject.subscribe(history => this.viewerMenuItems[0].disabled = history.length === 0 || history.length === 1);
        this.editorService.editableSceneComponent?.redoStackSubject.subscribe(redoStack => this.viewerMenuItems[1].disabled = redoStack.length === 0);
    }

    @HostListener('document:contextmenu', ['$event'])
    onRightClick(event: MouseEvent) {
        event.preventDefault();
        this.position.x = event.clientX;
        this.position.y = event.clientY;
        this.isVisible = true;
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

    itemSelected(item: any) {
        if (item.disabled)
            return;
        this.isVisible = false;
        const actions = {
            'undo': () => this.editorService.editableSceneComponent?.undo(),
            'redo': () => this.editorService.editableSceneComponent?.redo(),
            'export:scene': () => this.editorService.exportScene(),
            'import:scene': () => this.editorService.loadScene()
        };
        if (item.action.includes('load')) {
            this.editorService.loadModel(item.action.split(':')[1]);
            return;
        }
        actions[item.action]();
    }

}
