import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceFolder, ResourceItem } from '../../resource-explorer.component';
import { ResourceItemComponent } from '../resource-item/resource-item.component';
import { FolderItemComponent } from '../folder-item/folder-item.component';

@Component({
  selector: 'app-list-view',
  standalone: true,
  imports: [CommonModule, ResourceItemComponent, FolderItemComponent],
  template: `
    <div class="folder-contents">
      <!-- Items -->
      <app-resource-item
        *ngFor="let item of folder.items"
        [item]="item"
        [selected]="selectedItems.has(item)"
        (itemClick)="itemClick.emit($event)"
        (itemContextMenu)="itemContextMenu.emit($event)"
        (itemDragStart)="itemDragStart.emit($event)">
      </app-resource-item>

      <!-- Subfolders -->
      <ng-container *ngFor="let subfolder of folder.subfolders">
        <app-folder-item
          [folder]="subfolder"
          [selected]="selectedFolder === subfolder"
          [contentTemplate]="folderContent"
          (folderClick)="folderClick.emit($event)"
          (folderDrop)="itemDrop.emit($event)">
        </app-folder-item>
      </ng-container>
    </div>

    <!-- Template for recursive folder content -->
    <ng-template #folderContent let-folder>
      <app-list-view
        [folder]="folder"
        [selectedItems]="selectedItems"
        [selectedFolder]="selectedFolder"
        (itemClick)="itemClick.emit($event)"
        (itemContextMenu)="itemContextMenu.emit($event)"
        (itemDragStart)="itemDragStart.emit($event)"
        (folderClick)="folderClick.emit($event)"
        (itemDrop)="itemDrop.emit($event)">
      </app-list-view>
    </ng-template>
  `,
  styles: [`
    .folder-contents {
      margin-left: 16px;
    }
  `]
})
export class ListViewComponent {
  @Input() folder!: ResourceFolder;
  @Input() selectedItems!: Set<ResourceItem>;
  @Input() selectedFolder: ResourceFolder | null = null;

  @Output() itemClick = new EventEmitter<{event: MouseEvent, item: ResourceItem}>();
  @Output() itemContextMenu = new EventEmitter<{event: MouseEvent, item: ResourceItem}>();
  @Output() itemDragStart = new EventEmitter<{event: DragEvent, item: ResourceItem}>();
  @Output() folderClick = new EventEmitter<{event: MouseEvent, folder: ResourceFolder}>();
  @Output() itemDrop = new EventEmitter<{event: DragEvent, folder: ResourceFolder}>();
} 