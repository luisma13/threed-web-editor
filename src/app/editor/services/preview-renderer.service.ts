import { Injectable } from '@angular/core';
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
    Vector3,
    Color
} from 'three';
import { RendererPoolService } from './renderer-pool.service';

@Injectable({
    providedIn: 'root'
})
export class PreviewRendererService {
    constructor(private rendererPool: RendererPoolService) {}

    /**
     * Crea una previsualización de un material
     */
    createMaterialPreview(material: Material): string {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const renderer = this.rendererPool.acquireRenderer({
            canvas,
            antialias: true,
            alpha: true
        });

        const scene = new Scene();
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
        renderer.setSize(size, size);
        renderer.render(scene, camera);

        // Obtener data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        // Limpiar
        geometry.dispose();
        this.rendererPool.releaseRenderer(renderer);
        scene.remove(mesh);

        return dataUrl;
    }

    /**
     * Crea una previsualización de un modelo
     */
    createModelPreview(model: Object3D): string {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const renderer = this.rendererPool.acquireRenderer({
            canvas,
            antialias: true,
            alpha: true
        });

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
        renderer.setSize(size, size);
        renderer.render(scene, camera);

        // Obtener data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        // Limpiar
        this.rendererPool.releaseRenderer(renderer);
        scene.remove(previewModel);

        return dataUrl;
    }

    /**
     * Crea una previsualización de una textura
     */
    createTexturePreview(texture: Texture): string {
        const size = 128;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx || !texture.image) {
            throw new Error('Could not create texture preview');
        }

        canvas.width = size;
        canvas.height = size;

        if (texture.image instanceof HTMLImageElement || 
            texture.image instanceof HTMLCanvasElement ||
            texture.image instanceof ImageBitmap) {
            ctx.drawImage(texture.image, 0, 0, size, size);
        } else if (texture.image instanceof ImageData) {
            ctx.putImageData(texture.image, 0, 0);
        }

        return canvas.toDataURL('image/jpeg', 0.85);
    }
} 