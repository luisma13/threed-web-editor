import { ChangeDetectorRef, Component, ElementRef, HostListener, ViewChild, afterNextRender } from '@angular/core';
import { engine } from '../vipe-3d-engine/core/engine/engine';
import { GameObject } from '../vipe-3d-engine/core/gameobject';
import { CommonModule } from '@angular/common';
import { ComponentComponent } from './component/component.component';
import { EditorService } from './editor.service';
import { ContextMenuComponent } from './context-menu/context-menu.component';
import { FormsModule } from '@angular/forms';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { DraggableTreeGameObjectsComponent } from './draggable-tree-gameobjects/draggable-tree-gameobjects.component';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-editor',
    standalone: true,
    imports: [
        CommonModule,
        ComponentComponent,
        ContextMenuComponent,
        FormsModule,
        ToolbarComponent,
        DraggableTreeGameObjectsComponent,
        MatIconModule
    ],
    templateUrl: './editor.component.html',
    styleUrl: './editor.component.scss'
})
export class EditorComponent {

    @ViewChild('viewer', { static: true }) viewer: ElementRef;
    @ViewChild('contextMenu', { static: true }) contextMenu: ContextMenuComponent;

    engine = engine;
    objectSelected: GameObject;

    constructor(
        private editorService: EditorService,
        private changeDetector: ChangeDetectorRef
    ) {
        afterNextRender(() => this.initScene());
    }

    async initScene() {
        engine.init(this.viewer.nativeElement, "#c3c3c3");
        this.viewer.nativeElement.appendChild(engine.renderer.domElement);

        this.animate = this.animate.bind(this);
        this.animate();

        const input = document.createElement('input');
        input.type = 'file';
        input.style.display = 'none';

        this.editorService.input = input;
        this.editorService.createEditorScene();
        this.editorService.editableSceneComponent?.selectedObject.subscribe(object => {
            if (object === this.objectSelected) return;

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
        await this.editorService.loadModel(extension, url);
    }

}
