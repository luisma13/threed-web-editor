import { SelectionModel } from '@angular/cdk/collections';
import { FlatTreeControl } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import { Component, Injectable, ElementRef, ViewChild } from '@angular/core';
import { MatTreeFlatDataSource, MatTreeFlattener, MatTreeModule } from '@angular/material/tree';
import { BehaviorSubject } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { GameObject } from '../../vipe-3d-engine/core/gameobject';

/**
 * Node for to-do item
 */
export class GameObjectItemNode {
    children: GameObjectItemNode[];
    item: string;
}

/** Flat to-do item node with expandable and level information */
export class GameObjectItemFlatNode {
    item: string;
    level: number;
    expandable: boolean;
}

/**
 * The Json object for to-do list data.
 */
const TREE_DATA = {
    Groceries: {
        'Almond Meal flour': null,
        'Organic eggs': null,
        'Protein Powder': null,
        Fruits: {
            Apple: null,
            Berries: ['Blueberry', 'Raspberry'],
            Orange: null
        }
    },
    Reminders: [
        'Cook dinner',
        'Read the Material Design spec',
        'Upgrade Application to Angular'
    ]
};

/**
 * Checklist database, it can build a tree structured Json object.
 * Each node in Json object represents a to-do item or a category.
 * If a node is a category, it has children items and new items can be added under the category.
 */
@Injectable()
export class GameObjectsDatabase {
    dataChange = new BehaviorSubject<GameObjectItemNode[]>([]);

    get data(): GameObjectItemNode[] { return this.dataChange.value; }

    constructor() {
        this.initialize();
    }

    initialize() {
        // Build the tree nodes from Json object. The result is a list of `TodoItemNode` with nested
        //     file node as children.
        const data = this.buildFileTree(TREE_DATA, 0);

        // Notify the change.
        this.dataChange.next(data);
    }

    /**
     * Build the file structure tree. The `value` is the Json object, or a sub-tree of a Json object.
     * The return value is the list of `TodoItemNode`.
     */
    buildFileTree(obj: object, level: number): GameObjectItemNode[] {
        return Object.keys(obj).reduce<GameObjectItemNode[]>((accumulator, key) => {
            const value = obj[key];
            const node = new GameObjectItemNode();
            node.item = key;

            if (value != null) {
                if (typeof value === 'object') {
                    node.children = this.buildFileTree(value, level + 1);
                } else {
                    node.item = value;
                }
            }

            return accumulator.concat(node);
        }, []);
    }

    /** Add an item to to-do list */
    insertItem(parent: GameObjectItemNode, name: string): GameObjectItemNode {
        if (!parent.children) {
            parent.children = [];
        }
        const newItem = { item: name } as GameObjectItemNode;
        parent.children.push(newItem);
        this.dataChange.next(this.data);
        return newItem;
    }

    insertItemAbove(node: GameObjectItemNode, name: string): GameObjectItemNode {
        const parentNode = this.getParentFromNodes(node);
        const newItem = { item: name } as GameObjectItemNode;
        if (parentNode != null) {
            parentNode.children.splice(parentNode.children.indexOf(node), 0, newItem);
        } else {
            this.data.splice(this.data.indexOf(node), 0, newItem);
        }
        this.dataChange.next(this.data);
        return newItem;
    }

    insertItemBelow(node: GameObjectItemNode, name: string): GameObjectItemNode {
        const parentNode = this.getParentFromNodes(node);
        const newItem = { item: name } as GameObjectItemNode;
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

    updateItem(node: GameObjectItemNode, name: string) {
        node.item = name;
        this.dataChange.next(this.data);
    }

    deleteItem(node: GameObjectItemNode) {
        this.deleteNode(this.data, node);
        this.dataChange.next(this.data);
    }

    copyPasteItem(from: GameObjectItemNode, to: GameObjectItemNode): GameObjectItemNode {
        const newItem = this.insertItem(to, from.item);
        if (from.children) {
            from.children.forEach(child => {
                this.copyPasteItem(child, newItem);
            });
        }
        return newItem;
    }

    copyPasteItemAbove(from: GameObjectItemNode, to: GameObjectItemNode): GameObjectItemNode {
        const newItem = this.insertItemAbove(to, from.item);
        if (from.children) {
            from.children.forEach(child => {
                this.copyPasteItem(child, newItem);
            });
        }
        return newItem;
    }

    copyPasteItemBelow(from: GameObjectItemNode, to: GameObjectItemNode): GameObjectItemNode {
        const newItem = this.insertItemBelow(to, from.item);
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
    templateUrl: './draggable-tree.component.html',
    styleUrls: ['./draggable-tree.component.scss'],
    providers: [GameObjectsDatabase]
})
export class DraggableTreeComponent {
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

    constructor(private database: GameObjectsDatabase) {
        this.treeFlattener = new MatTreeFlattener(this.transformer, this.getLevel, this.isExpandable, this.getChildren);
        this.treeControl = new FlatTreeControl<GameObjectItemFlatNode>(this.getLevel, this.isExpandable);
        this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

        database.dataChange.subscribe(data => {
            this.dataSource.data = [];
            this.dataSource.data = data;
        });
    }

    getLevel = (node: GameObjectItemFlatNode) => node.level;

    isExpandable = (node: GameObjectItemFlatNode) => node.expandable;

    getChildren = (node: GameObjectItemNode): GameObjectItemNode[] => node.children;

    hasChild = (_: number, _nodeData: GameObjectItemFlatNode) => _nodeData.expandable;

    hasNoContent = (_: number, _nodeData: GameObjectItemFlatNode) => _nodeData.item === '';

    /**
     * Transformer to convert nested node to flat node. Record the nodes in maps for later use.
     */
    transformer = (node: GameObjectItemNode, level: number) => {
        const existingNode = this.nestedNodeMap.get(node);
        const flatNode = existingNode && existingNode.item === node.item
            ? existingNode
            : new GameObjectItemFlatNode();
        flatNode.item = node.item;
        flatNode.level = level;
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

    /** Toggle the to-do item selection. Select/deselect all the descendants node */
    todoItemSelectionToggle(node: GameObjectItemFlatNode): void {
        this.checklistSelection.toggle(node);
        const descendants = this.treeControl.getDescendants(node);
        this.checklistSelection.isSelected(node)
            ? this.checklistSelection.select(...descendants)
            : this.checklistSelection.deselect(...descendants);
    }

    /** Select the category so we can insert the new item. */
    addNewItem(node: GameObjectItemFlatNode) {
        const parentNode = this.flatNodeMap.get(node);
        this.database.insertItem(parentNode, '');
        this.treeControl.expand(node);
    }

    /** Save the node to database */
    saveNode(node: GameObjectItemFlatNode, itemValue: string) {
        const nestedNode = this.flatNodeMap.get(node);
        this.database.updateItem(nestedNode, itemValue);
    }

    handleDragStart(event, node) {
        // Required by Firefox (https://stackoverflow.com/questions/19055264/why-doesnt-html5-drag-and-drop-work-in-firefox)
        event.dataTransfer.setData('foo', 'bar');
        //event.dataTransfer.setDragImage(this.emptyItem.nativeElement, 0, 0);
        this.dragNode = node;
        this.treeControl.collapse(node);
    }

    handleDragOver(event, node) {
        event.preventDefault();
        // Handle node expand
        if (this.dragNodeExpandOverNode && node === this.dragNodeExpandOverNode) {
            if ((Date.now() - this.dragNodeExpandOverTime) > this.dragNodeExpandOverWaitTimeMs) {
                if (!this.treeControl.isExpanded(node)) {
                    this.treeControl.expand(node);
                    //this.cd.detectChanges();
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

    handleDrop(event, node) {
        if (node !== this.dragNode) {
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
        }
        this.handleDragEnd(event, node);
    }

    handleDragEnd(event, node) {
        this.dragNode = null;
        this.dragNodeExpandOverNode = null;
        this.dragNodeExpandOverTime = 0;
        this.dragNodeExpandOverArea = NaN;
        event.preventDefault();
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
        } else {
            return '';
        }
    }


    deleteItem(node: GameObjectItemFlatNode) {
        this.database.deleteItem(this.flatNodeMap.get(node));
    }

}
