import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component as Component3D, AttributeType } from '../../vipe-3d-engine/core/component';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

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

}
