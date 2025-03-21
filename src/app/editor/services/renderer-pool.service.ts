import { Injectable, OnDestroy } from '@angular/core';
import { RendererPool, RendererConfig } from '../../simple-engine/services/renderer-pool';
import * as THREE from 'three';

@Injectable({
    providedIn: 'root'
})
export class RendererPoolService implements OnDestroy {
    private rendererPool: RendererPool;

    constructor() {
        this.rendererPool = RendererPool.getInstance();
    }

    acquireRenderer(config: RendererConfig = {}): THREE.WebGLRenderer {
        return this.rendererPool.acquireRenderer(config);
    }

    releaseRenderer(renderer: THREE.WebGLRenderer): void {
        this.rendererPool.releaseRenderer(renderer);
    }

    ngOnDestroy(): void {
        // No llamamos a disposeAll() aquí porque otros componentes podrían estar usando el pool
        // La limpieza se debe hacer a nivel de aplicación cuando realmente queramos liberar todo
    }
} 