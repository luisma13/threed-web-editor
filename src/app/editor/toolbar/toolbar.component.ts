import { Component, OnInit, Renderer2, PLATFORM_ID, Inject } from "@angular/core";
import { isPlatformBrowser } from '@angular/common';
import { EditorService } from "../editor.service";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatMenuModule } from "@angular/material/menu";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";

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
    imports: [
        CommonModule,
        MatButtonModule,
        MatMenuModule,
        MatIconModule,
        MatTooltipModule
    ],
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent implements OnInit {

    input: HTMLInputElement;
    menuItems: MenuItem[] = [];
    submenus: { [key: string]: boolean } = {};
    canUndo: boolean = false;
    canRedo: boolean = false;
    isDarkTheme: boolean = false;
    isBrowser: boolean;

    constructor(
        public editorService: EditorService,
        private renderer: Renderer2,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(this.platformId);
    }

    ngOnInit() {
        // Detectar preferencia del sistema solo si estamos en el navegador
        if (this.isBrowser) {
            this.isDarkTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            // Aplicar tema inicial
            this.applyTheme();
        }
        
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
                        label: 'Import Scene',
                        action: () => this.editorService.loadScene()
                    },
                    {
                        label: 'Export Scene',
                        action: () => this.editorService.exportScene()
                    },
                    {
                        label: 'Load Model',
                        submenu: [
                            {
                                label: 'Load GLTF',
                                action: () => this.editorService.addModelToScene('.gltf', undefined)
                            },
                            {
                                label: 'Load GLB',
                                action: () => this.editorService.addModelToScene('.glb', undefined)
                            },
                            { label: 'Load FBX', action: () => this.editorService.addModelToScene('.fbx', undefined) },
                            { label: 'Load OBJ', action: () => this.editorService.addModelToScene('.obj', undefined) },
                            { label: 'Load VRM', action: () => this.editorService.addModelToScene('.vrm', undefined) },
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
                        disabled: !this.canUndo,
                        action: () => {}
                    },
                    {
                        label: 'Redo',
                        disabled: !this.canRedo,
                        action: () => {}
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
                    },
                    {
                        label: 'Toggle Theme',
                        action: () => this.toggleTheme()
                    }
                ]
            }
        ];
    }

    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        this.applyTheme();
    }
    
    applyTheme() {
        if (!this.isBrowser) return;
        
        if (this.isDarkTheme) {
            this.renderer.addClass(document.body, 'dark-theme');
            this.renderer.removeClass(document.body, 'light-theme');
        } else {
            this.renderer.addClass(document.body, 'light-theme');
            this.renderer.removeClass(document.body, 'dark-theme');
        }
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
