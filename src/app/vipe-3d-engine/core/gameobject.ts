import * as THREE from 'three';
import { Component } from './component';
import * as CANNON from "cannon-es";

export class GameObject extends THREE.Object3D {

    public isAddedToScene: boolean = false;
    public components: Component[];
    public rigidbody: CANNON.Body;

    constructor(threeObject?: THREE.Object3D, body?: CANNON.Body) {
        super();

        if (threeObject) {
            this.position.copy(threeObject ? threeObject.position : new THREE.Vector3())
            this.add(threeObject);
            threeObject.position.set(0, 0, 0);
        }

        this.rigidbody = body;
        this.components = [];
    }

    public addComponent<T extends Component>(component: T): GameObject {
        component.gameObject = this;
        this.components.push(component);
        if (this.isAddedToScene)
            component.start();
        return this;
    }

    public removeComponent<T extends Component>(component: T): GameObject {
        const index = this.components.indexOf(component);
        if (index > -1) {
            this.components.splice(index, 1);
            component.onDestroy();
        }
        return this;
    }

    public getComponent<T extends Component>(type: new () => T): T | undefined {
        return this.components.find(component => component instanceof type) as T | undefined;
    }

    public getComponents(): Component[] {
        return this.components;
    }

    public update(deltaTime: number): void {
        for (const component of this.components) {
            component.update(deltaTime);
        }
    }

    public lateUpdate(deltaTime: number): void {
        for (const component of this.components) {
            component.lateUpdate(deltaTime);
        }
    }

}