import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EditorService } from '../editor.service';
import { engine } from '../../vipe-3d-engine/core/engine/engine';
import { GameObject } from '../../vipe-3d-engine/core/gameobject';
import { GameObjectComponent } from '../gameobject/gameobject.component';

@Component({
    standalone: true,
    selector: 'app-game-objects-draggable',
    imports: [CommonModule, MatIconModule, GameObjectComponent],
    templateUrl: './gameobjects-draggables.component.html',
    styleUrls: ['./gameobjects-draggables.component.scss']
})
export class GameObjectsDraggableComponent {

    gameObjects: GameObject[] = [];

    // Shared between all GameObjectComponent instances
    static gameObjectsHtmlElements: GameObjectComponent[] = [];
    static dragGameObject: GameObject;
    static dragGameobjectExpandOverGameobject: any;

    constructor(
        private editorService: EditorService,
        private changeDetectorRef: ChangeDetectorRef
    ) {

    }

    ngOnInit() {
        this.editorService.editableSceneComponent?.selectedObject.subscribe(object => {
            GameObjectsDraggableComponent.gameObjectsHtmlElements.forEach(element => {
                element.isSelected = object === element.gameObject;
            });
        });
        engine.onGameobjectCreated.subscribe((gameobject) => {
            if (gameobject?.parentGameObject ?? false) return;
            this.gameObjects.push(gameobject);
            setTimeout(() => this.changeDetectorRef.detectChanges());
        });
        engine.onGameobjectRemoved.subscribe((gameobject) => {
            if (gameobject?.parentGameObject ?? false) return;
            this.gameObjects.splice(this.gameObjects.indexOf(gameobject), 1);
        });
        engine.onGameobjectHerarchyChanged.subscribe((gameobject) => {
            if (!gameobject) return;

            const index = this.gameObjects.indexOf(gameobject);
            // remove from root
            if (index !== -1 && gameobject?.parentGameObject) {
                this.gameObjects.splice(index, 1);
            } 
            
            // add to root
            if (!gameobject?.parentGameObject) {
                this.gameObjects.push(gameobject);
            }
            this.changeDetectorRef.detectChanges();
        });
    }

    onSortedRootGameobject(event) {
        const { position, onDroppedGameobject, movedGameObject } = event;
        const index = this.gameObjects.indexOf(onDroppedGameobject);
        // delete dragged object
        const movedIndex = this.gameObjects.indexOf(movedGameObject);
        this.gameObjects.splice(movedIndex, 1);
        if (position === 'above') {
            this.gameObjects.splice(index, 0, movedGameObject);
        } else {
            this.gameObjects.splice(index + 1, 0, movedGameObject);
        }
        this.changeDetectorRef.detectChanges();
    }

}