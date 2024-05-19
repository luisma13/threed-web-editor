import * as THREE from 'three';
import { Component } from './component';
import * as CANNON from "cannon-es";
import { engine } from './engine/engine';

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

    public addGameObject(gameObject: GameObject, sendEvent = true): GameObject {
        if (gameObject.parentGameObject === this) {
            return this;
        }

        // Remove from previous parent
        if (gameObject.parentGameObject) {
            gameObject.unparentGameObject();
        }

        // Add to new parent
        gameObject.parentGameObject = this;
        this.childrenGameObjects.push(gameObject);
        this.add(gameObject);
        if (this.isAddedToScene && !gameObject.isAddedToScene) {
            engine.addGameObjects(gameObject);
        }
        
        if (sendEvent) {
            engine.onGameobjectHerarchyChanged.next(gameObject)
        }
        
        return this;
    }

    public unparentGameObject(): GameObject {
        if (this.parentGameObject) {
            this.parentGameObject.childrenGameObjects.slice(this.parentGameObject.childrenGameObjects.indexOf(this), 1);
            this.parentGameObject.remove(this);
            this.parentGameObject = null;
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
            if (!component.disabled)
                component.update(deltaTime);
        }
    }

    public lateUpdate(deltaTime: number): void {
        for (const component of this.components) {
            if (!component.disabled)
                component.lateUpdate(deltaTime);
        }
    }

}