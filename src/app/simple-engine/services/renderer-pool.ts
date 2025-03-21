import * as THREE from 'three';

export interface RendererConfig {
    antialias?: boolean;
    alpha?: boolean;
    powerPreference?: 'high-performance' | 'low-power';
    preserveDrawingBuffer?: boolean;
    pixelRatio?: number;
}

export class RendererPool {
    private static instance: RendererPool;
    private pool: THREE.WebGLRenderer[] = [];
    private inUse: Set<THREE.WebGLRenderer> = new Set();
    private maxPoolSize = 3;
    private rendererIds = new WeakMap<THREE.WebGLRenderer, string>();
    private nextId = 1;

    private constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('webglcontextlost', this.handleContextLost.bind(this), false);
            window.addEventListener('webglcontextrestored', this.handleContextRestored.bind(this), false);
        }
    }

    static getInstance(): RendererPool {
        if (!RendererPool.instance) {
            RendererPool.instance = new RendererPool();
        }
        return RendererPool.instance;
    }

    private handleContextLost = (event: Event) => {
        event.preventDefault();
        console.warn('WebGL context lost, cleaning up renderers');
        this.cleanupLostContexts();
    }

    private handleContextRestored = () => {
        console.log('WebGL context restored');
        this.recreateRenderers();
    }

    private cleanupLostContexts() {
        const validRenderers = this.pool.filter(renderer => {
            try {
                renderer.getContext();
                return true;
            } catch (e) {
                this.disposeRenderer(renderer);
                return false;
            }
        });
        this.pool = validRenderers;
    }

    private recreateRenderers() {
        Array.from(this.inUse).forEach(oldRenderer => {
            try {
                const newRenderer = this.createRenderer({
                    antialias: true,
                    alpha: true,
                    powerPreference: 'high-performance'
                });
                
                newRenderer.setSize(
                    oldRenderer.domElement.width,
                    oldRenderer.domElement.height,
                    false
                );
                newRenderer.setPixelRatio(oldRenderer.getPixelRatio());

                if (oldRenderer.domElement.parentNode) {
                    oldRenderer.domElement.parentNode.replaceChild(
                        newRenderer.domElement,
                        oldRenderer.domElement
                    );
                }

                this.inUse.delete(oldRenderer);
                this.inUse.add(newRenderer);
            } catch (e) {
                console.error('Error recreating renderer:', e);
            }
        });
    }

    private createRenderer(config: RendererConfig): THREE.WebGLRenderer {
        const renderer = new THREE.WebGLRenderer({
            antialias: config.antialias ?? true,
            alpha: config.alpha ?? true,
            powerPreference: config.powerPreference ?? 'high-performance',
            preserveDrawingBuffer: config.preserveDrawingBuffer ?? false
        });

        const rendererId = `renderer_${this.nextId++}`;
        this.rendererIds.set(renderer, rendererId);

        renderer.setPixelRatio(config.pixelRatio ?? Math.min(window.devicePixelRatio, 1.5));

        renderer.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            console.warn('Renderer lost context:', rendererId);
        }, false);

        renderer.domElement.addEventListener('webglcontextrestored', () => {
            console.log('Renderer context restored:', rendererId);
        }, false);

        return renderer;
    }

    private disposeRenderer(renderer: THREE.WebGLRenderer) {
        try {
            const gl = renderer.getContext();
            const ext = gl.getExtension('WEBGL_lose_context');
            if (ext) ext.loseContext();
        } catch (e) {
            console.warn('Error forcing context loss:', e);
        }

        renderer.dispose();
        renderer.forceContextLoss();

        if (renderer.domElement) {
            renderer.domElement.remove();
            renderer.domElement = null as any;
        }
    }

    acquireRenderer(config: RendererConfig = {}): THREE.WebGLRenderer {
        let renderer = this.pool.find(r => !this.inUse.has(r));

        if (!renderer) {
            if (this.pool.length >= this.maxPoolSize) {
                renderer = this.pool[0];
                this.releaseRenderer(renderer);
            }
            
            if (!renderer) {
                renderer = this.createRenderer(config);
                this.pool.push(renderer);
            }
        }

        this.inUse.add(renderer);
        return renderer;
    }

    releaseRenderer(renderer: THREE.WebGLRenderer) {
        if (this.inUse.has(renderer)) {
            renderer.setAnimationLoop(null);
            renderer.clear();
            
            if (renderer.domElement && renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }

            this.inUse.delete(renderer);
        }
    }

    disposeAll() {
        [...this.pool, ...Array.from(this.inUse)].forEach(renderer => {
            this.disposeRenderer(renderer);
        });

        this.pool = [];
        this.inUse.clear();
    }
} 