import * as THREE from "three";
import { Component } from "../../core/component";
import { Editable } from "../../decorators/editable.decorator";
import 'reflect-metadata';

export class GridHelperComponent extends Component {
    private gridHelper: THREE.GridHelper;

    @Editable({
        type: 'number',
        name: 'Size',
        description: 'Size of the grid',
        min: 1,
        max: 1000,
        step: 1
    })
    private size: number = 50;

    @Editable({
        type: 'number',
        name: 'Divisions',
        description: 'Number of divisions in the grid',
        min: 1,
        max: 1000,
        step: 1
    })
    private divisions: number = 50;

    @Editable({
        type: 'color',
        name: 'Color 1',
        description: 'Primary grid color'
    })
    private color1: THREE.ColorRepresentation = "#535353";

    @Editable({
        type: 'color',
        name: 'Color 2',
        description: 'Secondary grid color'
    })
    private color2: THREE.ColorRepresentation = "#737373";

    constructor() {
        super("GridHelperComponent");
    }

    start(): void {
        this.createOrUpdateGridHelper(this.size, this.divisions, this.color1, this.color2);
    }

    update(deltaTime: number): void {
        // No update needed for static grid
    }

    lateUpdate(deltaTime: number): void {
        // No late update needed
    }

    onDestroy(): void {
        if (this.gridHelper) {
            this.gameObject.remove(this.gridHelper);
            this.gridHelper.dispose();
        }
    }

    public override set(key: string, value: any): void {
        this[key] = value;

        // Recrear el grid helper con los nuevos valores
        this.createOrUpdateGridHelper(this.size, this.divisions, this.color1, this.color2);
    }

    /**
     * Resetea el componente a sus valores por defecto
     */
    public reset(): void {
        console.log('GridHelperComponent.reset');
        
        // Restaurar valores por defecto
        this.size = 50;
        this.divisions = 50;
        this.color1 = "#535353";
        this.color2 = "#737373";
        
        // Recrear el grid helper con los valores por defecto
        this.createOrUpdateGridHelper(this.size, this.divisions, this.color1, this.color2);
    }

    createOrUpdateGridHelper(size: number, divisions: number, color1: THREE.ColorRepresentation, color2: THREE.ColorRepresentation) {
        if (this.gridHelper) {
            this.gameObject.remove(this.gridHelper);
            this.gridHelper.dispose();
        }

        this.size = size;
        this.divisions = divisions;
        this.color1 = color1;
        this.color2 = color2;

        this.gridHelper = new THREE.GridHelper(size, divisions, color1, color2);
        if (this.gameObject) {
            this.gridHelper.position.copy(this.gameObject.position);
            this.gridHelper.rotation.copy(this.gameObject.rotation);
            this.gameObject.add(this.gridHelper);
        }
    }
}

