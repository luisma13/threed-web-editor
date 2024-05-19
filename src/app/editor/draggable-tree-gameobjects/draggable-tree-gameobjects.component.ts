import { SelectionModel } from '@angular/cdk/collections';
import { FlatTreeControl } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import { Component, Injectable, ElementRef, ViewChild, ChangeDetectorRef, afterNextRender } from '@angular/core';
import { MatTreeFlatDataSource, MatTreeFlattener, MatTreeModule } from '@angular/material/tree';
import { BehaviorSubject } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { GameObject } from '../../vipe-3d-engine/core/gameobject';
import { engine } from '../../vipe-3d-engine/core/engine/engine';
import { EditorService } from '../editor.service';

/**
 * Node for gameobject item
 */
export class GameObjectItemNode {
    children: GameObjectItemNode[];
    data: GameObject;
}

/** Flat gameobject item node with expandable and level information */
export class GameObjectItemFlatNode {
    data: GameObject;
    level: number;
    expandable: boolean;
}

/**
 * Checklist database, it can build a tree structured Json object.
 * Each node in Json object represents a gameobject item.
 * If a node is a category, it has children items and new items can be added under the category.
 */
@Injectable()
export class GameObjectsDatabase {

    dataChange = new BehaviorSubject<GameObjectItemNode[]>([]);

    get data(): GameObjectItemNode[] { return this.dataChange.value; }

    treeChange = new BehaviorSubject<GameObjectItemNode[]>([]);

    /**
     * Build the file structure tree. The `value` is the Json object, or a sub-tree of a Json object.
     * The return value is the list of `GameobjectItemNode`.
     */
    buildFileTree(objs: GameObject[], level: number): GameObjectItemNode[] {
        return objs.reduce<GameObjectItemNode[]>((accumulator, gameobject) => {
            const value = gameobject
            const node = new GameObjectItemNode();
            node.data = gameobject;
            if (value.childrenGameObjects.length > 0) {
                node.children = this.buildFileTree(gameobject.childrenGameObjects, level + 1);
            }
            return accumulator.concat(node);
        }, []);
    }

    /** Add an item to gameobject list */
    insertItem(parent: GameObjectItemNode, data: GameObject): GameObjectItemNode {
        if (!parent.children) {
            parent.children = [];
        }
        const newItem = { data } as GameObjectItemNode;
        parent.children.push(newItem);
        this.dataChange.next(this.data);
        return newItem;
    }

    insertItemAbove(node: GameObjectItemNode, data: GameObject): GameObjectItemNode {
        const parentNode = this.getParentFromNodes(node);
        const newItem = { data, children: [] } as GameObjectItemNode;
        if (parentNode != null) {
            parentNode.children.splice(parentNode.children.indexOf(node), 0, newItem);
        } else {
            this.data.splice(this.data.indexOf(node), 0, newItem);
        }
        this.dataChange.next(this.data);
        return newItem;
    }

    insertItemBelow(node: GameObjectItemNode, data: GameObject): GameObjectItemNode {
        const parentNode = this.getParentFromNodes(node);
        const newItem = { data, children: [] } as GameObjectItemNode;
        if (parentNode != null) {
            parentNode.children.splice(parentNode.children.indexOf(node) + 1, 0, newItem);
        } else {
            this.data.splice(this.data.indexOf(node) + 1, 0, newItem);
        }
        this.dataChange.next(this.data);
        return newItem;
    }

    getParentFromNodes(node: GameObjectItemNode): GameObjectItemNode {
        for (let i = 0; i < this.data.length; ++i) {
            const currentRoot = this.data[i];
            const parent = this.getParent(currentRoot, node);
            if (parent != null) {
                return parent;
            }
        }
        return null;
    }

    getParent(currentRoot: GameObjectItemNode, node: GameObjectItemNode): GameObjectItemNode {
        if (currentRoot.children && currentRoot.children.length > 0) {
            for (let i = 0; i < currentRoot.children.length; ++i) {
                const child = currentRoot.children[i];
                if (child === node) {
                    return currentRoot;
                } else if (child.children && child.children.length > 0) {
                    const parent = this.getParent(child, node);
                    if (parent != null) {
                        return parent;
                    }
                }
            }
        }
        return null;
    }

    updateItem(node: GameObjectItemNode, data: GameObject) {
        node.data = data;
        this.dataChange.next(this.data);
    }

    deleteItem(node: GameObjectItemNode) {
        this.deleteNode(this.data, node);
        this.dataChange.next(this.data);
    }

    copyPasteItem(from: GameObjectItemNode, to: GameObjectItemNode): GameObjectItemNode {
        const newItem = this.insertItem(to, from.data);
        if (from.children) {
            from.children.forEach(child => {
                this.copyPasteItem(child, newItem);
            });
        }
        return newItem;
    }

    copyPasteItemAbove(from: GameObjectItemNode, to: GameObjectItemNode): GameObjectItemNode {
        const newItem = this.insertItemAbove(to, from.data);
        if (from.children) {
            from.children.forEach(child => {
                this.copyPasteItem(child, newItem);
            });
        }
        return newItem;
    }

    copyPasteItemBelow(from: GameObjectItemNode, to: GameObjectItemNode): GameObjectItemNode {
        const newItem = this.insertItemBelow(to, from.data);
        if (from.children) {
            from.children.forEach(child => {
                this.copyPasteItem(child, newItem);
            });
        }
        return newItem;
    }

    deleteNode(nodes: GameObjectItemNode[], nodeToDelete: GameObjectItemNode) {
        const index = nodes.indexOf(nodeToDelete, 0);
        if (index > -1) {
            nodes.splice(index, 1);
        } else {
            nodes.forEach(node => {
                if (node.children && node.children.length > 0) {
                    this.deleteNode(node.children, nodeToDelete);
                }
            });
        }
    }
}

@Component({
    selector: 'app-draggable-tree',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatTreeModule
    ],
    templateUrl: './draggable-tree-gameobjects.component.html',
    styleUrls: ['./draggable-tree-gameobjects.component.scss'],
    providers: []
})
export class DraggableTreeGameObjectsComponent {
    /** Map from flat node to nested node. This helps us finding the nested node to be modified */
    flatNodeMap = new Map<GameObjectItemFlatNode, GameObjectItemNode>();

    /** Map from nested node to flattened node. This helps us to keep the same object for selection */
    nestedNodeMap = new Map<GameObjectItemNode, GameObjectItemFlatNode>();

    /** A selected parent node to be inserted */
    selectedParent: GameObjectItemFlatNode | null = null;

    /** The new item's name */
    newItemName = '';

    treeControl: FlatTreeControl<GameObjectItemFlatNode>;

    treeFlattener: MatTreeFlattener<GameObjectItemNode, GameObjectItemFlatNode>;

    dataSource: MatTreeFlatDataSource<GameObjectItemNode, GameObjectItemFlatNode>;

    /** The selection for checklist */
    checklistSelection = new SelectionModel<GameObjectItemFlatNode>(true /* multiple */);

    /* Drag and drop */
    dragNode: any;
    dragNodeExpandOverWaitTimeMs = 300;
    dragNodeExpandOverNode: any;
    dragNodeExpandOverTime: number;
    dragNodeExpandOverArea: number;
    @ViewChild('emptyItem') emptyItem: ElementRef;

    constructor(
        private database: GameObjectsDatabase,
        private editorService: EditorService,
        private cd: ChangeDetectorRef
    ) {
        this.treeFlattener = new MatTreeFlattener(this.transformer, this.getLevel, this.isExpandable, this.getChildren);
        this.treeControl = new FlatTreeControl<GameObjectItemFlatNode>(this.getLevel, this.isExpandable);
        this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
        this.dataSource.data = this.database.data;
    }

    ngOnInit() {
        this.database.dataChange.subscribe(data => {
            setTimeout(() => {
                this.dataSource.data = data;
            });
        });

        const createGameObjectItem = (gameObject) => {
            const parentGameObject = gameObject.parentGameObject;
            let parentNode = this.database.data.find(node => node.data === parentGameObject);
            const node = (parentGameObject && parentNode)
                ? this.database.insertItem(parentNode, gameObject)
                : this.database.insertItemBelow(this.database.data[this.database.data.length - 1], gameObject);
            this.updateNodeUI(node);
            this.updateNodeUI(parentNode);
        }

        engine.onGameobjectCreated.subscribe((gameObject) => {
            if (!gameObject) return;
            createGameObjectItem(gameObject);
        });
        engine.onGameobjectHerarchyChanged.subscribe((gameObject) => {
            if (!gameObject) return;
            this.database.deleteItem(this.database.data.find(node => node.data === gameObject));
            createGameObjectItem(gameObject);
        });
        engine.onGameobjectRemoved.subscribe((gameObject) => {
            if (!gameObject) return;
            this.database.deleteItem(this.database.data.find(node => node.data === gameObject));
        });
    }

    getLevel = (node: GameObjectItemFlatNode) => node?.level;

    isExpandable = (node: GameObjectItemFlatNode) => node.expandable;

    getChildren = (node: GameObjectItemNode): GameObjectItemNode[] => node.children;

    hasChild = (_: number, _nodeData: GameObjectItemFlatNode) => { return _nodeData.expandable };

    hasNoContent = (_: number, _nodeData: GameObjectItemFlatNode) => _nodeData.data === undefined;

    /**
     * Transformer to convert nested node to flat node. Record the nodes in maps for later use.
     */
    transformer = (node: GameObjectItemNode, level: number) => {
        const existingNode = this.nestedNodeMap.get(node);

        const flatNode = existingNode && existingNode.data === node.data
            ? existingNode
            : {} as GameObjectItemFlatNode;

        flatNode.level = level;
        flatNode.data = node.data;
        flatNode.expandable = (node.children && node.children.length > 0);
        this.flatNodeMap.set(flatNode, node);
        this.nestedNodeMap.set(node, flatNode);
        return flatNode;
    }

    /** Whether all the descendants of the node are selected */
    descendantsAllSelected(node: GameObjectItemFlatNode): boolean {
        const descendants = this.treeControl.getDescendants(node);
        return descendants.every(child => this.checklistSelection.isSelected(child));
    }

    /** Whether part of the descendants are selected */
    descendantsPartiallySelected(node: GameObjectItemFlatNode): boolean {
        const descendants = this.treeControl.getDescendants(node);
        const result = descendants.some(child => this.checklistSelection.isSelected(child));
        return result && !this.descendantsAllSelected(node);
    }

    /** Toggle the gameobject item selection. Select/deselect all the descendants node */
    gameobjectItemSelectionToggle(node: GameObjectItemFlatNode): void {
        this.checklistSelection.toggle(node);
        const descendants = this.treeControl.getDescendants(node);
        this.checklistSelection.isSelected(node)
            ? this.checklistSelection.select(...descendants)
            : this.checklistSelection.deselect(...descendants);
    }

    /** Select the category so we can insert the new item. */
    addNewItem(event, node: GameObjectItemFlatNode) {
        event.stopPropagation();
        this.editorService.newGameObject(node.data);
        this.treeControl.expand(node);
    }

    onClick(node: GameObjectItemFlatNode | GameObjectItemNode) {
        this.editorService.editableSceneComponent?.selectedObject.next(node.data);
    }

    handleDragStart(event, node) {
        // Required by Firefox (https://stackoverflow.com/questions/19055264/why-doesnt-html5-drag-and-drop-work-in-firefox)
        event.dataTransfer.setData('foo', 'bar');
        this.dragNode = node;
        this.treeControl.collapse(node);
        this.cd.detectChanges();
    }

    handleDragOver(event, node) {
        event.preventDefault();
        // Handle node expand
        if (this.dragNodeExpandOverNode && node === this.dragNodeExpandOverNode) {
            if ((Date.now() - this.dragNodeExpandOverTime) > this.dragNodeExpandOverWaitTimeMs) {
                if (!this.treeControl.isExpanded(node)) {
                    this.treeControl.expand(node);
                }
            }
        } else {
            this.dragNodeExpandOverNode = node;
            this.dragNodeExpandOverTime = new Date().getTime();
        }

        // Handle drag area
        const percentageY = event.offsetY / event.target.clientHeight;
        if (0 <= percentageY && percentageY <= 0.25) {
            this.dragNodeExpandOverArea = 1;
        } else if (1 >= percentageY && percentageY >= 0.75) {
            this.dragNodeExpandOverArea = -1;
        } else {
            this.dragNodeExpandOverArea = 0;
        }
    }

    handleDrop(event, node: GameObjectItemFlatNode) {
        if (node !== this.dragNode) {
            const parent = this.database.getParentFromNodes(this.flatNodeMap.get(this.dragNode));

            let newItem: GameObjectItemNode;
            if (this.dragNodeExpandOverArea === 1) {
                newItem = this.database.copyPasteItemAbove(this.flatNodeMap.get(this.dragNode), this.flatNodeMap.get(node));
            } else if (this.dragNodeExpandOverArea === -1) {
                newItem = this.database.copyPasteItemBelow(this.flatNodeMap.get(this.dragNode), this.flatNodeMap.get(node));
            } else {
                newItem = this.database.copyPasteItem(this.flatNodeMap.get(this.dragNode), this.flatNodeMap.get(node));
            }
            this.database.deleteItem(this.flatNodeMap.get(this.dragNode));
            this.treeControl.expandDescendants(this.nestedNodeMap.get(newItem));
            this.database.treeChange.next(this.database.data);

            this.updateNodeUI(node);
            this.updateNodeUI(parent);

            const {parentNode} = this.getPositionInfoFromNode(newItem, null, this.database.data);
            this.syncGameObjectHierarchy(newItem.data, parent?.data, parentNode?.data);
        }

        this.handleDragEnd(event, node);
    }

    handleDragEnd(event, node) {
        this.dragNode = null;
        this.dragNodeExpandOverNode = null;
        this.dragNodeExpandOverTime = 0;
        this.dragNodeExpandOverArea = NaN;
        event.preventDefault();
        this.cd.detectChanges();
    }

    getStyle(node: GameObjectItemFlatNode) {
        if (this.dragNode === node) {
            return 'drag-start';
        } else if (this.dragNodeExpandOverNode === node) {
            switch (this.dragNodeExpandOverArea) {
                case 1:
                    return 'drop-above';
                case -1:
                    return 'drop-below';
                default:
                    return 'drop-center'
            }
        }
        return undefined;
    }

    deleteItem(node: GameObjectItemFlatNode) {
        this.database.deleteItem(this.flatNodeMap.get(node));
    }

    /**
     * Return the parent node, the next one node and previous one node if exists
     */
    getPositionInfoFromNode(nodeToSearch, parent, nodes) {
        if (!nodes) return;
        for (let i = 0; i < nodes.length; i++) {
            let nextNode = nodes[i + 1];
            let prevNode = nodes[i - 1];
            let parentNode = parent;
            if (nodes[i].data === nodeToSearch.data) {
                return { foundNode: nodes[i], nextNode, prevNode, parentNode };
            }
            const result = this.getPositionInfoFromNode(nodeToSearch, nodes[i], nodes[i].children);
            if (result) return result;
        }
    }

    /**
     * Recreate the node UI to update the element in the tree
     */
    updateNodeUI(nodeToUpdate) {
        if (!nodeToUpdate) return;
        const { foundNode , nextNode, prevNode, parentNode } = this.getPositionInfoFromNode(nodeToUpdate, null, this.database.data);
        if (nextNode)
            this.database.copyPasteItemAbove(foundNode, nextNode);
        else if (prevNode)
            this.database.copyPasteItemBelow(foundNode, prevNode);
        else if (parentNode)
            this.database.copyPasteItem(foundNode, parentNode);
        else
            this.database.copyPasteItemBelow(this.database.data[this.database.data.length - 1], foundNode);

        this.database.deleteItem(foundNode);
    };

    syncGameObjectHierarchy(gameObject: GameObject, oldParent: GameObject, newParent: GameObject) {
        console.log(gameObject, oldParent, newParent, this.database.data);

        if (newParent) {
            newParent.addGameObject(gameObject, false);
        } else {
            gameObject.unparentGameObject();
        }
    }

}
