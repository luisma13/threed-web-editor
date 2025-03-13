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
import { Material, MeshStandardMaterial, Color, WebGLRenderer, Scene, PerspectiveCamera, SphereGeometry, Mesh, DirectionalLight, AmbientLight, TextureLoader, Side, BoxGeometry, TorusKnotGeometry, CylinderGeometry } from 'three';
import { ResourceService } from '../resource.service';
import { MatListModule } from '@angular/material/list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { PLATFORM_ID, Inject as NgInject } from '@angular/core';
import * as THREE from 'three';
import { TextureSelectionDialogComponent } from '../texture-selection-dialog/texture-selection-dialog.component';

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
    albedoMap: string = '';
    normalMap: string = '';
    roughnessMap: string = '';
    metalnessMap: string = '';

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
    private previewMaterial!: MeshStandardMaterial;

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
        private resourceService: ResourceService,
        @NgInject(PLATFORM_ID) platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
        
        if (data.isEdit && data.material) {
            this.materialName = data.name || '';
            
            // Verificar si es un MeshStandardMaterial
            if (data.material instanceof MeshStandardMaterial) {
                const material = data.material as MeshStandardMaterial;
                
                // Propiedades básicas
                this.color = '#' + material.color.getHexString();
                this.roughness = material.roughness;
                this.metalness = material.metalness;
                this.transparent = material.transparent;
                this.opacity = material.opacity;
                this.side = material.side;
                this.flatShading = material.flatShading;
                this.wireframe = material.wireframe;
                
                // Propiedades avanzadas
                this.alphaTest = material.alphaTest;
                this.depthTest = material.depthTest;
                this.depthWrite = material.depthWrite;
                this.emissiveColor = '#' + material.emissive.getHexString();
                this.emissiveIntensity = material.emissiveIntensity;
                
                // Mapas de textura
                this.albedoMap = material.map?.name || '';
                this.normalMap = material.normalMap?.name || '';
                this.roughnessMap = material.roughnessMap?.name || '';
                this.metalnessMap = material.metalnessMap?.name || '';
                this.emissiveMap = material.emissiveMap?.name || '';
            }
        }
    }

    ngOnInit(): void {
        if (!this.isBrowser) return;
        
        console.log('Inicializando diálogo de material con datos:', this.data);
        
        // Inicializar valores del formulario
        if (this.data.isEdit && this.data.material) {
            console.log(`Editando material existente con UUID: ${this.data.uuid}`);
            
            // Usar el material proporcionado para inicializar los valores
            const material = this.data.material as MeshStandardMaterial;
            
            // Inicializar nombre
            this.materialName = this.data.name || material.name || '';
            
            // Inicializar propiedades básicas
            this.color = '#' + material.color.getHexString();
            this.roughness = material.roughness;
            this.metalness = material.metalness;
            this.transparent = material.transparent;
            this.opacity = material.opacity;
            this.side = material.side;
            this.flatShading = material.flatShading;
            this.wireframe = material.wireframe;
            
            // Inicializar propiedades avanzadas
            this.alphaTest = material.alphaTest;
            this.depthTest = material.depthTest;
            this.depthWrite = material.depthWrite;
            
            // Inicializar propiedades de emisión
            this.emissiveColor = '#' + material.emissive.getHexString();
            this.emissiveIntensity = material.emissiveIntensity;
            
            // Inicializar mapas de textura
            this.albedoMap = material.map ? material.map.name : '';
            this.normalMap = material.normalMap ? material.normalMap.name : '';
            this.roughnessMap = material.roughnessMap ? material.roughnessMap.name : '';
            this.metalnessMap = material.metalnessMap ? material.metalnessMap.name : '';
            this.emissiveMap = material.emissiveMap ? material.emissiveMap.name : '';
            
            console.log('Material inicializado con valores:', {
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
                emissiveIntensity: this.emissiveIntensity,
                albedoMap: this.albedoMap ? 'presente' : 'no presente',
                normalMap: this.normalMap ? 'presente' : 'no presente',
                roughnessMap: this.roughnessMap ? 'presente' : 'no presente',
                metalnessMap: this.metalnessMap ? 'presente' : 'no presente',
                emissiveMap: this.emissiveMap ? 'presente' : 'no presente'
            });
        } else {
            console.log('Creando nuevo material');
            
            // Valores por defecto para un nuevo material
            this.materialName = this.data.name || 'Nuevo Material';
            this.color = '#cccccc';
            this.roughness = 0.5;
            this.metalness = 0.0;
            this.transparent = false;
            this.opacity = 1.0;
            this.side = THREE.FrontSide;
            this.flatShading = false;
            this.wireframe = false;
            this.alphaTest = 0.0;
            this.depthTest = true;
            this.depthWrite = true;
            this.emissiveColor = '#000000';
            this.emissiveIntensity = 0.0;
        }
        
        // No inicializar el renderizador aquí, se hará en ngAfterViewInit
        
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
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        if (this.renderer) {
            // Forzar la pérdida de contexto para liberar recursos GPU inmediatamente
            try {
                const gl = this.renderer.getContext();
                const ext = (gl as any).getExtension('WEBGL_lose_context');
                if (ext) {
                    ext.loseContext();
                }
            } catch (e) {
                console.warn('Error forcing context loss in material dialog:', e);
            }
            
            this.renderer.dispose();
            this.renderer.forceContextLoss();
            this.renderer.domElement = null as any;
        }
        
        if (this.previewMaterial) {
            // No disponer el material ya que puede ser usado en la escena
            // Solo limpiar la referencia
            this.previewMaterial = null as any;
        }
        
        // Eliminar los estilos globales
        if (this.styleElement) {
            document.head.removeChild(this.styleElement);
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
        
        const canvas = this.previewCanvasRef.nativeElement;
        
        try {
            // Crear el renderizador con opciones optimizadas
            this.renderer = new WebGLRenderer({ 
                canvas, 
                antialias: true,
                alpha: true,
                powerPreference: 'low-power', // Usar modo de baja potencia para mejor rendimiento
                preserveDrawingBuffer: false // Mejor rendimiento y menos uso de memoria
            });
            this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limitar el pixel ratio para mejor rendimiento
            
            // Establecer el color de fondo según la preferencia
            if (this.darkBackground) {
                this.renderer.setClearColor(0x222222);
            } else {
                this.renderer.setClearColor(0xeeeeee);
            }
            
            // Crear la escena
            this.scene = new Scene();
            
            // Crear la cámara
            this.camera = new PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
            this.camera.position.set(0, 0, 3);
            
            // Añadir luces
            const ambientLight = new AmbientLight(0x404040);
            this.scene.add(ambientLight);
            
            this.directionalLight = new DirectionalLight(0xffffff, this.lightIntensity);
            this.directionalLight.position.set(1, 1, 1);
            this.scene.add(this.directionalLight);
            
            // Crear el material de vista previa
            this.previewMaterial = new MeshStandardMaterial();
            
            // Crear la geometría de la esfera
            const geometry = new SphereGeometry(1, 32, 32);
            
            // Crear el mesh
            this.previewMesh = new Mesh(geometry, this.previewMaterial);
            this.scene.add(this.previewMesh);
            
            // Añadir listener para pérdida de contexto
            canvas.addEventListener('webglcontextlost', (event) => {
                console.warn('WebGL context lost in material dialog');
                event.preventDefault();
                
                // Cancelar la animación si está en curso
                if (this.animationFrameId) {
                    cancelAnimationFrame(this.animationFrameId);
                    this.animationFrameId = 0;
                }
            }, false);
            
            canvas.addEventListener('webglcontextrestored', () => {
                console.log('WebGL context restored in material dialog');
                // Reiniciar la animación cuando se restaure el contexto
                if (!this.animationFrameId) {
                    this.animate();
                }
            }, false);
            
            // Iniciar la animación
            this.animate();
        } catch (error) {
            console.error('Error initializing preview renderer:', error);
            // Mostrar un mensaje de error en el canvas
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#333333';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ff5555';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Error initializing 3D preview', canvas.width / 2, canvas.height / 2);
            }
        }
    }

    /**
     * Actualiza el material de vista previa con las propiedades actuales
     */
    updatePreviewMaterial(): void {
        if (!this.previewMaterial) {
            console.warn('No se puede actualizar el material de vista previa: el material no está disponible');
            return;
        }
        
        // Actualizar propiedades básicas
        this.previewMaterial.color = new Color(this.color);
        this.previewMaterial.roughness = this.roughness;
        this.previewMaterial.metalness = this.metalness;
        this.previewMaterial.transparent = this.transparent;
        this.previewMaterial.opacity = this.opacity;
        this.previewMaterial.side = this.side as Side;
        this.previewMaterial.flatShading = this.flatShading;
        this.previewMaterial.wireframe = this.wireframe;
        
        // Propiedades avanzadas
        this.previewMaterial.alphaTest = this.alphaTest;
        this.previewMaterial.depthTest = this.depthTest;
        this.previewMaterial.depthWrite = this.depthWrite;
        this.previewMaterial.emissive = new Color(this.emissiveColor);
        this.previewMaterial.emissiveIntensity = this.emissiveIntensity;
        
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
        
        // Limpiar mapas existentes
        this.previewMaterial.map = null;
        this.previewMaterial.normalMap = null;
        this.previewMaterial.roughnessMap = null;
        this.previewMaterial.metalnessMap = null;
        this.previewMaterial.emissiveMap = null;
        
        // Función auxiliar para obtener una textura por UUID o nombre
        const getTextureByUuidOrName = (textureId: string): any => {
            if (!textureId) return null;
            
            // Intentar obtener la textura directamente por UUID/clave
            if (this.resourceService.textures.has(textureId)) {
                return this.resourceService.textures.get(textureId)?.resource || null;
            }
            
            // Si no se encuentra por UUID, intentar buscarla por nombre
            console.warn(`No se encontró la textura "${textureId}" por UUID, intentando buscar por nombre...`);
            const textureByName = Array.from(this.resourceService.textures.entries())
                .find(([_, info]) => info.name === textureId);
            
            if (textureByName) {
                console.log(`Textura encontrada por nombre: ${textureByName[0]}`);
                
                // Actualizar la referencia en el campo correspondiente
                if (this.albedoMap === textureId) this.albedoMap = textureByName[0];
                if (this.normalMap === textureId) this.normalMap = textureByName[0];
                if (this.roughnessMap === textureId) this.roughnessMap = textureByName[0];
                if (this.metalnessMap === textureId) this.metalnessMap = textureByName[0];
                if (this.emissiveMap === textureId) this.emissiveMap = textureByName[0];
                
                return textureByName[1].resource;
            }
            
            console.error(`No se pudo encontrar la textura "${textureId}" ni por UUID ni por nombre`);
            return null;
        };
        
        // Obtener texturas del ResourceService
        if (this.albedoMap) {
            this.previewMaterial.map = getTextureByUuidOrName(this.albedoMap);
        }
        
        if (this.normalMap) {
            this.previewMaterial.normalMap = getTextureByUuidOrName(this.normalMap);
        }
        
        if (this.roughnessMap) {
            this.previewMaterial.roughnessMap = getTextureByUuidOrName(this.roughnessMap);
        }
        
        if (this.metalnessMap) {
            this.previewMaterial.metalnessMap = getTextureByUuidOrName(this.metalnessMap);
        }

        if (this.emissiveMap) {
            this.previewMaterial.emissiveMap = getTextureByUuidOrName(this.emissiveMap);
        }
    }

    /**
     * Anima la vista previa del material
     */
    private animate(): void {
        // Si el renderizador no está disponible, no hacer nada
        if (!this.renderer || !this.scene || !this.camera || !this.previewMesh) {
            console.warn('No se puede animar: faltan elementos necesarios');
            return;
        }
        
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        
        // Rotar la esfera para ver el material desde diferentes ángulos
        this.previewMesh.rotation.x += 0.005;
        this.previewMesh.rotation.y += 0.01;
        
        try {
            this.renderer.render(this.scene, this.camera);
        } catch (error) {
            console.error('Error rendering material preview:', error);
            // Cancelar la animación si hay un error
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = 0;
            }
        }
    }

    /**
     * Obtiene la URL de vista previa de una textura
     * @param texturePath Ruta de la textura
     * @returns URL de la imagen de vista previa
     */
    getTexturePreviewUrl(texturePath: string): string | null {
        if (!texturePath) {
            console.warn('No se puede obtener la URL de vista previa: la ruta de la textura está vacía');
            return null;
        }
        
        // Intentar obtener la textura directamente por UUID/clave
        if (this.resourceService.textures.has(texturePath)) {
            const textureInfo = this.resourceService.textures.get(texturePath);
            if (textureInfo && textureInfo.resource && textureInfo.resource.image) {
                return textureInfo.resource.image.src || null;
            }
        }
        
        // Si no se encuentra por UUID, intentar buscarla por nombre
        console.warn(`No se encontró la textura "${texturePath}" por UUID, intentando buscar por nombre...`);
        const textureByName = Array.from(this.resourceService.textures.entries())
            .find(([_, info]) => info.name === texturePath);
        
        if (textureByName) {
            console.log(`Textura encontrada por nombre: ${textureByName[0]}`);
            const textureInfo = textureByName[1];
            
            // Actualizar la referencia en el campo correspondiente
            if (this.albedoMap === texturePath) this.albedoMap = textureByName[0];
            if (this.normalMap === texturePath) this.normalMap = textureByName[0];
            if (this.roughnessMap === texturePath) this.roughnessMap = textureByName[0];
            if (this.metalnessMap === texturePath) this.metalnessMap = textureByName[0];
            if (this.emissiveMap === texturePath) this.emissiveMap = textureByName[0];
            
            if (textureInfo.resource && textureInfo.resource.image) {
                return textureInfo.resource.image.src || null;
            }
        }
        
        console.error(`No se pudo encontrar la textura "${texturePath}" ni por UUID ni por nombre`);
        return null;
    }

    /**
     * Limpia una textura del material
     * @param type Tipo de textura a limpiar
     */
    clearTexture(type: 'albedo' | 'normal' | 'roughness' | 'metalness' | 'emissive'): void {
        switch (type) {
            case 'albedo':
                this.albedoMap = '';
                break;
            case 'normal':
                this.normalMap = '';
                break;
            case 'roughness':
                this.roughnessMap = '';
                break;
            case 'metalness':
                this.metalnessMap = '';
                break;
            case 'emissive':
                this.emissiveMap = '';
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
                textures: Array.from(this.resourceService.textures.keys())
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                console.log(`Textura seleccionada: ${result}`);
                
                // Verificar si la textura existe en el ResourceService
                if (!this.resourceService.textures.has(result)) {
                    console.warn(`La textura "${result}" no existe en el ResourceService. Puede ser una textura recién creada.`);
                    
                    // Intentar buscar la textura por nombre en lugar de por clave
                    const textureByName = Array.from(this.resourceService.textures.entries())
                        .find(([_, info]) => info.name === result);
                    
                    if (textureByName) {
                        console.log(`Textura encontrada por nombre: ${textureByName[0]}`);
                        result = textureByName[0]; // Usar la clave correcta
                    } else {
                        console.error(`No se pudo encontrar la textura "${result}" en el ResourceService.`);
                        // Mostrar un mensaje al usuario
                        alert(`Error: No se pudo encontrar la textura "${result}". Por favor, intenta seleccionar otra textura.`);
                        return;
                    }
                }
                
                // Actualizar el campo correspondiente según el tipo
                switch (type) {
                    case 'albedo':
                        this.albedoMap = result;
                        break;
                    case 'normal':
                        this.normalMap = result;
                        break;
                    case 'roughness':
                        this.roughnessMap = result;
                        break;
                    case 'metalness':
                        this.metalnessMap = result;
                        break;
                    case 'emissive':
                        this.emissiveMap = result;
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
        if (this.albedoMap) materialProperties.map = this.albedoMap;
        if (this.normalMap) materialProperties.normalMap = this.normalMap;
        if (this.roughnessMap) materialProperties.roughnessMap = this.roughnessMap;
        if (this.metalnessMap) materialProperties.metalnessMap = this.metalnessMap;
        if (this.emissiveMap) materialProperties.emissiveMap = this.emissiveMap;
        
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
            case 'cylinder':
                geometry = new CylinderGeometry(0.8, 0.8, 2, 32);
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

    private initFormValues(): void {
        this.materialName = this.previewMaterial.name || '';
        this.color = '#' + this.previewMaterial.color.getHexString();
        this.roughness = this.previewMaterial.roughness;
        this.metalness = this.previewMaterial.metalness;
        this.transparent = this.previewMaterial.transparent;
        this.opacity = this.previewMaterial.opacity;
        this.side = this.previewMaterial.side;
        this.flatShading = this.previewMaterial.flatShading;
        this.wireframe = this.previewMaterial.wireframe;
        this.alphaTest = this.previewMaterial.alphaTest;
        this.depthTest = this.previewMaterial.depthTest;
        this.depthWrite = this.previewMaterial.depthWrite;
        this.emissiveColor = '#' + this.previewMaterial.emissive.getHexString();
        this.emissiveIntensity = this.previewMaterial.emissiveIntensity;
        this.albedoMap = this.previewMaterial.map?.name || '';
        this.normalMap = this.previewMaterial.normalMap?.name || '';
        this.roughnessMap = this.previewMaterial.roughnessMap?.name || '';
        this.metalnessMap = this.previewMaterial.metalnessMap?.name || '';
        this.emissiveMap = this.previewMaterial.emissiveMap?.name || '';
    }

    private generateUniqueName(): string {
        return 'Material_' + Date.now();
    }
} 