import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, Output, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { EditorService } from '../editor.service';
import { GameObject } from '../../simple-engine/core/gameobject';
import { engine } from '../../simple-engine/core/engine/engine';
import { GameObjectsDraggableService } from '../gameobject-draggables/gameobjects-draggables.component';
import { ContextMenuService } from '../context-menu/context-menu.service';

@Component({
    standalone: true,
    selector: 'app-game-object',
    imports: [CommonModule, MatIconModule, MatButtonModule],
    templateUrl: './gameobject.component.html',
    styleUrls: ['./gameobject.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameObjectComponent implements OnInit, OnDestroy {
    @ViewChild('title', { static: true }) title: ElementRef;
    @Input() gameObject: GameObject;
    @Input() isRoot: boolean;
    @Output() onSortRoot: EventEmitter<{ position: "below" | "above", onDroppedGameobject: GameObject, movedGameObject: GameObject }> = new EventEmitter();
    
    isSelected: boolean;
    showChildren: boolean = false;

    /* Drag and drop */
    dragGameobjectExpandOverWaitTimeMs = 300;
    dragGameobjectExpandOverTime: number;
    dragGameobjectExpandOverArea: number;

    constructor(
        private editorService: EditorService,
        public changeDetectorRef: ChangeDetectorRef,
        private contextMenuService: ContextMenuService,
        private draggableService: GameObjectsDraggableService
    ) {}

    ngOnInit() {
        this.draggableService.registerGameObject(this);
    }

    ngOnDestroy() {
        this.draggableService.unregisterGameObject(this);
    }

    handleDragStart(event, gameObject) {
        event.dataTransfer.setData('foo', 'bar');
        this.draggableService.dragGameObject = gameObject;
    }

    handleDragOver(event, gameobject: GameObject) {
        event.preventDefault();

        const target = event.target as HTMLElement;
        const component = target.closest('.gameobject-row');
        if (!component) return;
        
        const uuid = component.id;
        const onGameobject = engine.gameObjects.find((go) => go.uuid === uuid);

        if (this.draggableService.dragGameobjectExpandOverGameobject && onGameobject === this.draggableService.dragGameobjectExpandOverGameobject) {
            if ((Date.now() - this.dragGameobjectExpandOverTime) > this.dragGameobjectExpandOverWaitTimeMs) {
                const component = this.draggableService.getGameObjectComponent(onGameobject.uuid);
                if (component) {
                    component.showChildren = true;
                    component.changeDetectorRef.markForCheck();
                }
            }
        } else {
            this.draggableService.dragGameobjectExpandOverGameobject = onGameobject;
            this.dragGameobjectExpandOverTime = new Date().getTime();
        }

        // Clean styles for all components except the current one
        const components = this.draggableService.getAllComponents();
        for (const component of components) {
            if (component.gameObject !== onGameobject && component.gameObject !== this.draggableService.dragGameObject) {
                component.cleanDragStyles();
            }
        }

        const percentageY = event.offsetY / event.target.clientHeight;
        if (0 <= percentageY && percentageY <= 0.25) {
            this.dragGameobjectExpandOverArea = 1;
        } else if (1 >= percentageY && percentageY >= 0.75) {
            this.dragGameobjectExpandOverArea = -1;
        } else {
            this.dragGameobjectExpandOverArea = 0;
        }

        this.changeDetectorRef.markForCheck();
    }

    cleanDragStyles() {
        this.title.nativeElement.classList.remove('drop-above');
        this.title.nativeElement.classList.remove('drop-below');
    }

    handleDrop(event, gameObject: GameObject) {
        const target = event.target as HTMLElement;
        const component = target.closest('.gameobject-row');
        if (!component) return;
        
        const uuid = component.id;
        const onGameobject = engine.gameObjects.find((go) => go.uuid === uuid);

        const insertOnParent = (position: "below" | "above") => {
            const parent = onGameobject.parentGameObject;

            if (!parent) {
                this.draggableService.dragGameObject.unparentGameObject();
                this.onSortRoot.emit({ position, onDroppedGameobject: onGameobject, movedGameObject: this.draggableService.dragGameObject });
                return;
            }

            parent.addGameObject(this.draggableService.dragGameObject);
            const indexDrag = parent.childrenGameObjects.indexOf(this.draggableService.dragGameObject);
            const indexOnGameobject = parent.childrenGameObjects.indexOf(onGameobject);
            parent.childrenGameObjects.splice(indexDrag, 1);
            parent.childrenGameObjects.splice(position === "above" ? indexOnGameobject : indexOnGameobject + 1, 0, this.draggableService.dragGameObject);
        }

        if (onGameobject && onGameobject !== this.draggableService.dragGameObject) {
            const actions = {
                "above": () => insertOnParent("above"),
                "below": () => insertOnParent("below"),
                "center": () => onGameobject.addGameObject(this.draggableService.dragGameObject)
            }
            actions[this.dragGameobjectExpandOverArea === 0 ? "center" : this.dragGameobjectExpandOverArea === 1 ? "above" : "below"]();
        }
        this.handleDragEnd(event, gameObject);
    }

    handleDragEnd(event, gameObject) {
        this.draggableService.dragGameObject = null;
        this.draggableService.dragGameobjectExpandOverGameobject = null;
        this.dragGameobjectExpandOverTime = 0;
        this.dragGameobjectExpandOverArea = NaN;
        event.preventDefault();
        this.changeDetectorRef.markForCheck();
    }

    getStyle(gameObject) {
        if (this.draggableService.dragGameObject === gameObject) {
            return 'drag-start';
        } else if (this.draggableService.dragGameobjectExpandOverGameobject === gameObject) {
            switch (this.dragGameobjectExpandOverArea) {
                case 1:
                    return 'drop-above';
                case -1:
                    return 'drop-below';
                default:
                    return 'drop-center'
            }
        }
        return 'drop-none';
    }

    onClick(event: MouseEvent) {
        event.stopPropagation();
        this.editorService.editableSceneComponent?.selectedObject.next(this.gameObject);
    }

    onContextMenu(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.contextMenuService.showContextMenu(event, 'gameObject', this.gameObject);
    }

    toggleChildren() {
        this.showChildren = !this.showChildren;
        this.changeDetectorRef.markForCheck();
    }

    trackByUuid(index: number, item: GameObject) {
        return item.uuid;
    }
}