import { Component, ElementRef, ViewChild, afterNextRender, HostListener } from '@angular/core';
import { engine } from '../vipe-3d-engine/core/engine/engine';
import { createTestScene } from '../vipe-3d-engine/scenes/testScene.scene';

@Component({
    selector: 'app-viewer',
    standalone: true,
    imports: [],
    templateUrl: './viewer.component.html',
    styleUrl: './viewer.component.scss'
})
export class ViewerComponent {

    @ViewChild('viewer', { static: true }) viewer: ElementRef;

    constructor() {
        afterNextRender(() => this.initScene());
    }

    async initScene() {
        engine.init();
        this.viewer.nativeElement.appendChild(engine.renderer.domElement);
        this.animate = this.animate.bind(this);
        this.animate();
        createTestScene();
    }

    animate() {
        engine.update();
        requestAnimationFrame(this.animate);
    }

    @HostListener('window:resize', ['$event'])
    onResize(event) {
        engine.onResize(event);
    }

}
