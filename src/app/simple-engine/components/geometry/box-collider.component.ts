import { Box3, Vector3, Mesh, BoxGeometry, MeshBasicMaterial, DoubleSide } from 'three';
import { Component } from '../../core/component';
import { GameObject } from '../../core/gameobject';
import { Editable } from '../../decorators/editable.decorator';
import 'reflect-metadata';

export class BoxColliderComponent extends Component {
    private collider: Box3;
    private helperMesh: Mesh;
    private helperGeometry: BoxGeometry;
    private helperMaterial: MeshBasicMaterial;
    private size: Vector3;

    @Editable({
        type: 'boolean',
        description: 'Show collider helper'
    })
    public showHelper: boolean = true;

    @Editable({
        type: 'number',
        description: 'Width of the collider',
        min: 0.1,
        max: 100,
        step: 0.1
    })
    public width: number = 1;

    @Editable({
        type: 'number',
        description: 'Height of the collider',
        min: 0.1,
        max: 100,
        step: 0.1
    })
    public height: number = 1;

    @Editable({
        type: 'number',
        description: 'Depth of the collider',
        min: 0.1,
        max: 100,
        step: 0.1
    })
    public depth: number = 1;

    constructor() {
        super('BoxColliderComponent');
        this.size = new Vector3();
    }

    start(): void {
        this.createHelper();
        this.updateCollider();
    }

    private createHelper(): void {
        // Crear geometría y material para el helper
        this.helperGeometry = new BoxGeometry(this.width, this.height, this.depth);
        this.helperMaterial = new MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
            transparent: true,
            opacity: 0.5,
            side: DoubleSide
        });
        this.helperMesh = new Mesh(this.helperGeometry, this.helperMaterial);
        this.helperMesh.visible = this.showHelper;
        this.gameObject.add(this.helperMesh);
    }

    update(deltaTime: number): void {
        if (this.collider) {
            const halfWidth = this.width / 2;
            const halfHeight = this.height / 2;
            const halfDepth = this.depth / 2;
            
            // Actualizar el collider en coordenadas locales
            this.collider.min.set(-halfWidth, -halfHeight, -halfDepth);
            this.collider.max.set(halfWidth, halfHeight, halfDepth);
        }
    }

    lateUpdate(deltaTime: number): void {
        // No late update needed for static collider
    }

    onDestroy(): void {
        if (this.helperMesh) {
            this.helperGeometry.dispose();
            this.helperMaterial.dispose();
            this.gameObject.remove(this.helperMesh);
        }
    }

    public override set(key: string, value: any): void {
        // Guardar el valor en la propiedad de la clase
        this[key] = value;

        // Actualizar según la propiedad
        if (['width', 'height', 'depth'].includes(key)) {
            this.updateCollider();
            this.updateHelperGeometry();
        } else if (key === 'showHelper') {
            if (this.helperMesh) {
                this.helperMesh.visible = value;
            }
        }
    }

    private updateCollider(): void {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const halfDepth = this.depth / 2;

        this.size.set(this.width, this.height, this.depth);
        this.collider = new Box3(
            new Vector3(-halfWidth, -halfHeight, -halfDepth),
            new Vector3(halfWidth, halfHeight, halfDepth)
        );
    }

    private updateHelperGeometry(): void {
        if (this.helperMesh) {
            this.helperGeometry.dispose();
            this.helperGeometry = new BoxGeometry(this.width, this.height, this.depth);
            this.helperMesh.geometry = this.helperGeometry;
        }
    }

    // Método público para obtener el collider
    getCollider(): Box3 {
        return this.collider;
    }

    // Método público para obtener el tamaño
    getSize(): Vector3 {
        return this.size.clone();
    }

    // Método público para obtener el collider en coordenadas mundiales
    getWorldCollider(): Box3 {
        const worldCollider = new Box3();
        const worldMatrix = this.gameObject.matrixWorld;
        
        // Crear puntos en las esquinas del collider
        const points = [
            new Vector3(this.collider.min.x, this.collider.min.y, this.collider.min.z),
            new Vector3(this.collider.min.x, this.collider.min.y, this.collider.max.z),
            new Vector3(this.collider.min.x, this.collider.max.y, this.collider.min.z),
            new Vector3(this.collider.min.x, this.collider.max.y, this.collider.max.z),
            new Vector3(this.collider.max.x, this.collider.min.y, this.collider.min.z),
            new Vector3(this.collider.max.x, this.collider.min.y, this.collider.max.z),
            new Vector3(this.collider.max.x, this.collider.max.y, this.collider.min.z),
            new Vector3(this.collider.max.x, this.collider.max.y, this.collider.max.z)
        ];

        // Transformar todos los puntos a coordenadas mundiales
        points.forEach(point => {
            point.applyMatrix4(worldMatrix);
            worldCollider.expandByPoint(point);
        });

        return worldCollider;
    }

    /**
     * Resetea el componente a sus valores por defecto
     */
    public reset(): void {
        console.log('BoxColliderComponent.reset');
        
        // Restaurar valores por defecto
        this.width = 1;
        this.height = 1;
        this.depth = 1;
        this.showHelper = true;
        
        // Actualizar el collider y el helper
        this.updateCollider();
        this.updateHelperGeometry();
        if (this.helperMesh) {
            this.helperMesh.visible = this.showHelper;
        }
    }
} 