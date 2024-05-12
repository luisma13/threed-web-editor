import "reflect-metadata";

export function EditorPropertie(target: any, propertyKey: string) {
    Reflect.defineMetadata("isEditable", true, target, propertyKey);
}