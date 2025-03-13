import { GameObject } from "./gameobject";

export interface IHasHelper {
    setHelperVisibility(isVisible): void;
}

export interface AttributeType {
    name?: string;
    type?: "string" | "number" | "boolean" | "array" | "color" | "material";
    value?: String | Number | Boolean | Array<AttributeType> | string;
    min?: number;
    max?: number;
    step?: number;
}

export abstract class Component {
    public gameObject: GameObject;
    name: string;
    disabled: boolean = false;
    constructor(name: string, gameObject?: GameObject) {
        this.name = name;
        this.gameObject = gameObject;
    }
    public abstract start(): void;
    public abstract update(deltaTime: number): void;
    public abstract lateUpdate(deltaTime: number): void;
    public abstract onDestroy(): void;
    public set(key, value) { 
        this[key] = value;
    }

}
