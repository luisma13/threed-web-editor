import { BoxGeometry, Mesh, MeshStandardMaterial, Color, BufferGeometry } from 'three';
import { Component } from '../../core/component';
import { Editable } from '../../decorators/editable.decorator';
import { MaterialManager } from '../../managers/material-manager';
import 'reflect-metadata';
import { BaseGeometryComponent } from './base-geometry.component';

export class BoxComponent extends BaseGeometryComponent {

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


    constructor() {
        super('BoxComponent');
        this.materialManager = MaterialManager.getInstance();
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

    protected override createGeometry(): BufferGeometry {
        return new BoxGeometry(this.width, this.height, this.depth);
    }


    updateGeometry(): void {
        if (this.mesh) {
            this.geometry.dispose();
            this.geometry = new BoxGeometry(this.width, this.height, this.depth);
            this.mesh.geometry = this.geometry;
        }
    }

    /**
     * Reset the component to its default values
     */
    public reset(): void {        
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