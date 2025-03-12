import * as CANNON from "cannon-es";
import { Body, Quaternion, Shape, Trimesh, Vec3 } from "cannon-es";
import * as THREE from "three";
import { Component } from "../../core/component";

/**
 * Componente interno del editor para manejar objetos editables.
 * Este componente no debe mostrarse en la UI ni exportarse con la escena.
 */
export class EditableObjectComponent extends Component {
    lastPos: THREE.Vector3 = new THREE.Vector3();
    lastRot: THREE.Euler = new THREE.Euler();
    lastScale: THREE.Vector3 = new THREE.Vector3();

    originalShapes: Shape[] = [];
    originalOffsets: Vec3[] = [];
    originalQuaternions: Quaternion[] = [];

    // optimization for collision scale
    isChangingScale = false;

    // Marca este componente como interno del editor
    static readonly isEditorComponent = true;

    constructor() {
        super("EditableObjectComponent");
    }

    public start(): void {
        this.lastPos.copy(this.gameObject.position);
        this.lastRot.copy(this.gameObject.rotation);
        this.lastScale.copy(this.gameObject.scale);

        if (!this.gameObject.rigidbody) return;

        this.gameObject.rigidbody.shapes.forEach((shape) => {
            this.originalShapes.push(shape);
            this.originalOffsets = this.gameObject.rigidbody.shapeOffsets;
            this.originalQuaternions = this.gameObject.rigidbody.shapeOrientations;
        });
    }

    public update(): void {
        if (!this.gameObject.rigidbody) return;

        if (!this.lastPos.equals(this.gameObject.position)) {
            this.gameObject.rigidbody.position.copy(new CANNON.Vec3(this.gameObject.position.x, this.gameObject.position.y, this.gameObject.position.z));
        }

        if (!this.lastRot.equals(this.gameObject.rotation)) {
            this.gameObject.rigidbody.quaternion.setFromEuler(
                this.gameObject.rotation.x,
                this.gameObject.rotation.y,
                this.gameObject.rotation.z,
                this.gameObject.rotation.order,
            );
        }

        this.syncScale();

        this.lastPos.copy(this.gameObject.position);
        this.lastRot.copy(this.gameObject.rotation);
        this.lastScale.copy(this.gameObject.scale);
    }

    public override lateUpdate(): void { }

    syncScale() {
        if (!this.lastScale.equals(this.gameObject.scale)) {
            this.isChangingScale = true;
            const scale = (this.gameObject.scale.x + this.gameObject.scale.y + this.gameObject.scale.z) / 3;
            this.gameObject.scale.x = this.gameObject.scale.y = this.gameObject.scale.z = scale;
        } else if (this.isChangingScale) {
            // Update scale collision when user stop scaling
            this.isChangingScale = false;

            const scale = (this.gameObject.scale.x + this.gameObject.scale.y + this.gameObject.scale.z) / 3;
            this.gameObject.scale.x = this.gameObject.scale.y = this.gameObject.scale.z = scale;

            const newBody = new Body({ mass: 0 });
            newBody.position.copy(this.gameObject.rigidbody.position);
            newBody.quaternion.copy(this.gameObject.rigidbody.quaternion);

            this.originalShapes.forEach((shape, index) => {
                const trimesh = shape as CANNON.Trimesh;
                const vertex = Array.from<number>(trimesh.vertices);
                const indexes = Array.from<number>(trimesh.indices);

                const copyTrimesh = new Trimesh(vertex, indexes);
                for (let i = 0; i < trimesh.vertices.length; i += 3) {
                    copyTrimesh.vertices[i] *= scale;
                    copyTrimesh.vertices[i + 1] *= scale;
                    copyTrimesh.vertices[i + 2] *= scale;
                }

                newBody.addShape(copyTrimesh, this.originalOffsets[index].scale(scale), this.originalQuaternions[index]);
            });

            this.gameObject.rigidbody = newBody;
        }
    }

    public onDestroy(): void { }
}
