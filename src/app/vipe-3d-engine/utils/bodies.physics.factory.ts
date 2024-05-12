import * as CANNON from "cannon-es";
import { Body, Quaternion, Vec3 } from "cannon-es";
import * as THREE from "three";
import { ShapeType, threeToCannon } from "three-to-cannon";
import { CollisionGroups } from "../core/engine/engine";

// Hacerlo componente, para que se adapte a cualquier objeto

export function getCannonBodyFromObject(object, shapeType?: ShapeType, toScale?: THREE.Vector3): Body {
    const { position, scale, quaternion } = object;

    const body = new CANNON.Body({ mass: 0 });

    if (shapeType == ShapeType.BOX) {
        const shape = threeToCannon(object, { type: ShapeType.BOX }).shape;
        body.addShape(shape);
    } else if (shapeType == ShapeType.SPHERE) {
        const shape = threeToCannon(object, { type: ShapeType.SPHERE }).shape;
        body.addShape(shape);
    } else if (shapeType === ShapeType.MESH) {
        object.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                const shape = getShapeFromMesh(object, toScale || scale);
                body.addShape(shape);
            }
        });
    } else throw new Error("Shape type not supported");

    // body.quaternion.copy(new Quaternion(position.x, quaternion.y, quaternion.z, quaternion.w));
    // body.position = new Vec3(position.x, position.y, position.z);

    return body;
}

export function getCannonShapeFromMesh(mesh, toScale?: THREE.Vector3): CANNON.Trimesh {
    const { position, scale, quaternion } = mesh;
    const shape = getShapeFromMesh(mesh, toScale || scale);

    return shape;
}

export function getCannonBodyFromMesh(mesh, toScale?: THREE.Vector3): Body {
    const { position, scale, quaternion } = mesh;
    const shape = getShapeFromMesh(mesh, toScale || scale);

    const body = new CANNON.Body({
        mass: 0,
        shape,
    });

    body.quaternion.copy(new Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));
    body.position = new Vec3(position.x, position.y, position.z);

    return body;
}

// Usar algoritmos de simplificación de mesh como simplify-geometry
function getShapeFromMesh(mesh, toScale?) {
    const { scale } = mesh;

    toScale = toScale ? toScale : scale;

    const geometry = mesh.geometry;
    const vertices = [...geometry.attributes.position.array];
    for (let i = 0; i < vertices.length; i += 3) {
        vertices[i] *= toScale.x;
        vertices[i + 1] *= toScale.y;
        vertices[i + 2] *= toScale.z;
    }

    const indices = geometry.index.array;
    const shape = new CANNON.Trimesh(vertices, indices);
    shape.collisionFilterGroup = CollisionGroups.Default;
    return shape;
}

export function createBoxBody(position: THREE.Vector3 = new THREE.Vector3(0, 0, 0), widthMts = 10, heightMts = 10, depthMts = 0.3): Body {
    const shape = new CANNON.Box(new CANNON.Vec3(widthMts * 0.5, heightMts * 0.5, depthMts * 0.5));
    shape.collisionFilterGroup = CollisionGroups.Default;
    const body = new CANNON.Body({ mass: 0, shape });
    body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    body.position.copy(new Vec3(position.x, position.y, position.z));
    return body;
}
