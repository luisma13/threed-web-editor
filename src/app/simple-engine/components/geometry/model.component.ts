import { Mesh, Material, BufferGeometry, MeshStandardMaterial, Color, Object3D, AnimationClip, AnimationMixer, SkinnedMesh, Bone, Skeleton } from 'three';
import { Component } from '../../core/component';
import { Editable } from '../../decorators/editable.decorator';
import { MaterialManager } from '../../managers/material-manager';
import { engine } from '../../core/engine/engine';
import 'reflect-metadata';

/**
 * Interfaz para representar información de un material
 */
interface MaterialInfo {
    uuid: string;
    index: number;
    name: string;
    type: string;
    color?: string;
    map?: string;
    normalMap?: string;
}

/**
 * Interfaz para representar información de una malla
 */
interface MeshInfo {
    uuid: string;
    name: string;
    vertexCount: number;
    triangleCount: number;
    materialIndex: number;
    isSkinned: boolean;
    boneCount?: number;
    visible: boolean;
}

/**
 * Interfaz para representar información de una animación
 */
interface AnimationInfo {
    name: string;
    duration: number;
    tracks: number;
}

/**
 * Componente para manejar modelos 3D completos con múltiples mallas, materiales y animaciones
 */
export class ModelComponent extends Component {
    // Referencia al objeto raíz del modelo
    private rootObject: Object3D | null = null;
    
    // Lista de mallas del modelo
    private meshes: Mesh[] = [];
    
    // Lista de materiales del modelo
    private materials: Material[] = [];
    
    // Lista de animaciones del modelo
    private animations: AnimationClip[] = [];
    
    // Mixer para reproducir animaciones
    private mixer: AnimationMixer | null = null;
    
    // Animación actual
    private currentAnimation: string = '';
    
    // Listas de información para mostrar en el editor
    private meshInfoList: MeshInfo[] = [];
    private materialInfoList: MaterialInfo[] = [];
    private animationInfoList: AnimationInfo[] = [];
    
    // Nombre del modelo
    @Editable({
        type: 'string',
        description: 'Nombre del modelo'
    })
    public modelName: string = '';
    
    // Ruta del modelo
    @Editable({
        type: 'string',
        description: 'Ruta del modelo'
    })
    public modelPath: string = '';
    
    // Tipo de modelo
    @Editable({
        type: 'string',
        description: 'Tipo de modelo (gltf, fbx, obj, etc.)'
    })
    public modelType: string = '';
    
    // UUID del modelo en el cache
    @Editable({
        type: 'string',
        description: 'UUID del modelo en cache'
    })
    public modelUuid: string = '';
    
    // Escala global del modelo
    @Editable({
        type: 'number',
        description: 'Escala global del modelo',
        min: 0.01,
        max: 10,
        step: 0.01
    })
    public modelScale: number = 1.0;
    
    // Número de mallas
    @Editable({
        type: 'number',
        description: 'Número de mallas'
    })
    public meshCount: number = 0;
    
    // Número de materiales
    @Editable({
        type: 'number',
        description: 'Número de materiales'
    })
    public materialCount: number = 0;
    
    // Número de animaciones
    @Editable({
        type: 'number',
        description: 'Número de animaciones'
    })
    public animationCount: number = 0;
    
    // Animación actual
    @Editable({
        type: 'string',
        description: 'Animación actual'
    })
    public get currentAnimationName(): string {
        return this.currentAnimation;
    }
    
    public set currentAnimationName(value: string) {
        if (value && value !== this.currentAnimation) {
            this.playAnimation(value);
        }
    }
    
    // Reproducir animación
    @Editable({
        type: 'boolean',
        description: 'Reproducir animación'
    })
    public isAnimationPlaying: boolean = false;
    
    // Velocidad de la animación
    @Editable({
        type: 'number',
        description: 'Velocidad de la animación',
        min: 0.1,
        max: 5,
        step: 0.1
    })
    public animationSpeed: number = 1.0;
    
    // Malla seleccionada para editar
    @Editable({
        type: 'string',
        description: 'Malla seleccionada'
    })
    public selectedMeshIndex: string = '';
    
    constructor() {
        super("ModelComponent");
    }
    
    /**
     * Inicializa el componente con un objeto 3D existente
     * @param object Objeto 3D a utilizar
     * @param animations Animaciones del modelo (opcional)
     */
    public initWithObject(object: Object3D, animations: AnimationClip[] = []): void {
        this.rootObject = object;
        this.animations = animations;
        
        // Extraer mallas y materiales
        this.extractMeshesAndMaterials(object);
        
        // Generar información para el editor
        this.generateMeshInfo();
        this.generateMaterialInfo();
        this.generateAnimationInfo();
        
        // Configurar mixer para animaciones si hay animaciones
        if (animations.length > 0) {
            this.setupAnimations();
        }
        
        // Seleccionar la primera malla por defecto si hay mallas
        if (this.meshInfoList.length > 0) {
            this.selectedMeshIndex = `0: ${this.meshInfoList[0].name}`;
        }
    }
    
    /**
     * Extrae mallas y materiales del objeto 3D
     * @param object Objeto 3D a analizar
     */
    private extractMeshesAndMaterials(object: Object3D): void {
        this.meshes = [];
        this.materials = [];
        
        // Recorrer el objeto para encontrar todas las mallas y materiales
        object.traverse((child) => {
            if (child instanceof Mesh) {
                this.meshes.push(child);
                
                // Extraer materiales
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => {
                        if (!this.materials.includes(material)) {
                            this.materials.push(material);
                        }
                    });
                } else if (child.material) {
                    if (!this.materials.includes(child.material)) {
                        this.materials.push(child.material);
                    }
                }
            }
        });
        
        this.meshCount = this.meshes.length;
        this.materialCount = this.materials.length;
    }
    
    /**
     * Genera información sobre las mallas para mostrar en el editor
     */
    private generateMeshInfo(): void {
        this.meshInfoList = [];
        
        this.meshes.forEach((mesh, index) => {
            const geometry = mesh.geometry;
            
            const info: MeshInfo = {
                uuid: mesh.uuid,
                name: mesh.name || `Mesh_${index}`,
                vertexCount: geometry.attributes && geometry.attributes['position'] ? geometry.attributes['position'].count : 0,
                triangleCount: geometry.index ? geometry.index.count / 3 : 0,
                materialIndex: Array.isArray(mesh.material) ? -1 : this.materials.indexOf(mesh.material),
                isSkinned: mesh instanceof SkinnedMesh,
                visible: mesh.visible
            };
            
            // Si es una malla con esqueleto, añadir información de huesos
            if (mesh instanceof SkinnedMesh && mesh.skeleton) {
                info.boneCount = mesh.skeleton.bones.length;
            }
            
            this.meshInfoList.push(info);
        });
    }
    
    /**
     * Genera información sobre los materiales para mostrar en el editor
     */
    private generateMaterialInfo(): void {
        this.materialInfoList = [];
        
        this.materials.forEach((material, index) => {
            const info: MaterialInfo = {
                uuid: material.uuid,
                index,
                name: material.name || `Material_${index}`,
                type: material.type
            };
            
            // Si es un MeshStandardMaterial, extraer más información
            if (material instanceof MeshStandardMaterial) {
                if (material.color) {
                    info.color = `#${material.color.getHexString()}`;
                }
                
                if (material.map) {
                    info.map = material.map.name || 'texture';
                }
                
                if (material.normalMap) {
                    info.normalMap = material.normalMap.name || 'normal';
                }
            }
            
            this.materialInfoList.push(info);
        });
    }
    
    /**
     * Genera información sobre las animaciones para mostrar en el editor
     */
    private generateAnimationInfo(): void {
        this.animationInfoList = [];
        this.animationCount = this.animations.length;
        
        this.animations.forEach(animation => {
            const info: AnimationInfo = {
                name: animation.name,
                duration: animation.duration,
                tracks: animation.tracks.length
            };
            
            this.animationInfoList.push(info);
        });
    }
    
    /**
     * Configura el mixer para reproducir animaciones
     */
    private setupAnimations(): void {
        if (this.rootObject && this.animations.length > 0) {
            this.mixer = new AnimationMixer(this.rootObject);
        }
    }
    
    /**
     * Configura los datos del modelo
     * @param modelPath Ruta del modelo
     * @param modelType Tipo de modelo
     * @param modelUuid UUID del modelo en cache
     */
    public setModelData(modelPath: string, modelType: string, modelUuid: string): void {
        this.modelPath = modelPath;
        this.modelType = modelType;
        this.modelUuid = modelUuid;
        
        // Extraer nombre del modelo de la ruta
        const pathParts = modelPath.split('/');
        const fileName = pathParts[pathParts.length - 1];
        this.modelName = fileName.split('.')[0];
    }
    
    /**
     * Obtiene la lista de mallas del modelo
     * @returns Lista de mallas
     */
    public getMeshes(): Mesh[] {
        return this.meshes;
    }
    
    /**
     * Obtiene la lista de materiales del modelo
     * @returns Lista de materiales
     */
    public getMaterials(): Material[] {
        return this.materials;
    }
    
    /**
     * Obtiene la lista de animaciones del modelo
     * @returns Lista de animaciones
     */
    public getAnimations(): AnimationClip[] {
        return this.animations;
    }
    
    /**
     * Obtiene el material de la malla seleccionada actualmente
     */
    @Editable({
        type: 'material',
        description: 'Material de la malla seleccionada'
    })
    public get selectedMeshMaterial(): string {
        const meshIndex = this.getSelectedMeshIndex();
        if (meshIndex === -1 || meshIndex >= this.meshes.length) {
            return '';
        }
        
        const mesh = this.meshes[meshIndex];
        if (!mesh.material) {
            return '';
        }
        
        // Si la malla tiene un solo material
        if (!Array.isArray(mesh.material)) {
            return mesh.material.uuid;
        }
        
        // Si la malla tiene múltiples materiales, devolver el primero
        if (mesh.material.length > 0) {
            return mesh.material[0].uuid;
        }
        
        return '';
    }
    
    /**
     * Establece el material de la malla seleccionada
     */
    public set selectedMeshMaterial(materialId: string) {
        const meshIndex = this.getSelectedMeshIndex();
        if (meshIndex === -1 || meshIndex >= this.meshes.length) {
            return;
        }
        
        // Obtener el material del MaterialManager
        const materialManager = MaterialManager.getInstance();
        const material = materialManager.getMaterial(materialId);
        
        if (!material) {
            console.error(`Material no encontrado con ID: ${materialId}`);
            return;
        }
        
        // Actualizar el material de la malla
        const mesh = this.meshes[meshIndex];
        
        if (Array.isArray(mesh.material)) {
            // Si la malla tiene múltiples materiales, actualizar todos
            for (let i = 0; i < mesh.material.length; i++) {
                mesh.material[i] = material;
            }
        } else {
            // Si la malla tiene un solo material
            mesh.material = material;
        }
        
        // Actualizar la información de materiales
        this.generateMaterialInfo();
    }
    
    /**
     * Obtiene la visibilidad de la malla seleccionada
     */
    @Editable({
        type: 'boolean',
        description: 'Visibilidad de la malla seleccionada'
    })
    public get selectedMeshVisible(): boolean {
        const meshIndex = this.getSelectedMeshIndex();
        if (meshIndex === -1 || meshIndex >= this.meshes.length) {
            return true;
        }
        
        return this.meshes[meshIndex].visible;
    }
    
    /**
     * Establece la visibilidad de la malla seleccionada
     */
    public set selectedMeshVisible(visible: boolean) {
        const meshIndex = this.getSelectedMeshIndex();
        if (meshIndex === -1 || meshIndex >= this.meshes.length) {
            return;
        }
        
        this.meshes[meshIndex].visible = visible;
        this.meshInfoList[meshIndex].visible = visible;
    }
    
    /**
     * Obtiene el nombre de la malla seleccionada
     */
    @Editable({
        type: 'string',
        description: 'Nombre de la malla seleccionada'
    })
    public get selectedMeshName(): string {
        const meshIndex = this.getSelectedMeshIndex();
        if (meshIndex === -1 || meshIndex >= this.meshInfoList.length) {
            return '';
        }
        
        return this.meshInfoList[meshIndex].name;
    }
    
    /**
     * Establece el nombre de la malla seleccionada
     */
    public set selectedMeshName(name: string) {
        const meshIndex = this.getSelectedMeshIndex();
        if (meshIndex === -1 || meshIndex >= this.meshes.length || !name) {
            return;
        }
        
        this.meshes[meshIndex].name = name;
        this.meshInfoList[meshIndex].name = name;
        
        // Actualizar el dropdown de selección de malla
        this.selectedMeshIndex = `${meshIndex}: ${name}`;
    }
    
    /**
     * Obtiene información detallada sobre la malla seleccionada
     */
    @Editable({
        type: 'string',
        description: 'Información de la malla seleccionada'
    })
    public get selectedMeshInfo(): string {
        const meshIndex = this.getSelectedMeshIndex();
        if (meshIndex === -1 || meshIndex >= this.meshInfoList.length) {
            return 'No hay malla seleccionada';
        }
        
        const info = this.meshInfoList[meshIndex];
        return `Vértices: ${info.vertexCount}, Triángulos: ${info.triangleCount}, ${info.isSkinned ? `Huesos: ${info.boneCount || 0}` : 'No tiene esqueleto'}`;
    }
    
    /**
     * Obtiene el índice de la malla seleccionada actualmente
     */
    private getSelectedMeshIndex(): number {
        if (!this.selectedMeshIndex) {
            return -1;
        }
        
        // El formato es "índice: nombre"
        const parts = this.selectedMeshIndex.split(':');
        if (parts.length < 1) {
            return -1;
        }
        
        return parseInt(parts[0], 10);
    }
    
    /**
     * Aplica la escala global al modelo
     */
    @Editable({
        type: 'boolean',
        description: 'Aplicar escala global'
    })
    public applyModelScale(): void {
        if (!this.rootObject) {
            return;
        }
        
        this.rootObject.scale.set(this.modelScale, this.modelScale, this.modelScale);
        
        // Actualizar la matriz del objeto
        this.rootObject.updateMatrix();
        this.rootObject.updateMatrixWorld(true);
    }
    
    /**
     * Reproduce una animación
     * @param animationName Nombre de la animación a reproducir
     */
    @Editable({
        type: 'string',
        description: 'Reproducir animación'
    })
    public playAnimation(animationName: string): void {
        if (!this.mixer) {
            console.warn('No hay mixer de animación disponible');
            return;
        }
        
        // Buscar la animación por nombre
        const animation = this.animations.find(anim => anim.name === animationName);
        
        if (!animation) {
            console.error(`Animación no encontrada: ${animationName}`);
            return;
        }
        
        // Detener animaciones actuales
        this.mixer.stopAllAction();
        
        // Reproducir la nueva animación
        const action = this.mixer.clipAction(animation);
        action.setEffectiveTimeScale(this.animationSpeed);
        action.play();
        
        this.currentAnimation = animationName;
        this.isAnimationPlaying = true;
    }
    
    /**
     * Detiene la animación actual
     */
    @Editable({
        type: 'boolean',
        description: 'Detener animación'
    })
    public stopAnimation(): void {
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.isAnimationPlaying = false;
        }
    }
    
    /**
     * Muestra u oculta una malla específica
     * @param meshIndex Índice de la malla
     * @param visible Estado de visibilidad
     */
    @Editable({
        type: 'string',
        description: 'Cambiar visibilidad de malla (formato: índice,visible)'
    })
    public setMeshVisibility(meshIndex: number, visible: boolean): void {
        if (meshIndex < 0 || meshIndex >= this.meshes.length) {
            console.error(`Índice de malla fuera de rango: ${meshIndex}`);
            return;
        }
        
        this.meshes[meshIndex].visible = visible;
        this.meshInfoList[meshIndex].visible = visible;
    }
    
    /**
     * Limpia los recursos al destruir el componente
     */
    public cleanup(): void {
        // Detener animaciones
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer = null;
        }
        
        // No eliminamos los materiales ni geometrías ya que son manejados por el cache
        this.rootObject = null;
        this.meshes = [];
        this.materials = [];
        this.animations = [];
        this.meshInfoList = [];
        this.materialInfoList = [];
        this.animationInfoList = [];
    }
    
    /**
     * Resetea el componente a sus valores por defecto
     */
    public reset(): void {
        this.cleanup();
        this.modelName = '';
        this.modelPath = '';
        this.modelType = '';
        this.modelUuid = '';
        this.meshCount = 0;
        this.materialCount = 0;
        this.animationCount = 0;
        this.currentAnimation = '';
        this.isAnimationPlaying = false;
        this.animationSpeed = 1.0;
        this.modelScale = 1.0;
        this.selectedMeshIndex = '';
    }
    
    /**
     * Método start requerido por Component
     */
    public start(): void {
        // No se requiere inicialización adicional
    }
    
    /**
     * Método update requerido por Component
     */
    public update(deltaTime: number): void {
        // Actualizar el mixer de animaciones si está activo
        if (this.mixer && this.isAnimationPlaying) {
            this.mixer.update(deltaTime);
        }
    }
    
    /**
     * Método lateUpdate requerido por Component
     */
    public lateUpdate(): void {
        // No se requiere actualización tardía
    }
    
    /**
     * Método onDestroy requerido por Component
     */
    public onDestroy(): void {
        this.cleanup();
    }
    
    /**
     * Obtiene la lista de mallas disponibles en el modelo
     */
    @Editable({
        type: 'string',
        description: 'Lista de mallas disponibles'
    })
    public getMeshList(): string {
        if (this.meshInfoList.length === 0) {
            return 'No hay mallas disponibles';
        }
        
        return this.meshInfoList.map((mesh, index) => 
            `${index}: ${mesh.name} (${mesh.visible ? 'Visible' : 'Oculta'})`
        ).join('\n');
    }
    
    /**
     * Selecciona una malla específica por su índice
     */
    @Editable({
        type: 'number',
        description: 'Seleccionar malla por índice',
        min: 0
    })
    public selectMeshByIndex(index: number): void {
        if (index < 0 || index >= this.meshInfoList.length) {
            console.error(`Índice de malla fuera de rango: ${index}`);
            return;
        }
        
        this.selectedMeshIndex = `${index}: ${this.meshInfoList[index].name}`;
    }
    
    /**
     * Obtiene el color del material de la malla seleccionada
     */
    @Editable({
        type: 'color',
        description: 'Color del material'
    })
    public get selectedMeshColor(): string {
        const meshIndex = this.getSelectedMeshIndex();
        if (meshIndex === -1 || meshIndex >= this.meshes.length) {
            return '#ffffff';
        }
        
        const mesh = this.meshes[meshIndex];
        if (!mesh.material) {
            return '#ffffff';
        }
        
        // Si la malla tiene un solo material
        if (!Array.isArray(mesh.material)) {
            if (mesh.material instanceof MeshStandardMaterial && mesh.material.color) {
                return '#' + mesh.material.color.getHexString();
            }
        } else if (mesh.material.length > 0) {
            // Si la malla tiene múltiples materiales, usar el primero
            const material = mesh.material[0];
            if (material instanceof MeshStandardMaterial && material.color) {
                return '#' + material.color.getHexString();
            }
        }
        
        return '#ffffff';
    }
    
    /**
     * Establece el color del material de la malla seleccionada
     */
    public set selectedMeshColor(colorHex: string) {
        const meshIndex = this.getSelectedMeshIndex();
        if (meshIndex === -1 || meshIndex >= this.meshes.length) {
            return;
        }
        
        const mesh = this.meshes[meshIndex];
        if (!mesh.material) {
            return;
        }
        
        // Aplicar el color al material
        if (!Array.isArray(mesh.material)) {
            if (mesh.material instanceof MeshStandardMaterial) {
                mesh.material.color = new Color(colorHex);
                mesh.material.needsUpdate = true;
            }
        } else {
            // Si la malla tiene múltiples materiales, actualizar todos
            for (let i = 0; i < mesh.material.length; i++) {
                const material = mesh.material[i];
                if (material instanceof MeshStandardMaterial) {
                    material.color = new Color(colorHex);
                    material.needsUpdate = true;
                }
            }
        }
        
        // Actualizar la información de materiales
        this.generateMaterialInfo();
    }
    
    /**
     * Obtiene información sobre el material de la malla seleccionada
     */
    @Editable({
        type: 'string',
        description: 'Información del material'
    })
    public get selectedMaterialInfo(): string {
        const meshIndex = this.getSelectedMeshIndex();
        if (meshIndex === -1 || meshIndex >= this.meshes.length) {
            return 'No hay malla seleccionada';
        }
        
        const mesh = this.meshes[meshIndex];
        if (!mesh.material) {
            return 'La malla no tiene material';
        }
        
        // Si la malla tiene un solo material
        if (!Array.isArray(mesh.material)) {
            return this.getMaterialInfoString(mesh.material);
        } else if (mesh.material.length > 0) {
            // Si la malla tiene múltiples materiales, mostrar información del primero
            return `La malla tiene ${mesh.material.length} materiales. Primer material:\n` + 
                   this.getMaterialInfoString(mesh.material[0]);
        }
        
        return 'La malla no tiene material';
    }
    
    /**
     * Obtiene una cadena con información sobre un material
     */
    private getMaterialInfoString(material: Material): string {
        let info = `Tipo: ${material.type}\n`;
        info += `Nombre: ${material.name || 'Sin nombre'}\n`;
        
        if (material instanceof MeshStandardMaterial) {
            info += `Color: #${material.color.getHexString()}\n`;
            info += `Metalness: ${material.metalness}\n`;
            info += `Roughness: ${material.roughness}\n`;
            info += `Mapa difuso: ${material.map ? 'Sí' : 'No'}\n`;
            info += `Mapa normal: ${material.normalMap ? 'Sí' : 'No'}\n`;
        }
        
        return info;
    }
    
    /**
     * Ajusta la metalicidad del material de la malla seleccionada
     */
    @Editable({
        type: 'number',
        description: 'Metalicidad del material',
        min: 0,
        max: 1,
        step: 0.01
    })
    public get selectedMeshMetalness(): number {
        const meshIndex = this.getSelectedMeshIndex();
        if (meshIndex === -1 || meshIndex >= this.meshes.length) {
            return 0;
        }
        
        const mesh = this.meshes[meshIndex];
        if (!mesh.material) {
            return 0;
        }
        
        // Si la malla tiene un solo material
        if (!Array.isArray(mesh.material)) {
            if (mesh.material instanceof MeshStandardMaterial) {
                return mesh.material.metalness;
            }
        } else if (mesh.material.length > 0) {
            // Si la malla tiene múltiples materiales, usar el primero
            const material = mesh.material[0];
            if (material instanceof MeshStandardMaterial) {
                return material.metalness;
            }
        }
        
        return 0;
    }
    
    /**
     * Establece la metalicidad del material de la malla seleccionada
     */
    public set selectedMeshMetalness(value: number) {
        const meshIndex = this.getSelectedMeshIndex();
        if (meshIndex === -1 || meshIndex >= this.meshes.length) {
            return;
        }
        
        const mesh = this.meshes[meshIndex];
        if (!mesh.material) {
            return;
        }
        
        // Aplicar la metalicidad al material
        if (!Array.isArray(mesh.material)) {
            if (mesh.material instanceof MeshStandardMaterial) {
                mesh.material.metalness = value;
                mesh.material.needsUpdate = true;
            }
        } else {
            // Si la malla tiene múltiples materiales, actualizar todos
            for (let i = 0; i < mesh.material.length; i++) {
                const material = mesh.material[i];
                if (material instanceof MeshStandardMaterial) {
                    material.metalness = value;
                    material.needsUpdate = true;
                }
            }
        }
    }
    
    /**
     * Ajusta la rugosidad del material de la malla seleccionada
     */
    @Editable({
        type: 'number',
        description: 'Rugosidad del material',
        min: 0,
        max: 1,
        step: 0.01
    })
    public get selectedMeshRoughness(): number {
        const meshIndex = this.getSelectedMeshIndex();
        if (meshIndex === -1 || meshIndex >= this.meshes.length) {
            return 0;
        }
        
        const mesh = this.meshes[meshIndex];
        if (!mesh.material) {
            return 0;
        }
        
        // Si la malla tiene un solo material
        if (!Array.isArray(mesh.material)) {
            if (mesh.material instanceof MeshStandardMaterial) {
                return mesh.material.roughness;
            }
        } else if (mesh.material.length > 0) {
            // Si la malla tiene múltiples materiales, usar el primero
            const material = mesh.material[0];
            if (material instanceof MeshStandardMaterial) {
                return material.roughness;
            }
        }
        
        return 0;
    }
    
    /**
     * Establece la rugosidad del material de la malla seleccionada
     */
    public set selectedMeshRoughness(value: number) {
        const meshIndex = this.getSelectedMeshIndex();
        if (meshIndex === -1 || meshIndex >= this.meshes.length) {
            return;
        }
        
        const mesh = this.meshes[meshIndex];
        if (!mesh.material) {
            return;
        }
        
        // Aplicar la rugosidad al material
        if (!Array.isArray(mesh.material)) {
            if (mesh.material instanceof MeshStandardMaterial) {
                mesh.material.roughness = value;
                mesh.material.needsUpdate = true;
            }
        } else {
            // Si la malla tiene múltiples materiales, actualizar todos
            for (let i = 0; i < mesh.material.length; i++) {
                const material = mesh.material[i];
                if (material instanceof MeshStandardMaterial) {
                    material.roughness = value;
                    material.needsUpdate = true;
                }
            }
        }
    }
} 