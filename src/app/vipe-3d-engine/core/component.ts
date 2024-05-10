import { GameObject } from "./gameobject";

export abstract class Component {
    public gameObject: GameObject;
    constructor(gameObject?: GameObject) {
        this.gameObject = gameObject;
    }
    public abstract start(): void;
    public abstract update(deltaTime: number): void;
    public abstract lateUpdate(deltaTime: number): void;
    public abstract onDestroy(): void;
}
