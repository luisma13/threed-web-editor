import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EditorService } from '../editor.service';
import { GameObject } from '../../vipe-3d-engine/core/gameobject';
import { engine } from '../../vipe-3d-engine/core/engine/engine';

@Component({
    standalone: true,
    selector: 'app-game-object',
    imports: [CommonModule, MatIconModule],
    templateUrl: './gameobject.component.html',
    styleUrls: ['./gameobject.component.scss']
})
export class GameObjectComponent {

    @ViewChild('title', { static: true }) title: ElementRef;
    @Input() gameObject: GameObject;
    @Input() isRoot: boolean;
    @Output() onSortRoot: EventEmitter<{ position: "below" | "above", onDroppedGameobject: GameObject, movedGameObject }> = new EventEmitter();
    isSelected: boolean;
    showChildren: boolean = false;

    /* Drag and drop */
    dragGameobjectExpandOverWaitTimeMs = 300;
    dragGameobjectExpandOverTime: number;
    dragGameobjectExpandOverArea: number;

    // Shared between all GameObjectComponent instances
    static dragGameObject: GameObject;
    static dragGameobjectExpandOverGameobject: any;

    constructor(
        private editorService: EditorService,
        private changeDetectorRef: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.editorService.gameObjectsHtmlElements.push(this);
    }

    ngOnDestroy() {
    }

    ngAfterViewInit() {
    }

    onClick(event) {
        event.preventDefault();
        event.stopPropagation();
        this.isSelected = !this.isSelected;
        if (this.isSelected) {
            this.editorService.editableSceneComponent.selectedObject.next(this.gameObject);
        } else {
            this.editorService.editableSceneComponent.selectedObject.next(undefined);
        }
        this.changeDetectorRef.detectChanges();
    }

    toggleChildren() {
        this.showChildren = !this.showChildren;
    }

    handleDragStart(event, gameObject) {
        // Required by Firefox (https://stackoverflow.com/questions/19055264/why-doesnt-html5-drag-and-drop-work-in-firefox)
        event.dataTransfer.setData('foo', 'bar');
        GameObjectComponent.dragGameObject = gameObject;
    }

    handleDragOver(event, gameobject: GameObject) {
        event.preventDefault();

        const target = event.target as HTMLElement;
        const component = target.closest('.row');
        const uuid = component.id;
        const onGameobject = engine.gameObjects.find((go) => go.uuid === uuid);

        // Handle node expand
        if (GameObjectComponent.dragGameobjectExpandOverGameobject && onGameobject === GameObjectComponent.dragGameobjectExpandOverGameobject) {
            if ((Date.now() - this.dragGameobjectExpandOverTime) > this.dragGameobjectExpandOverWaitTimeMs) {
                for (const go of this.editorService.gameObjectsHtmlElements) {
                    if (go.gameObject === onGameobject) {
                        go.showChildren = true;
                        break;
                    }
                }
            }
        } else {
            GameObjectComponent.dragGameobjectExpandOverGameobject = onGameobject;
            this.dragGameobjectExpandOverTime = new Date().getTime();
        }

        for (const go of this.editorService.gameObjectsHtmlElements) {
            if (go.gameObject !== onGameobject && go.gameObject !== GameObjectComponent.dragGameObject) {
                go.cleanDragStyles();
            }
        }

        // Handle drag area
        const percentageY = event.offsetY / event.target.clientHeight;
        if (0 <= percentageY && percentageY <= 0.25) {
            this.dragGameobjectExpandOverArea = 1;
        } else if (1 >= percentageY && percentageY >= 0.75) {
            this.dragGameobjectExpandOverArea = -1;
        } else {
            this.dragGameobjectExpandOverArea = 0;
        }

        this.changeDetectorRef.detectChanges();
        // console.log('drag over', this.editorService.gameObjectHtmlDragging, onGameobject);
    }

    cleanDragStyles() {
        this.title.nativeElement.classList.remove('drop-above');
        this.title.nativeElement.classList.remove('drop-below');
    }

    handleDrop(event, gameObject: GameObject) {
        const target = event.target as HTMLElement;
        const component = target.closest('.row');
        const uuid = component.id;
        const onGameobject = engine.gameObjects.find((go) => go.uuid === uuid);

        const insertOnParent = (position: "below" | "above") => {
            const parent = onGameobject.parentGameObject;

            if (!parent) {
                GameObjectComponent.dragGameObject.unparentGameObject();
                this.onSortRoot.emit({ position, onDroppedGameobject: onGameobject, movedGameObject: GameObjectComponent.dragGameObject });
                return;
            }

            parent.addGameObject(GameObjectComponent.dragGameObject);
            const indexDrag = parent.childrenGameObjects.indexOf(GameObjectComponent.dragGameObject);
            const indexOnGameobject = parent.childrenGameObjects.indexOf(onGameobject);
            parent.childrenGameObjects.splice(indexDrag, 1);
            parent.childrenGameObjects.splice(position === "above" ? indexOnGameobject : indexOnGameobject + 1, 0, GameObjectComponent.dragGameObject);
        }

        if (onGameobject && onGameobject !== GameObjectComponent.dragGameObject) {
            const actions = {
                "above": () => insertOnParent("above"),
                "below": () => insertOnParent("below"),
                "center": () => onGameobject.addGameObject(GameObjectComponent.dragGameObject)
            }
            actions[this.dragGameobjectExpandOverArea === 0 ? "center" : this.dragGameobjectExpandOverArea === 1 ? "above" : "below"]();
        }
        this.handleDragEnd(event, gameObject);
    }

    handleDragEnd(event, gameObject) {
        GameObjectComponent.dragGameObject = null;
        GameObjectComponent.dragGameobjectExpandOverGameobject = null;
        this.dragGameobjectExpandOverTime = 0;
        this.dragGameobjectExpandOverArea = NaN;
        event.preventDefault();
        this.changeDetectorRef.detectChanges();
    }

    getStyle(gameObject) {
        if (GameObjectComponent.dragGameObject === gameObject) {
            return 'drag-start';
        } else if (GameObjectComponent.dragGameobjectExpandOverGameobject === gameObject) {
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

}