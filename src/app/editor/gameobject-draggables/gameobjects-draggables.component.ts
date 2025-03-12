import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EditorService } from '../editor.service';
import { engine } from '../../simple-engine/core/engine/engine';
import { GameObject } from '../../simple-engine/core/gameobject';
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
            // Verificar que el gameobject no sea undefined o null
            if (!gameobject) return;
            
            // Verificar si tiene padre
            if (gameobject.parentGameObject) return;
            
            // No mostrar GameObjects internos del editor
            if (this.isEditorInternalGameObject(gameobject)) return;
            
            this.gameObjects.push(gameobject);
            setTimeout(() => this.changeDetectorRef.detectChanges());
        });

        engine.onGameobjectRemoved.subscribe((gameobject) => {
            // Verificar que el gameobject no sea undefined o null
            if (!gameobject) return;
            
            // Verificar si tiene padre
            if (gameobject.parentGameObject) return;
            
            const index = this.gameObjects.indexOf(gameobject);
            if (index !== -1) {
                this.gameObjects.splice(index, 1);
                this.changeDetectorRef.detectChanges();
            }
        });

        engine.onGameobjectHerarchyChanged.subscribe((gameobject) => {
            if (!gameobject) return;

            const index = this.gameObjects.indexOf(gameobject);
            // remove from root if already added and has no parent
            if (index !== -1 && gameobject.parentGameObject) {
                this.gameObjects.splice(index, 1);
            } 
            
            // add to root if not already added and has no parent
            if (!gameobject.parentGameObject && !this.isEditorInternalGameObject(gameobject)) {
                this.gameObjects.push(gameobject);
            }
            this.changeDetectorRef.detectChanges();
        });
        
        // Inicializar con los GameObjects existentes (excepto los internos del editor)
        this.initializeGameObjects();
    }
    
    /**
     * Inicializa la lista de GameObjects con los objetos existentes,
     * excluyendo los internos del editor
     */
    private initializeGameObjects() {
        // Filtrar los GameObjects que son válidos (no undefined o null)
        // y que no tienen padre y no son internos del editor
        this.gameObjects = engine.gameObjects.filter(obj => 
            obj && !obj.parentGameObject && !this.isEditorInternalGameObject(obj)
        );
        this.changeDetectorRef.detectChanges();
    }
    
    /**
     * Verifica si un GameObject es interno del editor
     * @param gameObject GameObject a verificar
     * @returns true si es un GameObject interno del editor
     */
    private isEditorInternalGameObject(gameObject: GameObject): boolean {
        // Verificar que el gameObject no sea undefined o null
        if (!gameObject) return false;
        
        // Verificar que userData exista antes de acceder a sus propiedades
        return gameObject.userData && 
               (gameObject.userData['isEditorCore'] === true || 
                gameObject.userData['hideInHierarchy'] === true);
    }

    onSortedRootGameobject(event: { position: "below" | "above", onDroppedGameobject: GameObject, movedGameObject: GameObject }) {
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