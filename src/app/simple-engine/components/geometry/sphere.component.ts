import { SphereGeometry, BufferGeometry, Color } from 'three';
import { Editable } from '../../decorators/editable.decorator';
import { BaseGeometryComponent } from './base-geometry.component';
import 'reflect-metadata';

export class SphereComponent extends BaseGeometryComponent {
    @Editable({
        type: 'number',
        description: 'Radius of the sphere',
        min: 0.1,
        max: 100,
        step: 0.1
    })
    public radius: number = 0.5;

    @Editable({
        type: 'number',
        description: 'Number of width segments',
        min: 3,
        max: 64,
        step: 1
    })
    public widthSegments: number = 32;

    @Editable({
        type: 'number',
        description: 'Number of height segments',
        min: 2,
        max: 64,
        step: 1
    })
    public heightSegments: number = 16;

    constructor() {
        super('SphereComponent');
    }

    protected override createGeometry(): BufferGeometry {
        return new SphereGeometry(this.radius, this.widthSegments, this.heightSegments);
    }

    protected override updateGeometry(): void {
        if (this.mesh) {
            this.geometry.dispose();
            this.geometry = new SphereGeometry(this.radius, this.widthSegments, this.heightSegments);
            this.mesh.geometry = this.geometry;
        }
    }

    protected override handlePropertyChange(key: string, value: any, oldMaterialId: string | null): void {
        // First, let the base class handle common properties
        super.handlePropertyChange(key, value, oldMaterialId);
        
        // Then handle sphere-specific properties
        if (['radius', 'widthSegments', 'heightSegments'].includes(key)) {
            this.updateGeometry();
        }
    }

    public override reset(): void {
        console.log('SphereComponent.reset');
        
        // Release the current material if it has an ID
        if (this._materialId) {
            this.materialManager.releaseMaterial(this._materialId);
        }
        
        // Restore default values
        this.radius = 0.5;
        this.widthSegments = 32;
        this.heightSegments = 16;
        this.color = '#ffffff';
        this._materialId = '';
        
        // Update the geometry and material
        this.updateGeometry();
        this.updateMaterial();
    }
} 