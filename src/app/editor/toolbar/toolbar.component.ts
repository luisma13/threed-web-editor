import { Component, OnInit } from "@angular/core";
import { EditorService } from "../editor.service";
import { CommonModule } from "@angular/common";

interface MenuItem {
    label: string;
    action?: () => void;
    disabled?: boolean;
    submenu?: MenuItem[];
}

@Component({
    selector: 'app-toolbar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent implements OnInit {

    input: HTMLInputElement;
    menuItems: MenuItem[] = [];
    submenus: { [key: string]: boolean } = {};

    constructor(
        public editorService: EditorService
    ) { }

    ngOnInit() {
        this.menuItems = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'New Scene',
                        action: () => this.editorService.createEditorScene()
                    },
                    {
                        label: 'Open Scene',
                        action: () => this.editorService.loadScene()
                    },
                    {
                        label: 'Save Scene',
                        action: () => this.editorService.exportScene()
                    },
                    {
                        label: 'Load Model',
                        submenu: [
                            {
                                label: 'Load GLB',
                                action: () => this.editorService.loadModel('.gltf')
                            },
                            { label: 'Load FBX', action: () => this.editorService.loadModel('.fbx') },
                            { label: 'Load OBJ', action: () => this.editorService.loadModel('.obj') },
                            { label: 'Load VRM', action: () => this.editorService.loadModel('.vrm') },
                        ]
                    }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    {
                        label: 'Undo',
                        disabled: true,
                        action: () => this.editorService.editableSceneComponent.undo()
                    },
                    {
                        label: 'Redo',
                        disabled: true,
                        action: () => this.editorService.editableSceneComponent.redo()
                    }
                ]
            },
            {
                label: 'View',
                submenu: [
                    {
                        label: 'Show Grid',
                        action: () => this.editorService.gridHelperComponent.gameObject.visible = true
                    },
                    {
                        label: 'Hide Grid',
                        action: () => this.editorService.gridHelperComponent.gameObject.visible = false
                    }
                ]
            }
        ];

        this.editorService.editableSceneComponent?.historySubject.subscribe(history => this.menuItems[1].submenu[0].disabled = history.length === 0 || history.length === 1);
        this.editorService.editableSceneComponent?.redoStackSubject.subscribe(redoStack => this.menuItems[1].submenu[1].disabled = redoStack.length === 0);
    }

    toggleSubmenu(menuLabel: string) {
        this.submenus[menuLabel] = !this.submenus[menuLabel];
    }

    showSubmenu(menuLabel: string) {
        this.submenus[menuLabel] = true;
    }

    hideSubmenu(menuLabel: string) {
        this.submenus[menuLabel] = false;
    }
}
