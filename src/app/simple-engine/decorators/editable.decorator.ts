import 'reflect-metadata';

export interface EditableOptions {
    type: 'number' | 'string' | 'boolean' | 'color' | 'material';
    description?: string;
    min?: number;
    max?: number;
    step?: number;
    name?: string;
}

export function Editable(options: EditableOptions) {
    return function (target: any, propertyKey: string) {
        // Store metadata about the property being editable
        const metadata = {
            type: options.type,
            name: options.name || propertyKey,
            description: options.description,
            min: options.min,
            max: options.max,
            step: options.step,
            value: target[propertyKey]
        };
        
        Reflect.defineMetadata("isEditable", metadata, target, propertyKey);

        // Make sure the property is enumerable
        if (target.constructor) {
            const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey) || {};
            if (descriptor.enumerable === false) {
                descriptor.enumerable = true;
                Object.defineProperty(target, propertyKey, descriptor);
            }
        }
    };
} 