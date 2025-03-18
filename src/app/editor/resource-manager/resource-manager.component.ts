import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChildren, QueryList, ElementRef, ChangeDetectorRef } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ResourceService } from './resource.service';
import { ResourceDialogService } from './resource-dialog.service';
import { WebGLRenderer, Scene, PerspectiveCamera, SphereGeometry, Mesh, DirectionalLight, AmbientLight, Material, MeshStandardMaterial, Texture } from 'three';
import { PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ModelCacheComponent } from './model-cache/model-cache.component';
import { MaterialService } from './material.service';

@Component({
    standalone: true,
    selector: 'app-resource-manager',
    imports: [
        CommonModule, 
        MatExpansionModule, 
        MatIconModule, 
        MatButtonModule,
        ModelCacheComponent
    ],
    templateUrl: './resource-manager.component.html',
    styleUrls: ['./resource-manager.component.scss']
})
export class ResourceManagerComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChildren('materialCanvas') materialCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;
    
    // Shared WebGL renderer for all material previews
    private sharedRenderer: WebGLRenderer | null = null;
    private sharedScene: Scene | null = null;
    private sharedCamera: PerspectiveCamera | null = null;
    private previewMesh: Mesh | null = null;
    private previewGeometry: SphereGeometry | null = null;
    
    isInitializing = false;
    isInitialized = false;
    private isBrowser: boolean;
    
    // Material and texture lists
    materials: { name: string, material: Material, refCount: number }[] = [];
    textures: { path: string, texture: Texture, refCount: number }[] = [];

    constructor(
        public resourceService: ResourceService,
        private dialog: MatDialog,
        private resourceDialogService: ResourceDialogService,
        private changeDetectorRef: ChangeDetectorRef,
        private materialService: MaterialService,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    ngOnInit(): void {
        if (!this.isBrowser) return;
        
        // Subscribe to materials changes
        this.resourceService.materialsSubject.subscribe(materials => {
            this.materials = Array.from(materials.entries()).map(([name, info]) => ({
                name,
                material: info.resource,
                refCount: info.refCount
            }));
            
            // Initialize material previews if component is already initialized
            if (this.isInitialized && !this.isInitializing) {
                setTimeout(() => {
                    this.renderAllMaterialPreviews();
                    this.changeDetectorRef.detectChanges(); // Force UI update
                }, 100);
            }
        });
        
        // Subscribe to textures changes
        this.resourceService.texturesSubject.subscribe(textures => {
            this.textures = Array.from(textures.entries()).map(([path, info]) => ({
                path,
                texture: info.resource,
                refCount: info.refCount
            }));
            
            // Re-render material previews when textures change
            if (this.isInitialized && !this.isInitializing) {
                console.log('Textures updated, re-rendering material previews');
                // Update all materials that use the changed textures
                textures.forEach((info, uuid) => {
                    this.materialService.updateMaterialsUsingTexture(uuid);
                });
                setTimeout(() => {
                    this.renderAllMaterialPreviews();
                    this.changeDetectorRef.detectChanges(); // Force UI update
                }, 100);
            }
            
            this.changeDetectorRef.detectChanges(); // Force UI update
        });
    }
    
    ngAfterViewInit() {
        if (!this.isBrowser) return;
        
        // Initialize shared WebGL context and render all material previews
        this.initSharedRenderer();
        
        // Listen for changes in the canvas list (when materials are added/removed)
        this.materialCanvases.changes.subscribe(() => {
            if (!this.isInitializing) {
                this.renderAllMaterialPreviews();
            }
        });
    }
    
    ngOnDestroy(): void {
        // Dispose shared renderer and resources
        this.disposeSharedRenderer();
    }
    
    /**
     * Initializes the shared WebGL renderer used for all material previews
     */
    private initSharedRenderer(): void {
        if (this.sharedRenderer) {
            // Already initialized
            return;
        }
        
        try {
            // Create a hidden canvas for the shared renderer
            const canvas = document.createElement('canvas');
            canvas.width = 128;  // Standard size for all previews
            canvas.height = 128;
            canvas.style.display = 'none';
            document.body.appendChild(canvas);
            
            // Create renderer with optimized settings
            this.sharedRenderer = new WebGLRenderer({ 
                canvas, 
                antialias: true,
                alpha: true,
                powerPreference: 'low-power',
                preserveDrawingBuffer: true  // Need this to read pixels back
            });
            this.sharedRenderer.setSize(canvas.width, canvas.height);
            this.sharedRenderer.setPixelRatio(1);  // Use 1:1 pixel ratio for previews
            this.sharedRenderer.setClearColor(0x222222);
            
            // Create shared scene
            this.sharedScene = new Scene();
            
            // Create shared camera with correct aspect ratio (1:1 for square canvas)
            this.sharedCamera = new PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 100);
            this.sharedCamera.position.set(0, 0, 3.5);
            
            // Add lights
            const ambientLight = new AmbientLight(0x404040);
            this.sharedScene.add(ambientLight);
            
            const directionalLight = new DirectionalLight(0xffffff, 1);
            directionalLight.position.set(1, 1, 1);
            this.sharedScene.add(directionalLight);
            
            // Create preview geometry (shared for all materials)
            this.previewGeometry = new SphereGeometry(1.2, 32, 32);
            
            // Create mesh (will swap materials for each preview)
            this.previewMesh = new Mesh(this.previewGeometry);
            this.previewMesh.rotation.x = 0.4;
            this.previewMesh.rotation.y = 0.8;
            this.sharedScene.add(this.previewMesh);
            
            // Add context lost event listener
            canvas.addEventListener('webglcontextlost', (event) => {
                console.warn('WebGL context lost for shared renderer');
                event.preventDefault();
                
                // Schedule context restoration
                setTimeout(() => {
                    this.disposeSharedRenderer();
                    this.initSharedRenderer();
                    this.renderAllMaterialPreviews();
                }, 500);
            }, false);
            
            this.isInitialized = true;
            
            // Render all material previews
            this.renderAllMaterialPreviews();
        } catch (error) {
            console.error('Error initializing shared renderer:', error);
            this.isInitialized = false;
        }
    }
    
    /**
     * Disposes the shared renderer and associated resources
     */
    private disposeSharedRenderer(): void {
        if (!this.sharedRenderer) return;
        
        // Dispose geometry
        if (this.previewGeometry) {
            this.previewGeometry.dispose();
            this.previewGeometry = null;
        }
        
        // Force context loss to free GPU resources immediately
        try {
            const gl = this.sharedRenderer.getContext();
            const ext = (gl as any).getExtension('WEBGL_lose_context');
            if (ext) {
                ext.loseContext();
            }
        } catch (e) {
            console.warn('Error forcing context loss:', e);
        }
        
        // Remove the canvas from the DOM
        if (this.sharedRenderer.domElement && this.sharedRenderer.domElement.parentNode) {
            this.sharedRenderer.domElement.parentNode.removeChild(this.sharedRenderer.domElement);
        }
        
        // Dispose renderer
        this.sharedRenderer.dispose();
        this.sharedRenderer.forceContextLoss();
        this.sharedRenderer = null;
        this.sharedScene = null;
        this.sharedCamera = null;
        this.previewMesh = null;
    }
    
    /**
     * Renders all material previews using the shared renderer
     */
    private renderAllMaterialPreviews(): void {
        if (!this.isBrowser || !this.materialCanvases || this.isInitializing) return;
        
        this.isInitializing = true;
        
        // Make sure shared renderer is initialized
        if (!this.sharedRenderer) {
            this.initSharedRenderer();
        }
        
        // If initialization failed, abort
        if (!this.sharedRenderer || !this.sharedScene || !this.sharedCamera || !this.previewMesh) {
            this.isInitializing = false;
            return;
        }
        
        // Get the total number of materials to render
        const totalMaterials = this.materialCanvases.length;
        
        // If there are no materials to render, mark as complete and return
        if (totalMaterials === 0) {
            this.isInitializing = false;
            return;
        }
        
        // If there are too many materials, batch the rendering to avoid GPU overload
        const BATCH_SIZE = 10; // Render max 10 materials at a time
        
        // Process each canvas in batches
        this.materialCanvases.forEach((canvasRef, i) => {
            const canvas = canvasRef.nativeElement;
            const dataUuid = canvas.getAttribute('data-uuid');
            
            if (!dataUuid) {
                console.warn('Canvas without data-uuid attribute');
                return;
            }
            
            // Obtener la información del material directamente por UUID
            const materialInfo = this.resourceService.materials.get(dataUuid);
            
            if (!materialInfo) {
                console.warn(`Material not found with UUID: ${dataUuid}`);
                return;
            }
            
            // Calculate which batch this material belongs to
            const batchIndex = Math.floor(i / BATCH_SIZE);
            
            // Use setTimeout to stagger rendering by batch
            setTimeout(() => {
                // Skip if the component has been destroyed or the canvas is no longer in the DOM
                if (!canvas.isConnected || !this.sharedRenderer || !this.sharedScene || !this.sharedCamera || !this.previewMesh) return;
                
                try {
                    // Set the material on the shared mesh
                    this.previewMesh.material = materialInfo.resource;
                    
                    // Ensure camera aspect ratio matches the canvas
                    if (this.sharedCamera) {
                        // For material previews, we want a perfect circle, so use 1:1 aspect ratio
                        this.sharedCamera.aspect = 1;
                        this.sharedCamera.updateProjectionMatrix();
                    }
                    
                    // Render to the shared renderer
                    this.sharedRenderer.render(this.sharedScene, this.sharedCamera);
                    
                    // Copy the result to the target canvas
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(this.sharedRenderer.domElement, 0, 0, canvas.width, canvas.height);
                        
                        // Guardar la previsualización en el servicio
                        try {
                            const dataUrl = canvas.toDataURL('image/png');
                            this.resourceService.saveMaterialPreview(dataUuid, dataUrl);
                        } catch (e) {
                            console.warn('Error al guardar la previsualización del material:', e);
                        }
                    }
                } catch (error) {
                    console.error('Error rendering material preview:', error);
                    // Show a fallback color instead
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.fillStyle = materialInfo.resource instanceof MeshStandardMaterial && materialInfo.resource.color 
                            ? `#${materialInfo.resource.color.getHexString()}` 
                            : '#888888';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        
                        // Guardar la previsualización de fallback en el servicio
                        try {
                            const dataUrl = canvas.toDataURL('image/png');
                            this.resourceService.saveMaterialPreview(dataUuid, dataUrl);
                        } catch (e) {
                            console.warn('Error al guardar la previsualización del material:', e);
                        }
                    }
                }
                
                // If this is the last material, mark initialization as complete
                if (i === totalMaterials - 1) {
                    this.isInitializing = false;
                    this.changeDetectorRef.detectChanges(); // Force UI update after all renders
                }
            }, batchIndex * 100 + (i % BATCH_SIZE) * 20); // 100ms between batches, 20ms between items in a batch
        });
        
        // Safety timeout to ensure isInitializing is reset even if some renders fail
        setTimeout(() => {
            this.isInitializing = false;
            this.changeDetectorRef.detectChanges(); // Force UI update
        }, totalMaterials * 30 + 500); // Generous timeout based on number of materials
    }

    /**
     * Abre el diálogo para añadir una nueva textura
     */
    addTexture(): void {
        this.resourceDialogService.openTextureDialog(false)
            .subscribe(result => {
                if (result) {
                    this.resourceDialogService.processTextureDialogResult(result);
                }
            });
    }

    /**
     * Abre el diálogo para editar una textura existente
     * @param texturePath Ruta de la textura a editar
     */
    editTexture(texturePath: string): void {
        this.resourceDialogService.openTextureDialog(true, texturePath)
            .subscribe(result => {
                if (result) {
                    this.resourceDialogService.processTextureDialogResult(result);
                }
            });
    }

    /**
     * Opens the material dialog to add a new material
     */
    addMaterial(): void {
        // Dispose shared renderer before opening the dialog to free GPU resources
        this.disposeSharedRenderer();
        
        this.resourceDialogService.openMaterialDialog(false).subscribe(result => {
            if (result) {
                this.resourceDialogService.processMaterialDialogResult(result);
                
                // Re-initialize material previews after adding a new material
                setTimeout(() => {
                    this.initSharedRenderer();
                    this.renderAllMaterialPreviews();
                }, 100);
            }
        });
    }

    /**
     * Opens the material dialog to edit an existing material
     * @param materialUuid UUID of the material to edit
     */
    editMaterial(materialUuid: string): void {
        // Dispose shared renderer before opening the dialog to free GPU resources
        this.disposeSharedRenderer();
        
        console.log(`Intentando editar material con UUID: ${materialUuid}`);
        
        // Listar todos los materiales disponibles para depuración
        console.log('Materiales disponibles:', Array.from(this.resourceService.materials.entries()).map(([uuid, info]) => ({
            uuid,
            name: info.name,
            refCount: info.refCount
        })));
        
        // Asegurarse de que estamos editando el material correcto
        const materialInfo = this.resourceService.materials.get(materialUuid);
        if (!materialInfo) {
            console.error(`Material not found with UUID: ${materialUuid}`);
            return;
        }
        
        console.log(`Editando material: ${materialInfo.name} (UUID: ${materialUuid})`);
        
        this.resourceDialogService.openMaterialDialog(true, materialUuid).subscribe(result => {
            if (result) {
                console.log(`Procesando resultado del diálogo para material: ${materialInfo.name} (UUID: ${materialUuid})`);
                this.resourceDialogService.processMaterialDialogResult(result);
                
                // Re-initialize material previews after editing a material
                setTimeout(() => {
                    this.initSharedRenderer();
                    this.renderAllMaterialPreviews();
                }, 100);
            }
        });
    }

    /**
     * Detiene la propagación de eventos de clic para evitar que interactúen con la escena
     */
    stopPropagation(event: MouseEvent): void {
        event.stopPropagation();
    }

    /**
     * Comprueba si un material tiene texturas asociadas
     * @param material Material a comprobar
     * @returns true if the material has at least one texture
     */
    hasMaterialTextures(material: any): boolean {
        return material && (material.map || material.normalMap || 
                           material.roughnessMap || material.metalnessMap || 
                           material.emissiveMap);
    }

    /**
     * Obtiene los nombres de las texturas asociadas a un material
     * @param material Material del que obtener las texturas
     * @returns Array with the names of the texture types
     */
    getMaterialTextureNames(material: any): string[] {
        const textureNames: string[] = [];
        
        if (!material) return textureNames;
        
        if (material.map) textureNames.push('albedo');
        if (material.normalMap) textureNames.push('normal');
        if (material.roughnessMap) textureNames.push('roughness');
        if (material.metalnessMap) textureNames.push('metalness');
        if (material.emissiveMap) textureNames.push('emissive');
        
        return textureNames;
    }
    
    /**
     * Maneja el inicio del arrastre de un material
     * @param event Evento de arrastre
     * @param materialId ID del material que se está arrastrando
     */
    onMaterialDragStart(event: DragEvent, materialId: string): void {
        if (event.dataTransfer) {
            // Configurar los datos para drag & drop
            event.dataTransfer.setData('application/material-id', materialId);
            event.dataTransfer.effectAllowed = 'copy';
            
            // Crear una imagen personalizada para el arrastre
            const materialInfo = this.resourceService.materials.get(materialId);
            if (materialInfo && materialInfo.resource instanceof MeshStandardMaterial) {
                const color = materialInfo.resource.color ? 
                    `#${materialInfo.resource.color.getHexString()}` : 
                    '#cccccc';
                
                const dragImage = document.createElement('div');
                dragImage.textContent = materialInfo.name;
                dragImage.style.backgroundColor = color;
                dragImage.style.color = this.getContrastColor(color);
                dragImage.style.padding = '8px';
                dragImage.style.borderRadius = '4px';
                dragImage.style.position = 'absolute';
                dragImage.style.top = '-1000px';
                document.body.appendChild(dragImage);
                
                event.dataTransfer.setDragImage(dragImage, 0, 0);
                
                // Eliminar el elemento después de un breve retraso
                setTimeout(() => {
                    document.body.removeChild(dragImage);
                }, 100);
            }
        }
    }
    
    /**
     * Calcula un color de contraste para un color dado
     * @param hexColor Color en formato hexadecimal (#RRGGBB)
     * @returns Color de contraste en formato hexadecimal
     */
    private getContrastColor(hexColor: string): string {
        // Eliminar el # si existe
        hexColor = hexColor.replace('#', '');
        
        // Convertir a RGB
        const r = parseInt(hexColor.substr(0, 2), 16);
        const g = parseInt(hexColor.substr(2, 2), 16);
        const b = parseInt(hexColor.substr(4, 2), 16);
        
        // Calcular luminosidad
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Devolver blanco o negro según la luminosidad
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    /**
     * Obtiene la URL de previsualización para una textura
     * @param texture Textura para la que obtener la URL de previsualización
     * @returns URL de previsualización o null si no se puede generar
     */
    getTexturePreviewUrl(texture: Texture | null): string | null {
        // Usar el método del ResourceService para obtener la URL de previsualización
        return this.resourceService.getTexturePreviewUrl(texture);
    }
} 