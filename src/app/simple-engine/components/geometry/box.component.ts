import { BoxGeometry, Mesh, MeshStandardMaterial, Color } from 'three';
import { Component } from '../../core/component';
import { Editable } from '../../decorators/editable.decorator';
import { MaterialManager } from '../../managers/material-manager';
import 'reflect-metadata';

export class BoxComponent extends Component {
    private mesh: Mesh;
    private geometry: BoxGeometry;
    private materialManager: MaterialManager;

    @Editable({
        type: 'number',
        description: 'Width of the box',
        min: 0.1,
        max: 100,
        step: 0.1
    })
    public width: number = 1;

    @Editable({
        type: 'number',
        description: 'Height of the box',
        min: 0.1,
        max: 100,
        step: 0.1
    })
    public height: number = 1;

    @Editable({
        type: 'number',
        description: 'Depth of the box',
        min: 0.1,
        max: 100,
        step: 0.1
    })
    public depth: number = 1;

    @Editable({
        type: 'color',
        description: 'Color of the box'
    })
    public color: string = '#ffffff';

    @Editable({
        type: 'material',
        description: 'Material ID'
    })
    private _materialId: string = '';

    // Material property (not directly editable)
    private _material: MeshStandardMaterial;

    // Getter and setter for material
    get material(): MeshStandardMaterial {
        return this._material;
    }

    set material(value: MeshStandardMaterial) {
        this._material = value;
        if (this.mesh) {
            this.mesh.material = this._material;
        }
    }

    constructor() {
        super('BoxComponent');
        this.materialManager = MaterialManager.getInstance();
    }

    start(): void {
        this.geometry = new BoxGeometry(this.width, this.height, this.depth);
        
        // Get or create material
        this.updateMaterial();
        
        this.mesh = new Mesh(this.geometry, this._material);
        this.gameObject.add(this.mesh);
    }

    update(deltaTime: number): void {
        // No update needed for static box
    }

    lateUpdate(deltaTime: number): void {
        // No late update needed for static box
    }

    onDestroy(): void {
        if (this.mesh) {
            this.geometry.dispose();
            
            // Release the material if it has an ID
            if (this._materialId) {
                this.materialManager.releaseMaterial(this._materialId);
            }
            
            this.gameObject.remove(this.mesh);
        }
    }

    public override set(key: string, value: any): void {
        const oldMaterialId = key === '_materialId' ? this._materialId : null;
        
        // Save the value in the class property
        this[key] = value;

        // Update based on the property
        if (['width', 'height', 'depth'].includes(key)) {
            this.updateGeometry();
        } else if (key === 'color' && !this._materialId) {
            // Only update color if we're not using a shared material
            if (this._material) {
                this._material.color = new Color(value);
            }
        } else if (key === '_materialId') {
            // Release the old material if it had an ID
            if (oldMaterialId) {
                this.materialManager.releaseMaterial(oldMaterialId);
            }
            
            // Update the material
            this.updateMaterial();
        }
    }

    private updateGeometry(): void {
        if (this.mesh) {
            this.geometry.dispose();
            this.geometry = new BoxGeometry(this.width, this.height, this.depth);
            this.mesh.geometry = this.geometry;
        }
    }

    private updateMaterial(): void {
        // Get material from MaterialManager
        if (this._materialId) {
            this._material = this.materialManager.getMaterial(this._materialId, this.color) as MeshStandardMaterial;
        } else {
            // Create a default material
            this._material = new MeshStandardMaterial({ color: new Color(this.color) });
        }
        
        // Update the mesh material
        if (this.mesh) {
            this.mesh.material = this._material;
        }
    }

    /**
     * Reset the component to its default values
     */
    public reset(): void {
        console.log('BoxComponent.reset');
        
        // Release the current material if it has an ID
        if (this._materialId) {
            this.materialManager.releaseMaterial(this._materialId);
        }
        
        // Restore default values
        this.width = 1;
        this.height = 1;
        this.depth = 1;
        this.color = '#ffffff';
        this._materialId = '';
        
        // Update the geometry and material
        this.updateGeometry();
        this.updateMaterial();
    }
} 