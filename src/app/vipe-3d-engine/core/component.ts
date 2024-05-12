import { GameObject } from "./gameobject";

export abstract class Component {
    public gameObject: GameObject;
    name: string;
    constructor(name:string, gameObject?: GameObject) {
        this.name = name;
        this.gameObject = gameObject;
    }
    public abstract start(): void;
    public abstract update(deltaTime: number): void;
    public abstract lateUpdate(deltaTime: number): void;
    public abstract onDestroy(): void;
}
