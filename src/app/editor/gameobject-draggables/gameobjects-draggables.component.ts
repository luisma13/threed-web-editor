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
        // Suscribirse a cambios en la selección
        this.editorService.editableSceneComponent?.selectedObject.subscribe(object => {
            // Actualizar la selección en todos los elementos
            GameObjectsDraggableComponent.gameObjectsHtmlElements.forEach(element => {
                element.isSelected = object === element.gameObject;
                if (element.isSelected) {
                    console.log('GameObject seleccionado:', element.gameObject.name);
                }
            });
        });
        
        // Suscribirse a la creación de GameObjects
        engine.onGameobjectCreated.subscribe((gameobject) => {
            // Verificar que el gameobject no sea undefined o null
            if (!gameobject) return;
            
            // Verificar si tiene padre
            if (gameobject.parentGameObject) return;
            
            // No mostrar GameObjects internos del editor
            if (this.isEditorInternalGameObject(gameobject)) return;
            
            // Verificar que no esté ya en la lista
            if (!this.gameObjects.includes(gameobject)) {
                this.gameObjects.push(gameobject);
                // Forzar actualización de la UI
                setTimeout(() => {
                    this.changeDetectorRef.detectChanges();
                    // Verificar si este es el objeto seleccionado
                    if (this.editorService.editableSceneComponent.selectedObject.value === gameobject) {
                        this.editorService.editableSceneComponent.selectedObject.next(gameobject);
                    }
                });
            }
        });

        engine.onGameobjectRemoved.subscribe((gameobject) => {
            // Verificar que el gameobject no sea undefined o null
            if (!gameobject) return;
            
            // Buscar el objeto en la lista de objetos raíz
            const index = this.gameObjects.indexOf(gameobject);
            if (index !== -1) {
                this.gameObjects.splice(index, 1);
                this.changeDetectorRef.detectChanges();
            }
            
            // También verificar si es hijo de algún objeto en la jerarquía
            // y forzar la actualización del padre
            if (gameobject.parentGameObject) {
                // Forzar actualización de la jerarquía del padre
                engine.onGameobjectHerarchyChanged.next(gameobject.parentGameObject);
            }
        });

        engine.onGameobjectHerarchyChanged.subscribe((gameobject) => {
            if (!gameobject) return;

            // Verificar si el gameObject ya está en la lista
            const index = this.gameObjects.indexOf(gameobject);
            
            // Si tiene padre y está en la lista raíz, eliminarlo
            if (gameobject.parentGameObject && index !== -1) {
                this.gameObjects.splice(index, 1);
            } 
            // Si no tiene padre y no está en la lista raíz (y no es interno), añadirlo
            else if (!gameobject.parentGameObject && index === -1 && !this.isEditorInternalGameObject(gameobject)) {
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