import "reflect-metadata";
import { AttributeType } from "./component";

export function EditorPropertie(metadata: AttributeType) {
    return function (target: any, propertyKey: string) {
        Reflect.defineMetadata("isEditable", metadata, target, propertyKey);
    };
}