import { ChangeDetectorRef, Component, ElementRef, HostListener, NgModule, ViewChild, afterNextRender } from '@angular/core';
import { engine } from '../vipe-3d-engine/core/engine/engine';
import { GameObject } from '../vipe-3d-engine/core/gameobject';
import { CommonModule } from '@angular/common';
import { ComponentComponent } from './component/component.component';
import { EditorService } from './editor.service';
import { ContextMenuComponent } from './context-menu/context-menu.component';
import { FormsModule } from '@angular/forms';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { MatIconModule } from '@angular/material/icon';
import { GameObjectsDraggableComponent } from './gameobject-draggables/gameobjects-draggables.component';
import { HistoryService } from './history/history.service';

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
        GameObjectsDraggableComponent
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
        private changeDetector: ChangeDetectorRef
    ) {
        afterNextRender(() => this.initScene());
    }

    async initScene() {
        engine.init(this.viewer.nativeElement, "#c3c3c3");

        this.animate = this.animate.bind(this);
        this.animate();

        const input = document.createElement('input');
        input.type = 'file';
        input.style.display = 'none';

        this.editorService.input = input;

        this.editorService.createEditorScene();
        this.editorService.editableSceneComponent?.selectedObject.subscribe(object => {
            if (object === this.objectSelected) return;

            this.editorService.editableSceneComponent.selectedObject.subscribe(object => {
                for (const go of GameObjectsDraggableComponent.gameObjectsHtmlElements) {
                    go.isSelected = go.gameObject === object;
                }
            });

            this.objectSelected = object;
            this.editorService.editableSceneComponent?.selectObject(object);

            for (const obj of engine.gameObjects)
                for (const component of obj.components) {
                    if (component['setHelperVisibility']) {
                        component['setHelperVisibility'](obj === object);
                    }
                }

            this.changeDetector.detectChanges();
        });

        this.viewer.nativeElement.ondragover = (event) => event.preventDefault();
        this.viewer.nativeElement.ondrop = (event) => this.onDragged(event);
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

}
