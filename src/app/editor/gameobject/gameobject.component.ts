// game-object.component.ts
import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { GameObject } from '../../vipe-3d-engine/core/gameobject';
import { CommonModule } from '@angular/common';
import { EditorService } from '../editor.service';

@Component({
    standalone: true,
    selector: 'app-game-object',
    imports: [CommonModule],
    templateUrl: './gameobject.component.html',
    styleUrls: ['./gameobject.component.scss']
})
export class GameObjectComponent {

    @Input() gameObject: GameObject;
    @Input() isSelected: boolean;
    showChildren: boolean = false;
    children: GameObject[] = [];

    constructor(
        private editorService: EditorService,
        private changeDetectorRef: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.children = this.gameObject.children.filter(child => child instanceof GameObject) as GameObject[];
    }

    ngAfterViewInit() {
        this.editorService.editableSceneComponent.selectedObject.subscribe(objects => {
            if (objects === this.gameObject) {
                this.isSelected = true;
            } else {
                this.isSelected = false;
            }
            this.changeDetectorRef.detectChanges();

            this.gameObject.components.forEach(component => {
                if (component['setHelperVisibility']) {
                    component['setHelperVisibility'](this.isSelected);
                }
            });
        });
    }
    onClick() {
        if (this.isSelected) {
            this.editorService.editableSceneComponent.selectedObject.next(null);
        } else {
            this.editorService.editableSceneComponent.selectedObject.next(this.gameObject);
        }
    }

    toggleChildren() {
        this.showChildren = !this.showChildren;
    }
}
