import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component as Component3D } from '../../vipe-3d-engine/core/component';

@Component({
    selector: 'app-component',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './component.component.html',
    styleUrl: './component.component.scss'
})
export class ComponentComponent {

    @Input() component: Component3D;

    attributes = [];

    constructor() {
    }

    ngOnInit() {
        for (const key in this.component) {
            if (Reflect.getMetadata("isEditable", this.component, key)) {
                this.attributes.push(key);
            }
        }
    }

}
