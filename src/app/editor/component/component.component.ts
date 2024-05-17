import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component as Component3D, AttributeType } from '../../vipe-3d-engine/core/component';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';

@Component({
    selector: 'app-component',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './component.component.html',
    styleUrl: './component.component.scss'
})
export class ComponentComponent {

    @Input() component: Component3D;

    attributes: AttributeType[] = [];

    constructor() {
    }

    ngOnInit() {
        for (const key in this.component) {
            const metadata: AttributeType = Reflect.getMetadata("isEditable", this.component, key);
            if (metadata) {
                this.attributes.push({ ...metadata, name: key });
            }
        }
    }

    onPropertyChange(event, attribute: AttributeType) {
        let value = event;
        if (attribute.type === "color")
            value = "#" + new THREE.Color(event).getHexString();
        this.component.set(attribute.name, value);
    }

}
