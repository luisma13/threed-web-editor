import { Component, OnInit } from "@angular/core";
import { EditorService } from "../editor.service";
import { CommonModule } from "@angular/common";
import { HistoryService } from "../history/history.service";

interface MenuItem {
    label: string;
    action?: () => void;
    disabled?: boolean;
    submenu?: MenuItem[];
    isRoot?: boolean;
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
        public editorService: EditorService,
        private historyService: HistoryService
    ) { }

    ngOnInit() {
        this.menuItems = [
            {
                label: 'File',
                isRoot: true,
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
                                action: () => this.editorService.addModelToScene('.gltf')
                            },
                            { label: 'Load FBX', action: () => this.editorService.addModelToScene('.fbx') },
                            { label: 'Load OBJ', action: () => this.editorService.addModelToScene('.obj') },
                            { label: 'Load VRM', action: () => this.editorService.addModelToScene('.vrm') },
                        ]
                    }
                ]
            },
            {
                label: 'Edit',
                isRoot: true,
                submenu: [
                    {
                        label: 'Undo',
                        disabled: true,
                        action: () => this.historyService.undo()
                    },
                    {
                        label: 'Redo',
                        disabled: true,
                        action: () => this.historyService.redo()
                    }
                ]
            },
            {
                label: 'View',
                isRoot: true,
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
