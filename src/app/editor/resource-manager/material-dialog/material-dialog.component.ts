import { Component, Inject, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSliderModule } from '@angular/material/slider';
import { Material, MeshStandardMaterial, Color, WebGLRenderer, Scene, PerspectiveCamera, SphereGeometry, Mesh, DirectionalLight, AmbientLight, TextureLoader, Side, BoxGeometry, TorusKnotGeometry } from 'three';
import { MatListModule } from '@angular/material/list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { PLATFORM_ID, Inject as NgInject } from '@angular/core';
import * as THREE from 'three';
import { TextureSelectionDialogComponent } from '../texture-selection-dialog/texture-selection-dialog.component';
import { TextureManagerAdapter } from '../texture-manager-adapter.service';
import { MaterialManagerAdapter } from '../material-manager-adapter.service';
import { RendererPoolService } from '../../services/renderer-pool.service';

export interface MaterialDialogData {
    isEdit: boolean;
    name?: string;
    material?: Material;
    uuid?: string;
}

@Component({
    standalone: true,
    selector: 'app-material-dialog',
    templateUrl: './material-dialog.component.html',
    styleUrls: ['./material-dialog.component.scss'],
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatButtonModule,
        MatIconModule,
        MatTabsModule,
        MatListModule,
        MatButtonToggleModule,
        MatTooltipModule,
        MatSliderModule
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MaterialDialogComponent implements AfterViewInit, OnDestroy, OnInit {
    materialName: string = '';
    materialType: string = 'MeshStandardMaterial';
    color: string = '#ffffff';
    roughness: number = 0.5;
    metalness: number = 0.0;
    transparent: boolean = false;
    opacity: number = 1.0;
    side: number = 0; // THREE.FrontSide
    flatShading: boolean = false;
    wireframe: boolean = false;

    // Texture maps
    albedoMapUuidTexture: string = '';
    normalMapUuidTexture: string = '';
    roughnessMapUuidTexture: string = '';
    metalnessMapUuidTexture: string = '';
    emissiveMapUuidTexture: string = '';

    previewShape: string = 'sphere';
    lightIntensity: number = 1.0;
    darkBackground: boolean = true;
    private directionalLight!: DirectionalLight;

    @ViewChild('previewCanvas') previewCanvasRef!: ElementRef<HTMLCanvasElement>;

    private renderer!: WebGLRenderer;
    private scene!: Scene;
    private camera!: PerspectiveCamera;
    private previewMesh!: Mesh;
    private animationFrameId: number = 0;
    private previewMaterial!: MeshStandardMaterial | THREE.MeshBasicMaterial;

    // Propiedades adicionales
    alphaTest: number = 0;
    depthTest: boolean = true;
    depthWrite: boolean = true;
    emissiveColor: string = '#000000';
    emissiveIntensity: number = 0;
    emissiveMap: string = '';

    private styleElement: HTMLStyleElement | null = null;
    private isBrowser: boolean;

    constructor(
        public dialogRef: MatDialogRef<MaterialDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: MaterialDialogData,
        private dialog: MatDialog,
        @NgInject(PLATFORM_ID) platformId: Object,
        private textureManager: TextureManagerAdapter,
        private materialManager: MaterialManagerAdapter,
        private rendererPool: RendererPoolService
    ) {
        this.isBrowser = isPlatformBrowser(platformId);

        if (data.isEdit && data.material) {
            this.materialName = data.name || '';

            // Verificar el tipo de material
            if (data.material instanceof MeshStandardMaterial || data.material instanceof THREE.MeshBasicMaterial) {
                const material = data.material;
                this.materialType = material instanceof MeshStandardMaterial ? 'MeshStandardMaterial' : 'MeshBasicMaterial';

                console.log('Material recibido:', material);
                console.log('Texturas disponibles:', Array.from(this.textureManager.textures.entries()));

                // Propiedades básicas
                this.color = '#' + material.color.getHexString();
                this.transparent = material.transparent;
                this.opacity = material.opacity;
                this.side = material.side;
                this.wireframe = material.wireframe;

                // Propiedades específicas de MeshStandardMaterial
                if (material instanceof MeshStandardMaterial) {
                    this.roughness = material.roughness;
                    this.metalness = material.metalness;
                    this.flatShading = material.flatShading;
                    this.emissiveColor = '#' + material.emissive.getHexString();
                    this.emissiveIntensity = material.emissiveIntensity;
                }

                // Propiedades avanzadas
                this.alphaTest = material.alphaTest;
                this.depthTest = material.depthTest;
                this.depthWrite = material.depthWrite;

                // Obtener los UUIDs de las texturas del userData
                const textureUuids = material.userData?.textureUuids || {};
                console.log('UUIDs de texturas del material:', textureUuids);

                // Asignar los UUIDs a las propiedades correspondientes según el tipo de material
                if (material instanceof MeshStandardMaterial) {
                    this.albedoMapUuidTexture = textureUuids.map || '';
                    this.normalMapUuidTexture = textureUuids.normalMap || '';
                    this.roughnessMapUuidTexture = textureUuids.roughnessMap || '';
                    this.metalnessMapUuidTexture = textureUuids.metalnessMap || '';
                    this.emissiveMapUuidTexture = textureUuids.emissiveMap || '';
                } else if (material instanceof THREE.MeshBasicMaterial) {
                    // Para MeshBasicMaterial solo usamos el mapa de albedo (map)
                    this.albedoMapUuidTexture = textureUuids.map || '';

                    // Limpiar los otros mapas que no se usan en MeshBasicMaterial
                    this.normalMapUuidTexture = '';
                    this.roughnessMapUuidTexture = '';
                    this.metalnessMapUuidTexture = '';
                    this.emissiveMapUuidTexture = '';

                    // Log para debug
                    if (material.map) {
                        console.log('MeshBasicMaterial tiene textura map:', material.map);
                        console.log('UUID de la textura map:', material.map.uuid);
                    }
                }
            }
        }
    }

    ngOnInit(): void {
        if (!this.isBrowser) return;

        // No volver a inicializar las texturas aquí, ya se hizo en el constructor

        // Añadir estilos globales para el panel del diálogo
        const style = document.createElement('style');
        style.textContent = `
            .material-dialog-panel {
                background-color: #2a2a2a !important;
                border-radius: 8px !important;
                color: #ffffff !important;
            }
            .material-dialog-panel .mat-mdc-dialog-surface {
                background-color: #2a2a2a !important;
                color: #ffffff !important;
            }
        `;
        document.head.appendChild(style);

        // Guardar referencia al elemento de estilo para limpiarlo cuando se destruya el componente
        this.styleElement = style;
    }

    ngAfterViewInit(): void {
        if (!this.isBrowser) return;

        // Usar requestAnimationFrame para asegurarse de que el DOM está listo
        requestAnimationFrame(() => {
            if (this.previewCanvasRef && this.previewCanvasRef.nativeElement) {
                console.log('Inicializando renderizador de previsualización');
                this.initPreviewRenderer();
                this.updatePreviewMaterial();
            } else {
                console.warn('El elemento previewCanvas no está disponible');
            }
        });
    }

    ngOnDestroy(): void {
        if (!this.isBrowser) return;

        // Cancelar animación
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = 0;
        }

        // Limpiar escena y recursos
        if (this.scene) {
            this.scene.traverse((object) => {
                if (object instanceof Mesh) {
                    if (object.geometry) {
                        object.geometry.dispose();
                    }
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => {
                                Object.values(material).forEach(value => {
                                    if (value instanceof THREE.Texture) {
                                        value.dispose();
                                    }
                                });
                                material.dispose();
                            });
                        } else {
                            Object.values(object.material).forEach(value => {
                                if (value instanceof THREE.Texture) {
                                    value.dispose();
                                }
                            });
                            object.material.dispose();
                        }
                    }
                }
            });
            this.scene = null!;
        }

        // Devolver el renderer al pool
        if (this.renderer) {
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
            this.rendererPool.releaseRenderer(this.renderer);
            this.renderer = null!;
        }

        // Eliminar estilos globales
        if (this.styleElement) {
            document.head.removeChild(this.styleElement);
            this.styleElement = null;
        }
    }

    /**
     * Inicializa el renderizador para la vista previa del material
     */
    private initPreviewRenderer(): void {
        if (!this.previewCanvasRef || !this.previewCanvasRef.nativeElement) {
            console.warn('No se puede inicializar el renderizador: el elemento canvas no está disponible');
            return;
        }

        const container = this.previewCanvasRef.nativeElement;

        try {
            this.renderer = this.rendererPool.acquireRenderer({
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance',
                preserveDrawingBuffer: false,
                pixelRatio: Math.min(window.devicePixelRatio, 2)
            });

            const rect = container.getBoundingClientRect();
            const width = Math.floor(rect.width);
            const height = Math.floor(rect.height);
            
            this.renderer.setSize(width, height, false);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            container.appendChild(this.renderer.domElement);
            this.renderer.setClearColor(this.darkBackground ? 0x222222 : 0xeeeeee, 1);

            // Asegurarse de que el canvas del renderer tenga el tamaño correcto
            this.renderer.domElement.style.width = '100%';
            this.renderer.domElement.style.height = '100%';

            if (!this.scene) {
                this.scene = new Scene();
                this.camera = new PerspectiveCamera(45, width / height, 0.1, 100);
                this.camera.position.set(0, 0, 3);
                this.camera.lookAt(0, 0, 0);

                const ambientLight = new AmbientLight(0x404040, 0.5);
                this.scene.add(ambientLight);

                this.directionalLight = new DirectionalLight(0xffffff, this.lightIntensity);
                this.directionalLight.position.set(1, 1, 1);
                this.scene.add(this.directionalLight);

                this.previewMaterial = this.materialType === 'MeshStandardMaterial'
                    ? new MeshStandardMaterial()
                    : new THREE.MeshBasicMaterial();

                const geometry = new SphereGeometry(1, 32, 32);
                this.previewMesh = new Mesh(geometry, this.previewMaterial);
                this.scene.add(this.previewMesh);
            }

            this.updatePreviewMaterial();
            this.renderer.render(this.scene, this.camera);

            if (!this.animationFrameId) {
                this.animate();
            }

            const resizeObserver = new ResizeObserver(() => {
                if (!this.renderer || !this.camera) return;
                
                const rect = container.getBoundingClientRect();
                const width = Math.floor(rect.width);
                const height = Math.floor(rect.height);
                
                this.camera.aspect = width / height;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(width, height, false);
            });
            
            resizeObserver.observe(container);
            this.dialogRef.beforeClosed().subscribe(() => resizeObserver.disconnect());

        } catch (error) {
            console.error('Error al inicializar el renderer:', error);
            this.handleRenderError(container, error);
        }
    }

    private handleRenderError(container: HTMLElement, error: any): void {
        // Limpiar recursos existentes
        if (this.renderer) {
            this.rendererPool.releaseRenderer(this.renderer);
            this.renderer = null!;
        }

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = 0;
        }

        // Mostrar mensaje de error en el DOM
        const errorDiv = document.createElement('div');
        errorDiv.className = 'render-error';
        errorDiv.innerHTML = `
            <div class="error-message">
                <mat-icon>error</mat-icon>
                <span>Error en la previsualización 3D</span>
                <small>${error.message || 'Error desconocido'}</small>
            </div>
        `;
        container.appendChild(errorDiv);
    }

    /**
     * Actualiza el material de vista previa con las propiedades actuales
     */
    updatePreviewMaterial(): void {
        if (!this.previewMaterial) {
            console.warn('No se puede actualizar el material de vista previa: el material no está disponible');
            return;
        }

        // Actualizar propiedades básicas comunes
        this.previewMaterial.color = new Color(this.color);
        this.previewMaterial.transparent = this.transparent;
        this.previewMaterial.opacity = this.opacity;
        this.previewMaterial.side = this.side as Side;
        this.previewMaterial.wireframe = this.wireframe;
        this.previewMaterial.alphaTest = this.alphaTest;
        this.previewMaterial.depthTest = this.depthTest;
        this.previewMaterial.depthWrite = this.depthWrite;

        // Actualizar propiedades específicas según el tipo de material
        if (this.previewMaterial instanceof MeshStandardMaterial) {
            this.previewMaterial.roughness = this.roughness;
            this.previewMaterial.metalness = this.metalness;
            this.previewMaterial.flatShading = this.flatShading;
            this.previewMaterial.emissive = new Color(this.emissiveColor);
            this.previewMaterial.emissiveIntensity = this.emissiveIntensity;
        }

        // Actualizar mapas de textura
        this.updateTextureMaps();

        // Marcar el material como necesitado de actualización
        this.previewMaterial.needsUpdate = true;
    }

    /**
     * Actualiza los mapas de textura del material de vista previa
     */
    private updateTextureMaps(): void {
        if (!this.previewMaterial) {
            console.warn('No se pueden actualizar los mapas de textura: el material no está disponible');
            return;
        }

        // Limpiar mapas existentes según el tipo de material
        if (this.previewMaterial instanceof MeshStandardMaterial) {
            this.previewMaterial.map = null;
            this.previewMaterial.normalMap = null;
            this.previewMaterial.roughnessMap = null;
            this.previewMaterial.metalnessMap = null;
            this.previewMaterial.emissiveMap = null;
        } else if (this.previewMaterial instanceof THREE.MeshBasicMaterial) {
            this.previewMaterial.map = null;
            this.previewMaterial.alphaMap = null;
            this.previewMaterial.envMap = null;
            this.previewMaterial.lightMap = null;
            this.previewMaterial.specularMap = null;
        }

        // Obtener las texturas del TextureManager usando los UUIDs
        const applyTexture = (uuid: string, textureType: string) => {
            if (!uuid) return;

            const textureInfo = this.textureManager.textures.get(uuid);
            if (textureInfo && textureInfo.resource) {
                console.log(`Aplicando textura ${textureType}: ${uuid}`);

                if (this.previewMaterial instanceof MeshStandardMaterial) {
                    switch (textureType) {
                        case 'albedo': this.previewMaterial.map = textureInfo.resource; break;
                        case 'normal': this.previewMaterial.normalMap = textureInfo.resource; break;
                        case 'roughness': this.previewMaterial.roughnessMap = textureInfo.resource; break;
                        case 'metalness': this.previewMaterial.metalnessMap = textureInfo.resource; break;
                        case 'emissive': this.previewMaterial.emissiveMap = textureInfo.resource; break;
                    }
                } else if (this.previewMaterial instanceof THREE.MeshBasicMaterial) {
                    switch (textureType) {
                        case 'albedo': this.previewMaterial.map = textureInfo.resource; break;
                        case 'alpha': this.previewMaterial.alphaMap = textureInfo.resource; break;
                        case 'environment': this.previewMaterial.envMap = textureInfo.resource; break;
                        case 'light': this.previewMaterial.lightMap = textureInfo.resource; break;
                        case 'specular': this.previewMaterial.specularMap = textureInfo.resource; break;
                    }
                }
            }
        };

        // Aplicar todas las texturas
        applyTexture(this.albedoMapUuidTexture, 'albedo');
        applyTexture(this.normalMapUuidTexture, 'normal');
        applyTexture(this.roughnessMapUuidTexture, 'roughness');
        applyTexture(this.metalnessMapUuidTexture, 'metalness');
        applyTexture(this.emissiveMapUuidTexture, 'emissive');

        // Forzar actualización del material
        this.previewMaterial.needsUpdate = true;
    }

    /**
     * Anima la vista previa del material
     */
    private animate(): void {
        if (!this.renderer || !this.scene || !this.camera || !this.previewMesh) {
            console.warn('No se puede animar: faltan elementos necesarios');
            return;
        }

        try {
            // Rotar el mesh
            this.previewMesh.rotation.x += 0.005;
            this.previewMesh.rotation.y += 0.01;

            // Renderizar la escena
            this.renderer.render(this.scene, this.camera);

            // Solicitar el siguiente frame solo si el componente sigue activo
            this.animationFrameId = requestAnimationFrame(() => this.animate());
        } catch (error) {
            console.error('Error en el bucle de animación:', error);
            this.handleRenderError(this.previewCanvasRef.nativeElement, error);
        }
    }

    /**
     * Obtiene la URL de vista previa de una textura
     * @param uuid UUID de la textura
     * @returns URL de la imagen de vista previa
     */
    getTexturePreviewUrl(uuid: string): string | null {
        if (!uuid) {
            console.warn('No se puede obtener la URL de vista previa: UUID vacío');
            return null;
        }

        // Primero intentar obtener la previsualización directamente por UUID
        const preview = this.textureManager.getTexturePreview(uuid);
        if (preview) {
            return preview;
        }

        // Si no hay previsualización guardada, intentar obtenerla de la textura
        const textureInfo = this.textureManager.textures.get(uuid);
        if (textureInfo && textureInfo.resource) {
            const previewUrl = this.textureManager.getTexturePreviewUrl(textureInfo.resource);
            if (previewUrl) {
                // Guardar la previsualización para futuros usos
                this.textureManager.saveTexturePreview(uuid, previewUrl);
                return previewUrl;
            }
        }

        console.error(`No se pudo encontrar la previsualización para la textura: ${uuid}`);
        return null;
    }

    /**
     * Limpia una textura del material
     * @param type Tipo de textura a limpiar
     */
    clearTexture(type: 'albedo' | 'normal' | 'roughness' | 'metalness' | 'emissive'): void {
        switch (type) {
            case 'albedo':
                this.albedoMapUuidTexture = '';
                break;
            case 'normal':
                this.normalMapUuidTexture = '';
                break;
            case 'roughness':
                this.roughnessMapUuidTexture = '';
                break;
            case 'metalness':
                this.metalnessMapUuidTexture = '';
                break;
            case 'emissive':
                this.emissiveMapUuidTexture = '';
                break;
        }

        // Actualizar la vista previa del material
        this.updatePreviewMaterial();
    }

    /**
     * Abre un diálogo para seleccionar una textura
     */
    selectTexture(type: 'albedo' | 'normal' | 'roughness' | 'metalness' | 'emissive'): void {
        // Crear un diálogo simple para seleccionar una textura existente
        const dialogRef = this.dialog.open(TextureSelectionDialogComponent, {
            width: '500px',
            data: {
                textures: Array.from(this.textureManager.textures.entries()).map(([uuid]) => uuid)
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                console.log(`Textura seleccionada UUID: ${result}`);

                // Actualizar el campo correspondiente según el tipo
                switch (type) {
                    case 'albedo':
                        this.albedoMapUuidTexture = result;
                        break;
                    case 'normal':
                        this.normalMapUuidTexture = result;
                        break;
                    case 'roughness':
                        this.roughnessMapUuidTexture = result;
                        break;
                    case 'metalness':
                        this.metalnessMapUuidTexture = result;
                        break;
                    case 'emissive':
                        this.emissiveMapUuidTexture = result;
                        break;
                }

                // Actualizar la vista previa del material
                this.updatePreviewMaterial();
            }
        });
    }

    /**
     * Detiene la propagación de eventos de clic para evitar que interactúen con la escena
     */
    stopPropagation(event: MouseEvent): void {
        event.stopPropagation();
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onConfirm(): void {
        console.log('Confirmando diálogo de material');
        console.log('Datos originales:', this.data);

        // Crear un objeto con las propiedades del material
        const materialProperties: any = {
            name: this.materialName,
            color: this.color,
            roughness: this.roughness,
            metalness: this.metalness,
            transparent: this.transparent,
            opacity: this.opacity,
            side: this.side,
            flatShading: this.flatShading,
            wireframe: this.wireframe,
            alphaTest: this.alphaTest,
            depthTest: this.depthTest,
            depthWrite: this.depthWrite,
            emissiveColor: this.emissiveColor,
            emissiveIntensity: this.emissiveIntensity
        };

        // Añadir mapas de textura si están definidos
        if (this.albedoMapUuidTexture) materialProperties.map = this.albedoMapUuidTexture;
        if (this.normalMapUuidTexture) materialProperties.normalMap = this.normalMapUuidTexture;
        if (this.roughnessMapUuidTexture) materialProperties.roughnessMap = this.roughnessMapUuidTexture;
        if (this.metalnessMapUuidTexture) materialProperties.metalnessMap = this.metalnessMapUuidTexture;
        if (this.emissiveMapUuidTexture) materialProperties.emissiveMap = this.emissiveMapUuidTexture;

        // Crear el resultado
        const result = {
            isEdit: this.data.isEdit,
            name: this.materialName,
            properties: materialProperties,
            uuid: this.data.uuid,
            data: this.data
        };

        console.log('Resultado del diálogo:', result);

        // Devolver el resultado
        this.dialogRef.close(result);
    }

    /**
     * Cambia la forma del objeto de vista previa
     * @param shape Forma a utilizar ('sphere', 'cube', 'torus', 'cylinder')
     */
    changePreviewShape(shape: string): void {
        if (!this.scene || !this.previewMesh) return;

        // Eliminar el mesh actual de la escena
        this.scene.remove(this.previewMesh);

        // Crear la nueva geometría según la forma seleccionada
        let geometry;
        switch (shape) {
            case 'sphere':
                geometry = new SphereGeometry(1, 32, 32);
                break;
            case 'cube':
                geometry = new BoxGeometry(1.5, 1.5, 1.5);
                break;
            case 'torus':
                geometry = new TorusKnotGeometry(0.8, 0.3, 100, 16);
                break;
            default:
                geometry = new SphereGeometry(1, 32, 32);
                break;
        }

        // Crear el nuevo mesh con la geometría seleccionada y el material actual
        this.previewMesh = new Mesh(geometry, this.previewMaterial);

        // Añadir el nuevo mesh a la escena
        this.scene.add(this.previewMesh);

        // Actualizar la variable de estado
        this.previewShape = shape;
    }

    /**
     * Actualiza la intensidad de la luz en la escena
     */
    updateLighting(): void {
        if (this.directionalLight) {
            this.directionalLight.intensity = this.lightIntensity;
        }
    }

    /**
     * Cambia el fondo de la vista previa entre claro y oscuro
     * @param isDark Si es true, el fondo será oscuro
     */
    toggleBackground(isDark: boolean): void {
        this.darkBackground = isDark;

        if (this.renderer) {
            if (isDark) {
                this.renderer.setClearColor(0x222222);
            } else {
                this.renderer.setClearColor(0xeeeeee);
            }
        }
    }

    /**
     * Busca una textura en el TextureManager por su nombre
     */
    private findTextureByName(name: string): { uuid: string } | null {
        for (const [uuid, info] of this.textureManager.textures.entries()) {
            if (info.name === name) {
                return { uuid };
            }
        }
        return null;
    }

} 