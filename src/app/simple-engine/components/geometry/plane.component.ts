import { PlaneGeometry, BufferGeometry, Color, DoubleSide, MeshStandardMaterial } from 'three';
import { Editable } from '../../decorators/editable.decorator';
import { BaseGeometryComponent } from './base-geometry.component';
import 'reflect-metadata';

export class PlaneComponent extends BaseGeometryComponent {
    @Editable({
        type: 'number',
        description: 'Width of the plane',
        min: 0.1,
        max: 100,
        step: 0.1
    })
    public width: number = 1;

    @Editable({
        type: 'number',
        description: 'Height of the plane',
        min: 0.1,
        max: 100,
        step: 0.1
    })
    public height: number = 1;

    @Editable({
        type: 'number',
        description: 'Number of width segments',
        min: 1,
        max: 64,
        step: 1
    })
    public widthSegments: number = 1;

    @Editable({
        type: 'number',
        description: 'Number of height segments',
        min: 1,
        max: 64,
        step: 1
    })
    public heightSegments: number = 1;

    @Editable({
        type: 'color',
        description: 'Color of the plane'
    })
    public override color: string = '#ffffff';

    constructor() {
        super('PlaneComponent');
    }

    protected override createGeometry(): BufferGeometry {
        return new PlaneGeometry(this.width, this.height, this.widthSegments, this.heightSegments);
    }

    protected override updateGeometry(): void {
        if (this.mesh) {
            this.geometry.dispose();
            this.geometry = new PlaneGeometry(this.width, this.height, this.widthSegments, this.heightSegments);
            this.mesh.geometry = this.geometry;
        }
    }

    /**
     * Override the updateMaterial method to set the DoubleSide property
     */
    protected override updateMaterial(): void {
        // Call the base implementation first
        super.updateMaterial();
        
        // Make the plane visible from both sides
        if (this._material) {
            this._material.side = DoubleSide;
        }
    }

    protected override handlePropertyChange(key: string, value: any, oldMaterialId: string | null): void {
        // First, let the base class handle common properties
        super.handlePropertyChange(key, value, oldMaterialId);
        
        // Then handle plane-specific properties
        if (['width', 'height', 'widthSegments', 'heightSegments'].includes(key)) {
            this.updateGeometry();
        }
    }

    public override reset(): void {
        console.log('PlaneComponent.reset');
        
        // Release the current material if it has an ID
        if (this._materialId) {
            this.materialManager.releaseMaterial(this._materialId);
        }
        
        // Restore default values
        this.width = 1;
        this.height = 1;
        this.widthSegments = 1;
        this.heightSegments = 1;
        this.color = '#ffffff';
        this._materialId = '';
        
        // Update the geometry and material
        this.updateGeometry();
        this.updateMaterial();
    }
} 