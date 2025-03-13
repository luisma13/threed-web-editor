import { CylinderGeometry, BufferGeometry, Color } from 'three';
import { Editable } from '../../decorators/editable.decorator';
import { BaseGeometryComponent } from './base-geometry.component';
import 'reflect-metadata';

export class CylinderComponent extends BaseGeometryComponent {
    @Editable({
        type: 'number',
        description: 'Radius at the top of the cylinder',
        min: 0,
        max: 100,
        step: 0.1
    })
    public radiusTop: number = 0.5;

    @Editable({
        type: 'number',
        description: 'Radius at the bottom of the cylinder',
        min: 0,
        max: 100,
        step: 0.1
    })
    public radiusBottom: number = 0.5;

    @Editable({
        type: 'number',
        description: 'Height of the cylinder',
        min: 0.1,
        max: 100,
        step: 0.1
    })
    public height: number = 1;

    @Editable({
        type: 'number',
        description: 'Number of radial segments',
        min: 3,
        max: 64,
        step: 1
    })
    public radialSegments: number = 32;

    @Editable({
        type: 'number',
        description: 'Number of height segments',
        min: 1,
        max: 64,
        step: 1
    })
    public heightSegments: number = 1;

    @Editable({
        type: 'boolean',
        description: 'Whether to render the cylinder open-ended'
    })
    public openEnded: boolean = false;

    constructor() {
        super('CylinderComponent');
    }

    protected override createGeometry(): BufferGeometry {
        return new CylinderGeometry(
            this.radiusTop,
            this.radiusBottom,
            this.height,
            this.radialSegments,
            this.heightSegments,
            this.openEnded
        );
    }

    protected override updateGeometry(): void {
        if (this.mesh) {
            this.geometry.dispose();
            this.geometry = new CylinderGeometry(
                this.radiusTop,
                this.radiusBottom,
                this.height,
                this.radialSegments,
                this.heightSegments,
                this.openEnded
            );
            this.mesh.geometry = this.geometry;
        }
    }

    protected override handlePropertyChange(key: string, value: any, oldMaterialId: string | null): void {
        // First, let the base class handle common properties
        super.handlePropertyChange(key, value, oldMaterialId);
        
        // Then handle cylinder-specific properties
        if (['radiusTop', 'radiusBottom', 'height', 'radialSegments', 'heightSegments', 'openEnded'].includes(key)) {
            this.updateGeometry();
        }
    }

    public override reset(): void {
        console.log('CylinderComponent.reset');
        
        // Release the current material if it has an ID
        if (this._materialId) {
            this.materialManager.releaseMaterial(this._materialId);
        }
        
        // Restore default values
        this.radiusTop = 0.5;
        this.radiusBottom = 0.5;
        this.height = 1;
        this.radialSegments = 32;
        this.heightSegments = 1;
        this.openEnded = false;
        this.color = '#ffffff';
        this._materialId = '';
        
        // Update the geometry and material
        this.updateGeometry();
        this.updateMaterial();
    }
} 