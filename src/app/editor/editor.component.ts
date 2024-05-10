import { Component, ElementRef, HostListener, ViewChild, afterNextRender } from '@angular/core';
import { engine } from '../vipe-3d-engine/core/engine/engine';
import { GameObject } from '../vipe-3d-engine/core/gameobject';
import { loadFBX, loadGLTF, loadVRM } from '../vipe-3d-engine/loaders/modelsLoader';
import { createEditorScene } from '../vipe-3d-engine/scenes/editor.scene';

@Component({
    selector: 'app-editor',
    standalone: true,
    imports: [],
    templateUrl: './editor.component.html',
    styleUrl: './editor.component.scss'
})
export class EditorComponent {

    @ViewChild('viewer', { static: true }) viewer: ElementRef;

    constructor() {
        afterNextRender(() => this.initScene());
    }

    async initScene() {
        engine.init();
        this.viewer.nativeElement.appendChild(engine.renderer.domElement);
        this.animate = this.animate.bind(this);
        this.animate();
        createEditorScene();
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

    async loadGLB() {
        const url = "";
        const obj = await loadGLTF(url, false, true);
        engine.addGameObjects(obj);
    }

    async loadFBX() {
        const url = "";
        const obj = await loadFBX(url);
        engine.addGameObjects(obj);
    }

    loadOBJ() {

    }

    async loadVRM() {
        const url = "";
        const obj = await loadVRM(url);
        engine.addGameObjects(new GameObject(obj.scene));
    }

}
