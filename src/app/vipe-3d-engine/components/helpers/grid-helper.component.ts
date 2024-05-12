import * as THREE from "three";
import { Component } from "../../core/component";
import { EditorPropertie } from "../../core/decorators";

export class GridHelperComponent extends Component {

    private gridHelper: THREE.GridHelper;

    @EditorPropertie
    size: number = 50;
    @EditorPropertie
    color1: THREE.ColorRepresentation = 0x535353;
    @EditorPropertie
    color2: THREE.ColorRepresentation = 0x737373;

    constructor(size?: number, divisions?: number, color1?: THREE.ColorRepresentation, color2?: THREE.ColorRepresentation) {
        super("GridHelperComponent");
        this.gridHelper = new THREE.GridHelper(size, divisions, color1, color2);
    }

    public override start(): void {
        this.gameObject.add(this.gridHelper);
    }

    public override update(deltaTime: number): void {
        
    }

    public override lateUpdate(deltaTime: number): void {
        
    }

    public override onDestroy(): void {
        
    }

}

