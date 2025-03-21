import { 
    WebGLRenderer, 
    Scene, 
    PerspectiveCamera, 
    Object3D,
    Material,
    Texture,
    AmbientLight,
    DirectionalLight,
    SphereGeometry,
    Mesh,
    Box3,
    Vector3
} from 'three';
import { RendererPool } from './renderer-pool';

/**
 * Servicio singleton para renderizar previsualizaciones de recursos
 */
export class PreviewRenderer {
    private static instance: PreviewRenderer;
    private rendererPool: RendererPool;
    private previewCanvas: HTMLCanvasElement | null = null;
    private readonly PREVIEW_SIZE = 128;

    private constructor() {
        this.rendererPool = RendererPool.getInstance();
    }

    public static getInstance(): PreviewRenderer {
        if (!PreviewRenderer.instance) {
            PreviewRenderer.instance = new PreviewRenderer();
        }
        return PreviewRenderer.instance;
    }

    /**
     * Obtiene o crea el canvas compartido para previsualizaciones
     */
    private getPreviewCanvas(): HTMLCanvasElement {
        if (!this.previewCanvas) {
            this.previewCanvas = document.createElement('canvas');
            this.previewCanvas.width = this.PREVIEW_SIZE;
            this.previewCanvas.height = this.PREVIEW_SIZE;
        }
        return this.previewCanvas;
    }

    /**
     * Limpia el canvas compartido antes de una nueva previsualización
     */
    private clearPreviewCanvas(): void {
        const canvas = this.getPreviewCanvas();
        const context = canvas.getContext('2d');
        if (context) {
            context.clearRect(0, 0, this.PREVIEW_SIZE, this.PREVIEW_SIZE);
            // Fondo gris medio
            context.fillStyle = '#e0e0e0';
            context.fillRect(0, 0, this.PREVIEW_SIZE, this.PREVIEW_SIZE);
        }
    }

    /**
     * Configura el renderer con los ajustes comunes
     */
    private setupRenderer(renderer: WebGLRenderer): void {
        renderer.setSize(this.PREVIEW_SIZE, this.PREVIEW_SIZE);
        renderer.setClearColor(0xe0e0e0, 1);
    }

    /**
     * Crea una previsualización de un material
     */
    createMaterialPreview(material: Material): string {
        // Limpiar el canvas antes de empezar
        this.clearPreviewCanvas();

        const renderer = this.rendererPool.acquireRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
        });

        this.setupRenderer(renderer);

        const scene = new Scene();
        scene.background = null;

        const camera = new PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0, 0, 4);

        // Crear una esfera para mostrar el material
        const geometry = new SphereGeometry(1, 32, 32);
        const mesh = new Mesh(geometry, material);
        scene.add(mesh);

        // Añadir luces
        const ambientLight = new AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 2);
        scene.add(directionalLight);

        // Rotar la esfera ligeramente
        mesh.rotation.y = Math.PI / 4;
        mesh.rotation.x = Math.PI / 6;

        // Renderizar
        renderer.render(scene, camera);

        // Copiar el resultado al canvas compartido
        const canvas = this.getPreviewCanvas();
        const context = canvas.getContext('2d');
        context?.drawImage(renderer.domElement, 0, 0);

        // Limpiar todos los recursos
        geometry.dispose();
        scene.remove(mesh);
        scene.remove(ambientLight);
        scene.remove(directionalLight);
        // Limpiar referencias circulares
        scene.clear();
        this.rendererPool.releaseRenderer(renderer);

        return canvas.toDataURL('image/jpeg', 0.85);
    }

    /**
     * Crea una previsualización de un modelo
     */
    createModelPreview(model: Object3D): string {
        // Limpiar el canvas antes de empezar
        this.clearPreviewCanvas();

        const renderer = this.rendererPool.acquireRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
        });

        this.setupRenderer(renderer);

        const scene = new Scene();
        scene.background = null;

        const camera = new PerspectiveCamera(35, 1, 0.1, 1000);

        // Añadir luces
        const ambientLight = new AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const directionalLight = new DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(2, 1, 1);
        scene.add(directionalLight);

        // Añadir modelo a la escena
        const previewModel = model.clone();
        scene.add(previewModel);

        // Calcular bounding box y ajustar cámara
        const box = new Box3().setFromObject(previewModel);
        const center = box.getCenter(new Vector3());
        const size3D = box.getSize(new Vector3());
        const maxDim = Math.max(size3D.x, size3D.y, size3D.z);
        
        const distance = maxDim * 1.5;
        camera.position.set(
            distance * 1.2,
            distance * 0.3,
            distance * 0.8
        );
        camera.lookAt(center);

        previewModel.rotation.y = Math.PI / 6;

        // Renderizar
        renderer.render(scene, camera);

        // Copiar el resultado al canvas compartido
        const canvas = this.getPreviewCanvas();
        const context = canvas.getContext('2d');
        context?.drawImage(renderer.domElement, 0, 0);

        // Limpiar todos los recursos
        scene.remove(previewModel);
        scene.remove(ambientLight);
        scene.remove(directionalLight);
        // Limpiar referencias circulares
        scene.clear();
        // Disponer geometrías del modelo clonado
        previewModel.traverse((node) => {
            if (node instanceof Mesh) {
                if (node.geometry) node.geometry.dispose();
            }
        });
        this.rendererPool.releaseRenderer(renderer);

        return canvas.toDataURL('image/jpeg', 0.85);
    }

    /**
     * Crea una previsualización de una textura
     */
    createTexturePreview(texture: Texture): string {
        if (!texture.image) {
            throw new Error('Could not create texture preview');
        }

        // Limpiar el canvas antes de empezar
        this.clearPreviewCanvas();

        const canvas = this.getPreviewCanvas();
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not get 2D context');
        }

        if (texture.image instanceof HTMLImageElement || 
            texture.image instanceof HTMLCanvasElement ||
            texture.image instanceof ImageBitmap) {
            context.drawImage(texture.image, 0, 0, this.PREVIEW_SIZE, this.PREVIEW_SIZE);
        } else if (texture.image instanceof ImageData) {
            context.putImageData(texture.image, 0, 0);
        }

        return canvas.toDataURL('image/jpeg', 0.85);
    }
} 