import { ChangeDetectorRef, Component, ElementRef, HostListener, ViewChild, afterNextRender } from '@angular/core';
import { engine } from '../vipe-3d-engine/core/engine/engine';
import { GameObject } from '../vipe-3d-engine/core/gameobject';
import { GameObjectComponent } from './gameobject/gameobject.component';
import { CommonModule } from '@angular/common';
import { ComponentComponent } from './component/component.component';
import { EditorService } from './editor.service';
import { ContextMenuComponent } from './context-menu/context-menu.component';
import { EditorScene } from './editor.scene';

@Component({
    selector: 'app-editor',
    standalone: true,
    imports: [GameObjectComponent, CommonModule, ComponentComponent, ContextMenuComponent],
    templateUrl: './editor.component.html',
    styleUrl: './editor.component.scss'
})
export class EditorComponent {

    @ViewChild('viewer', { static: true }) viewer: ElementRef;
    @ViewChild('contextMenu', { static: true }) contextMenu: ContextMenuComponent;

    readonly editorScene = new EditorScene();
    input: HTMLInputElement;

    gameObjects: GameObject[] = [];
    engine = engine;

    objectSelected: GameObject;

    menuItems = [];

    constructor(
        private editorService: EditorService
    ) {
        afterNextRender(() => this.initScene());
    }

    async initScene() {
        engine.init(this.viewer.nativeElement, "#c3c3c3");
        this.viewer.nativeElement.appendChild(engine.renderer.domElement);

        this.animate = this.animate.bind(this);
        this.animate();

        this.editorScene.createEditorScene();
        this.editorScene.editableSceneComponent.historySubject.subscribe(history => this.menuItems[0].disabled = history.length === 0 || history.length === 1);
        this.editorScene.editableSceneComponent.redoStackSubject.subscribe(redoStack => this.menuItems[1].disabled = redoStack.length === 0);
        this.editorScene.editableSceneComponent.selectedObject.subscribe(object => {
            this.objectSelected = object;
            this.editorService.editableSceneComponent?.selectObject(object);
        });

        this.editorService.editableSceneComponent = this.editorScene.editableSceneComponent;

        this.editorService.contextMenuSelected.subscribe(item => {
            if (!item)
                return;
            const actions = {
                'undo': () => this.editorScene.editableSceneComponent.undo(),
                'redo': () => this.editorScene.editableSceneComponent.redo(),
                'export:scene': () => this.exportScene(),
                'import:scene': () => this.loadScene()
            };
            if (item.action.includes('load')) {
                this.loadModel(item.action.split(':')[1]);
                return;
            }
            actions[item.action]();
        });

        this.input = document.createElement('input');
        this.input.type = 'file';
        this.input.style.display = 'none';
        this.viewer.nativeElement.ondragover = (event) => event.preventDefault();
        this.viewer.nativeElement.ondrop = (event) => this.onDragged(event);
    }

    ngAfterContentInit() {
    }

    animate() {
        engine.update();
        requestAnimationFrame(this.animate);
    }

    @HostListener('window:resize', ['$event'])
    onResize(event) {
        engine.onResize(event);
    }

    exportScene() {

    }

    loadScene() {

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
        await this.editorScene.loadModel(extension, url);
    }

    async loadModel(extension: ".gltf" | ".glb" | ".fbx" | ".obj" | ".vrm" | string) {
        if (extension !== ".gltf" && extension !== ".glb" && extension !== ".fbx" && extension !== ".obj" && extension !== ".vrm") {
            console.error("Invalid file format");
            return;
        }

        this.input.accept = extension === ".gltf" ? ".gltf,.glb" : extension;
        this.input.click();
        this.input.onchange = async () => {
            const file = this.input.files[0];
            const url = URL.createObjectURL(file);
            await this.editorScene.loadModel(extension, url);
        }
    }

}
