import { Mesh, MeshStandardMaterial, Color, Material, BufferGeometry } from 'three';
import { Component } from '../../core/component';
import { Editable } from '../../decorators/editable.decorator';
import { MaterialManager } from '../../managers/material-manager';
import 'reflect-metadata';

/**
 * Base class for all geometry components
 * Provides common functionality for handling materials and basic operations
 */
export abstract class BaseGeometryComponent extends Component {
    protected mesh: Mesh;
    protected geometry: BufferGeometry;
    protected materialManager: MaterialManager;

    @Editable({
        type: 'color',
        description: 'Color of the geometry'
    })
    public color: string = '#ffffff';

    @Editable({
        type: 'material',
        description: 'Material ID'
    })
    protected _materialId: string = '';

    // Material property (not directly editable)
    protected _material: MeshStandardMaterial;

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

    constructor(componentName: string) {
        super(componentName);
        this.materialManager = MaterialManager.getInstance();
    }

    /**
     * Create and initialize the geometry
     * This method should be implemented by derived classes
     */
    protected abstract createGeometry(): BufferGeometry;

    /**
     * Update the geometry when properties change
     * This method should be implemented by derived classes
     */
    protected abstract updateGeometry(): void;

    /**
     * Initialize the component
     */
    start(): void {
        this.geometry = this.createGeometry();
        
        // Get or create material
        this.updateMaterial();
        
        this.mesh = new Mesh(this.geometry, this._material);
        this.gameObject.add(this.mesh);
    }

    update(deltaTime: number): void {
        // No update needed for static geometry
    }

    lateUpdate(deltaTime: number): void {
        // No late update needed for static geometry
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

        // Handle property changes
        this.handlePropertyChange(key, value, oldMaterialId);
    }

    /**
     * Handle property changes
     * This method can be overridden by derived classes to handle specific properties
     */
    protected handlePropertyChange(key: string, value: any, oldMaterialId: string | null): void {
        // Update based on the property
        if (key === 'color' && !this._materialId) {
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

    /**
     * Update the material
     */
    protected updateMaterial(): void {
        // Get material from MaterialManager
        if (this._materialId) {
            const material = this.materialManager.getMaterial(this._materialId);
            this._material = material ? material as MeshStandardMaterial : new MeshStandardMaterial({ color: new Color(this.color) });
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
     * This method should be overridden by derived classes
     */
    public abstract reset(): void;
} 