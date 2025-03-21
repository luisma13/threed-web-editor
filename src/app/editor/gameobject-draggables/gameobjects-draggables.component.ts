import { ChangeDetectorRef, Component, Injectable, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EditorService } from '../editor.service';
import { engine } from '../../simple-engine/core/engine/engine';
import { GameObject } from '../../simple-engine/core/gameobject';
import { GameObjectComponent } from '../gameobject/gameobject.component';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface GameObjectState {
    isSelected: boolean;
    showChildren: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class GameObjectsDraggableService implements OnDestroy {
    private gameObjectsMap = new Map<string, GameObjectComponent>();
    private destroy$ = new Subject<void>();
    
    // Observable states
    private selectedGameObject$ = new BehaviorSubject<GameObject>(null);
    private hierarchyChanged$ = new BehaviorSubject<GameObject>(null);
    private nameChanged$ = new BehaviorSubject<GameObject>(null);

    dragGameObject: GameObject | null = null;
    dragGameobjectExpandOverGameobject: any = null;

    constructor(private editorService: EditorService) {
        this.setupSubscriptions();
    }

    private setupSubscriptions() {
        // Suscribirse a cambios en la selección una sola vez
        this.editorService.editableSceneComponent?.selectedObject
            .pipe(takeUntil(this.destroy$))
            .subscribe(object => {
                this.selectedGameObject$.next(object);
                this.updateSelectedState(object);
            });

        // Suscribirse a cambios en la jerarquía una sola vez
        engine.onGameobjectHerarchyChanged
            .pipe(takeUntil(this.destroy$))
            .subscribe(gameObject => {
                if (gameObject) {
                    this.hierarchyChanged$.next(gameObject);
                    this.updateGameObjectState(gameObject);
                    
                    // Actualizar los hijos del gameObject que cambió
                    const component = this.gameObjectsMap.get(gameObject.uuid);
                    if (component) {
                        component.changeDetectorRef.markForCheck();
                    }
                }
            });
    }

    registerGameObject(component: GameObjectComponent) {
        if (!component.gameObject) return;
        
        const uuid = component.gameObject.uuid;
        this.gameObjectsMap.set(uuid, component);

        // Suscribirse a cambios en el nombre del GameObject
        if (component.gameObject.onNameChanged) {
            component.gameObject.onNameChanged
                .pipe(takeUntil(this.destroy$))
                .subscribe(() => {
                    this.nameChanged$.next(component.gameObject);
                    this.updateGameObjectState(component.gameObject);
                });
        }

        // Suscribirse a cambios en la jerarquía del GameObject específico
        engine.onGameobjectHerarchyChanged
            .pipe(takeUntil(this.destroy$))
            .subscribe((changedGameObject) => {
                if (changedGameObject === component.gameObject) {
                    component.changeDetectorRef.markForCheck();
                }
            });

        // Suscribirse a eliminaciones de GameObjects
        engine.onGameobjectRemoved
            .pipe(takeUntil(this.destroy$))
            .subscribe((removedGameObject) => {
                if (component.gameObject.childrenGameObjects && 
                    component.gameObject.childrenGameObjects.indexOf(removedGameObject) !== -1) {
                    component.changeDetectorRef.markForCheck();
                }
            });
    }

    unregisterGameObject(component: GameObjectComponent) {
        if (!component.gameObject) return;
        this.gameObjectsMap.delete(component.gameObject.uuid);
    }

    private updateSelectedState(selectedObject: GameObject) {
        for (const component of this.gameObjectsMap.values()) {
            component.isSelected = selectedObject === component.gameObject;
            component.changeDetectorRef.markForCheck();
        }
    }

    private updateGameObjectState(gameObject: GameObject) {
        const component = this.gameObjectsMap.get(gameObject.uuid);
        if (component) {
            component.changeDetectorRef.markForCheck();
        }
    }

    getGameObjectComponent(uuid: string): GameObjectComponent | undefined {
        return this.gameObjectsMap.get(uuid);
    }

    getAllComponents(): GameObjectComponent[] {
        return Array.from(this.gameObjectsMap.values());
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
}

@Component({
    standalone: true,
    selector: 'app-game-objects-draggable',
    imports: [CommonModule, MatIconModule, GameObjectComponent],
    templateUrl: './gameobjects-draggables.component.html',
    styleUrls: ['./gameobjects-draggables.component.scss']
})
export class GameObjectsDraggableComponent implements OnDestroy {
    gameObjects: GameObject[] = [];
    private destroy$ = new Subject<void>();

    constructor(
        private editorService: EditorService,
        private changeDetectorRef: ChangeDetectorRef,
        private draggableService: GameObjectsDraggableService
    ) {
        this.setupSubscriptions();
    }

    private setupSubscriptions() {
        // Suscribirse a la creación de GameObjects
        engine.onGameobjectCreated
            .pipe(takeUntil(this.destroy$))
            .subscribe(this.handleGameObjectCreated.bind(this));

        engine.onGameobjectRemoved
            .pipe(takeUntil(this.destroy$))
            .subscribe(this.handleGameObjectRemoved.bind(this));

        engine.onGameobjectHerarchyChanged
            .pipe(takeUntil(this.destroy$))
            .subscribe(this.handleHierarchyChanged.bind(this));

        // Inicializar con los GameObjects existentes
        this.initializeGameObjects();
    }

    private handleGameObjectCreated(gameobject: GameObject) {
        if (!gameobject || gameobject.parentGameObject || this.isEditorInternalGameObject(gameobject)) {
            return;
        }

        if (!this.gameObjects.includes(gameobject)) {
            this.gameObjects.push(gameobject);
            this.changeDetectorRef.markForCheck();

            if (this.editorService.editableSceneComponent?.selectedObject.value === gameobject) {
                this.editorService.editableSceneComponent.selectedObject.next(gameobject);
            }
        }
    }

    private handleGameObjectRemoved(gameobject: GameObject) {
        if (!gameobject) return;

        const index = this.gameObjects.indexOf(gameobject);
        if (index !== -1) {
            this.gameObjects.splice(index, 1);
            this.changeDetectorRef.markForCheck();
        }

        if (gameobject.parentGameObject) {
            engine.onGameobjectHerarchyChanged.next(gameobject.parentGameObject);
        }
    }

    private handleHierarchyChanged(gameobject: GameObject) {
        if (!gameobject) return;

        const index = this.gameObjects.indexOf(gameobject);
        
        if (gameobject.parentGameObject && index !== -1) {
            this.gameObjects.splice(index, 1);
        } else if (!gameobject.parentGameObject && index === -1 && !this.isEditorInternalGameObject(gameobject)) {
            this.gameObjects.push(gameobject);
        }
        
        this.changeDetectorRef.markForCheck();
    }

    private initializeGameObjects() {
        this.gameObjects = engine.gameObjects.filter(obj => 
            obj && !obj.parentGameObject && !this.isEditorInternalGameObject(obj)
        );
        this.changeDetectorRef.markForCheck();
    }

    private isEditorInternalGameObject(gameObject: GameObject): boolean {
        if (!gameObject) return false;
        
        return gameObject.userData && 
               (gameObject.userData['isEditorCore'] === true || 
                gameObject.userData['hideInHierarchy'] === true);
    }

    onSortedRootGameobject(event: { position: "below" | "above", onDroppedGameobject: GameObject, movedGameObject: GameObject }) {
        const { position, onDroppedGameobject, movedGameObject } = event;
        const index = this.gameObjects.indexOf(onDroppedGameobject);
        const movedIndex = this.gameObjects.indexOf(movedGameObject);
        this.gameObjects.splice(movedIndex, 1);
        if (position === 'above') {
            this.gameObjects.splice(index, 0, movedGameObject);
        } else {
            this.gameObjects.splice(index + 1, 0, movedGameObject);
        }
        this.changeDetectorRef.markForCheck();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
}