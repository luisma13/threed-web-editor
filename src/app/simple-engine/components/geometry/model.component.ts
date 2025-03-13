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
    
    // Reproducir animación
    @Editable({
        type: 'boolean',
        description: 'Reproducir animación'
    })
    public isAnimationPlaying: boolean = false;
    
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
                isSkinned: mesh instanceof SkinnedMesh
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
     * Obtiene la información de las mallas para mostrar en el editor
     * @returns Lista de información de mallas en formato JSON
     */
    @Editable({
        type: 'string',
        description: 'Información de mallas'
    })
    public getMeshInfo(): string {
        return JSON.stringify(this.meshInfoList, null, 2);
    }
    
    /**
     * Obtiene la información de los materiales para mostrar en el editor
     * @returns Lista de información de materiales en formato JSON
     */
    @Editable({
        type: 'string',
        description: 'Información de materiales'
    })
    public getMaterialInfo(): string {
        return JSON.stringify(this.materialInfoList, null, 2);
    }
    
    /**
     * Obtiene la información de las animaciones para mostrar en el editor
     * @returns Lista de información de animaciones en formato JSON
     */
    @Editable({
        type: 'string',
        description: 'Información de animaciones'
    })
    public getAnimationInfo(): string {
        return JSON.stringify(this.animationInfoList, null, 2);
    }
    
    /**
     * Actualiza un material en el modelo
     * @param index Índice del material a actualizar
     * @param materialId ID del nuevo material
     */
    @Editable({
        type: 'string',
        description: 'Actualizar material (formato: índice,materialId)'
    })
    public updateMaterial(index: number, materialId: string): void {
        if (index < 0 || index >= this.materials.length) {
            console.error(`Índice de material fuera de rango: ${index}`);
            return;
        }
        
        const materialManager = MaterialManager.getInstance();
        const material = materialManager.getMaterial(materialId);
        
        if (!material) {
            console.error(`Material no encontrado con ID: ${materialId}`);
            return;
        }
        
        // Actualizar el material en la lista
        this.materials[index] = material;
        
        // Actualizar el material en todas las mallas que lo usan
        this.meshes.forEach(mesh => {
            if (Array.isArray(mesh.material)) {
                // Para mallas con múltiples materiales, buscar el índice correcto
                for (let i = 0; i < mesh.material.length; i++) {
                    if (mesh.material[i].uuid === this.materials[index].uuid) {
                        mesh.material[i] = material;
                    }
                }
            } else if (mesh.material && mesh.material.uuid === this.materials[index].uuid) {
                // Para mallas con un solo material
                mesh.material = material;
            }
        });
        
        // Regenerar información de materiales
        this.generateMaterialInfo();
    }
    
    /**
     * Actualiza el color de un material
     * @param index Índice del material a actualizar
     * @param colorHex Color en formato hexadecimal
     */
    @Editable({
        type: 'string',
        description: 'Actualizar color de material (formato: índice,colorHex)'
    })
    public updateMaterialColor(index: number, colorHex: string): void {
        if (index < 0 || index >= this.materials.length) {
            console.error(`Índice de material fuera de rango: ${index}`);
            return;
        }
        
        const material = this.materials[index];
        
        if (material instanceof MeshStandardMaterial) {
            material.color = new Color(colorHex);
            material.needsUpdate = true;
            
            // Regenerar información de materiales
            this.generateMaterialInfo();
        } else {
            console.error(`El material en el índice ${index} no es un MeshStandardMaterial`);
        }
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
} 