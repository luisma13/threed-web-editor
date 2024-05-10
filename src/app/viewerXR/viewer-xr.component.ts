import { Component, ElementRef, ViewChild, afterNextRender, HostListener } from '@angular/core';
import { createARVipeRoomScene } from '../vipe-3d-engine/scenes/testSceneXR.scene';
import { engineXR } from '../vipe-3d-engine/core/engine/engine.xr';

@Component({
    selector: 'app-viewer-xr',
    standalone: true,
    imports: [],
    templateUrl: './viewer-xr.component.html',
    styleUrl: './viewer-xr.component.scss'
})
export class ViewerXRComponent {

    @ViewChild('viewer', { static: true }) viewer: ElementRef;

    constructor() {
        afterNextRender(() => this.initScene());
    }

    async initScene() {
        engineXR.init();
        this.viewer.nativeElement.appendChild(engineXR.renderer.domElement);
        createARVipeRoomScene();
    }

    @HostListener('window:resize', ['$event'])
    onResize(event) {
        engineXR.onResize(event);
    }

}
