import * as THREE from "three";
import { Component } from "../../core/component";
import { EditorPropertie } from "../../core/decorators";
import { engine } from "../../core/engine/engine";

export class GridHelperComponent extends Component {

    private gridHelper: THREE.GridHelper;

    @EditorPropertie({ type: "number", value: 50 })
    size: number = 50;
    @EditorPropertie({ type: "number", value: 10 })
    divisions: number = 10;
    @EditorPropertie({ type: "color", value: "#535353" })
    color1: THREE.ColorRepresentation = "#535353";
    @EditorPropertie({ type: "color", value: "#535353" })
    color2: THREE.ColorRepresentation = "#737373";

    constructor(size?: number, divisions?: number, color1?: THREE.ColorRepresentation, color2?: THREE.ColorRepresentation) {
        super("GridHelperComponent");
        this.size = size;
        this.divisions = divisions;
        this.color1 = color1;
        this.color2 = color2;
    }

    public override start(): void {
        this.createOrUpdateGridHelper(this.size, this.divisions, this.color1, this.color2);
    }

    public override update(deltaTime: number): void {

    }

    public override lateUpdate(deltaTime: number): void {

    }

    public override onDestroy(): void {

    }

    createOrUpdateGridHelper(size: number, divisions: number, color1: THREE.ColorRepresentation, color2: THREE.ColorRepresentation) {
        this.size = size;
        this.divisions = divisions;
        this.color1 = color1;
        this.color2 = color2;
        engine.removeGameObjects(this.gridHelper);
        this.gridHelper = new THREE.GridHelper(size, divisions, color1, color2);
        if (this.gameObject) {
            this.gridHelper.position.copy(this.gameObject.position);
            this.gridHelper.rotation.copy(this.gameObject.rotation);
            this.gameObject.add(this.gridHelper);
        }
    }

}

