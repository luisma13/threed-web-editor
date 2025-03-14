import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { ModelCacheService, CachedModelInfo } from '../model-cache.service';
import { Subscription } from 'rxjs';
import { EditorService } from '../../editor.service';
import * as THREE from 'three';

@Component({
    standalone: true,
    selector: 'app-model-cache',
    imports: [
        CommonModule,
        MatExpansionModule,
        MatIconModule,
        MatButtonModule,
        MatListModule,
        MatTooltipModule
    ],
    templateUrl: './model-cache.component.html',
    styleUrls: ['./model-cache.component.scss']
})
export class ModelCacheComponent implements OnInit, OnDestroy, AfterViewInit {
    cachedModels: CachedModelInfo[] = [];
    selectedModel: string | null = null;
    private subscription: Subscription | null = null;
    
    // Mapa para almacenar las previsualizaciones renderizadas
    private modelPreviews: Map<string, string> = new Map();
    
    // Canvas auxiliar para renderizar las previsualizaciones
    @ViewChild('auxiliaryCanvas') auxiliaryCanvasRef!: ElementRef<HTMLCanvasElement>;
    private renderer: THREE.WebGLRenderer | null = null;
    private scene: THREE.Scene | null = null;
    private camera: THREE.PerspectiveCamera | null = null;
    
    // Flag para saber si estamos inicializando
    private isInitializing = false;
    
    // Flag para saber si estamos en el navegador
    private isBrowser: boolean;
    
    // Mapeo de tipos de modelo a iconos
    private modelTypeIcons = {
        'gltf': 'view_in_ar',
        'fbx': '3d_rotation',
        'obj': 'category',
        'vrm': 'person',
        'default': 'view_in_ar'
    };
    
    constructor(
        private modelCacheService: ModelCacheService,
        private editorService: EditorService,
        private dialog: MatDialog,
        private changeDetectorRef: ChangeDetectorRef,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
    }
    
    ngOnInit(): void {
        // Subscribe to changes in the cached models
        this.subscription = this.modelCacheService.cachedModelsSubject.subscribe(models => {
            this.cachedModels = Array.from(models.values());
            
            // Sort models by name
            this.cachedModels.sort((a, b) => a.name.localeCompare(b.name));
            
            // Si ya estamos inicializados, renderizar las previsualizaciones de los nuevos modelos
            if (this.isBrowser && this.renderer && !this.isInitializing) {
                this.renderModelPreviews();
            }
            
            // Forzar la detección de cambios para actualizar la vista
            this.changeDetectorRef.detectChanges();
        });
    }
    
    ngAfterViewInit(): void {
        // Inicializar el renderizador después de que la vista se haya inicializado
        // Solo si estamos en el navegador
        if (this.isBrowser) {
            setTimeout(() => this.initRenderer(), 100);
        }
    }
    
    ngOnDestroy(): void {
        // Unsubscribe to prevent memory leaks
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
        
        // Limpiar el renderizador
        if (this.isBrowser) {
            this.cleanupRenderer();
        }
    }
    
    /**
     * Verifica si WebGL está disponible en el navegador
     */
    private isWebGLAvailable(): boolean {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Inicializa el renderizador compartido
     */
    private initRenderer(): void {
        if (!this.isBrowser || this.renderer) {
            return; // No estamos en el navegador o ya está inicializado
        }
        
        // Verificar que WebGL esté disponible
        if (!this.isWebGLAvailable()) {
            console.warn('WebGL no está disponible en este navegador. No se mostrarán previsualizaciones 3D.');
            return;
        }
        
        this.isInitializing = true;
        
        try {
            // Obtener el canvas auxiliar
            const canvas = this.auxiliaryCanvasRef.nativeElement;
            canvas.width = 128;
            canvas.height = 128;
            
            // Crear el renderizador
            this.renderer = new THREE.WebGLRenderer({
                canvas,
                alpha: true,
                antialias: true,
                preserveDrawingBuffer: true // Necesario para poder leer los píxeles
            });
            this.renderer.setSize(canvas.width, canvas.height);
            this.renderer.setPixelRatio(1); // Usar 1:1 para las previsualizaciones
            
            // Crear la escena
            this.scene = new THREE.Scene();
            this.scene.background = null; // Fondo transparente
            
            // Añadir luces
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            this.scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(1, 1, 1);
            this.scene.add(directionalLight);
            
            // Crear la cámara
            this.camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 100);
            this.camera.position.set(0, 0, 5);
            this.camera.lookAt(0, 0, 0);
            
            // Renderizar las previsualizaciones
            this.renderModelPreviews();
            
            this.isInitializing = false;
        } catch (error) {
            console.error('Error al inicializar el renderizador:', error);
            this.isInitializing = false;
        }
    }
    
    /**
     * Limpia el renderizador y sus recursos
     */
    private cleanupRenderer(): void {
        if (!this.renderer) return;
        
        // Forzar la pérdida de contexto para liberar recursos GPU
        try {
            const gl = this.renderer.getContext();
            const ext = (gl as any).getExtension('WEBGL_lose_context');
            if (ext) {
                ext.loseContext();
            }
        } catch (e) {
            console.warn('Error al forzar la pérdida de contexto:', e);
        }
        
        // Eliminar el renderizador
        this.renderer.dispose();
        this.renderer = null;
        this.scene = null;
        this.camera = null;
    }
    
    /**
     * Renderiza las previsualizaciones para todos los modelos en caché
     */
    private renderModelPreviews(): void {
        if (!this.isBrowser || !this.renderer || !this.scene || !this.camera || this.isInitializing) {
            return;
        }
        
        this.isInitializing = true;
        
        // Procesar cada modelo en lotes para evitar sobrecargar la GPU
        const BATCH_SIZE = 5;
        const modelsToRender = this.cachedModels.filter(model => !this.modelPreviews.has(model.uuid));
        
        // Si no hay modelos para renderizar, salir
        if (modelsToRender.length === 0) {
            this.isInitializing = false;
            return;
        }
        
        // Procesar los modelos en lotes
        for (let i = 0; i < modelsToRender.length; i++) {
            const model = modelsToRender[i];
            const batchIndex = Math.floor(i / BATCH_SIZE);
            
            // Usar setTimeout para escalonar el renderizado por lotes
            setTimeout(() => {
                this.renderModelPreview(model);
                
                // Si este es el último modelo, marcar la inicialización como completa
                if (i === modelsToRender.length - 1) {
                    this.isInitializing = false;
                    // Forzar la detección de cambios para actualizar la vista
                    this.changeDetectorRef.detectChanges();
                }
            }, batchIndex * 100 + (i % BATCH_SIZE) * 20);
        }
        
        // Timeout de seguridad para asegurar que isInitializing se resetea
        setTimeout(() => {
            this.isInitializing = false;
            // Forzar la detección de cambios para actualizar la vista
            this.changeDetectorRef.detectChanges();
        }, modelsToRender.length * 30 + 500);
    }
    
    /**
     * Renderiza la previsualización para un modelo específico
     * @param model Información del modelo en caché
     */
    private renderModelPreview(model: CachedModelInfo): void {
        if (!this.isBrowser || !this.renderer || !this.scene || !this.camera) {
            return;
        }
        
        try {
            // Limpiar la escena de objetos anteriores
            while (this.scene.children.length > 0) {
                const child = this.scene.children[0];
                if (child instanceof THREE.Light) {
                    // Mantener las luces
                    break;
                }
                this.scene.remove(child);
            }
            
            // Clonar el objeto del modelo
            const object = model.rootObject.clone();
            
            // Centrar el objeto en la escena
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            // Ajustar la posición del objeto para centrarlo
            object.position.sub(center);
            
            // Ajustar la posición de la cámara según el tamaño del objeto
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = this.camera.fov * (Math.PI / 180);
            const distance = maxDim / (2 * Math.tan(fov / 2));
            this.camera.position.z = distance * 1.5;
            this.camera.lookAt(0, 0, 0);
            
            // Añadir el objeto a la escena
            this.scene.add(object);
            
            // Rotar el objeto para una mejor visualización
            object.rotation.y = Math.PI / 4;
            
            // Renderizar la escena
            this.renderer.render(this.scene, this.camera);
            
            // Capturar la imagen resultante
            const dataUrl = this.renderer.domElement.toDataURL('image/png');
            
            // Guardar la previsualización
            this.modelPreviews.set(model.uuid, dataUrl);
            
            // Forzar la detección de cambios para actualizar la vista
            this.changeDetectorRef.detectChanges();
            
            // Limpiar recursos
            object.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    // No eliminar geometrías ni materiales, ya que son referencias al modelo original
                    // Solo eliminar el objeto de la escena
                }
            });
            this.scene.remove(object);
        } catch (error) {
            console.error('Error al renderizar la previsualización del modelo:', error);
        }
    }
    
    /**
     * Obtiene la URL de la previsualización para un modelo
     * @param uuid UUID del modelo
     * @returns URL de la previsualización o null si no existe
     */
    getModelPreview(uuid: string): string | null {
        return this.modelPreviews.get(uuid) || null;
    }
    
    /**
     * Selecciona un modelo
     * @param uuid UUID del modelo a seleccionar
     */
    selectModel(uuid: string): void {
        this.selectedModel = this.selectedModel === uuid ? null : uuid;
    }
    
    /**
     * Obtiene la clase CSS para el tipo de modelo
     * @param modelType Tipo de modelo (gltf, fbx, obj, vrm)
     * @returns Clase CSS correspondiente al tipo de modelo
     */
    getModelTypeClass(modelType: string): string {
        return modelType.toLowerCase();
    }
    
    /**
     * Obtiene el icono para el tipo de modelo
     * @param modelType Tipo de modelo (gltf, fbx, obj, vrm)
     * @returns Nombre del icono correspondiente al tipo de modelo
     */
    getModelTypeIcon(modelType: string): string {
        const type = modelType.toLowerCase();
        return this.modelTypeIcons[type] || this.modelTypeIcons['default'];
    }
    
    /**
     * Añade un modelo a la escena
     * @param uuid UUID del modelo a añadir
     * @param event Evento del mouse
     */
    addToScene(uuid: string, event: MouseEvent): void {
        event.stopPropagation(); // Evitar que se seleccione el modelo
        
        const model = this.modelCacheService.getModel(uuid);
        if (model) {            
            // Implementación real: crear un nuevo GameObject con el modelo
            this.editorService.addModelToSceneFromCache(uuid);
        }
    }
    
    /**
     * Clona un modelo del caché
     * @param uuid UUID del modelo a clonar
     * @param event Evento del mouse
     */
    cloneModel(uuid: string, event: MouseEvent): void {
        event.stopPropagation(); // Evitar que se seleccione el modelo
        
        // Usar el EditorService para clonar el modelo
        console.log(`Clone model with UUID: ${uuid}`);
        
        // Implementación real: crear un nuevo GameObject con el modelo clonado
        this.editorService.cloneModelFromCache(uuid);
    }
    
    /**
     * Muestra información detallada sobre un modelo en caché
     * @param uuid UUID del modelo a ver
     * @param event Evento del mouse
     */
    viewModelDetails(uuid: string, event: MouseEvent): void {
        event.stopPropagation(); // Evitar que se seleccione el modelo
        
        const model = this.modelCacheService.getModel(uuid);
        if (model) {
            console.log('Model details:', {
                name: model.name,
                type: model.modelType,
                url: model.url,
                geometries: model.geometries.length,
                materials: model.materials.length,
                textures: model.textures.length,
                refCount: model.refCount,
                timestamp: new Date(model.timestamp).toLocaleString()
            });
            
            // En una implementación real, esto abriría un diálogo con información detallada
            // this.dialog.open(ModelDetailsDialogComponent, {
            //     data: { model },
            //     width: '500px'
            // });
        }
    }
} 