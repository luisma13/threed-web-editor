import * as THREE from 'three';
import { Component } from './component';
import * as CANNON from "cannon-es";
import { engine } from './engine/engine';
import e from 'express';

export class GameObject extends THREE.Object3D {

    public parentGameObject: GameObject;
    public isAddedToScene: boolean = false;
    public components: Component[];
    public rigidbody: CANNON.Body;
    public childrenGameObjects: GameObject[] = [];

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

    public addGameObject(gameObject: GameObject): GameObject {
        gameObject.parentGameObject = this;
        this.childrenGameObjects.push(gameObject);
        this.add(gameObject);
        if(this.isAddedToScene) {
            engine.addGameObjects(gameObject);
        }
        return this;
    }

    public removeGameObject(gameObject: GameObject): GameObject {
        const index = this.childrenGameObjects.indexOf(gameObject);
        if (index > -1) {
            this.childrenGameObjects.splice(index, 1);
        }
        gameObject.components.forEach(component => component.onDestroy());
        engine.removeGameObjects(gameObject);
        return this;
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