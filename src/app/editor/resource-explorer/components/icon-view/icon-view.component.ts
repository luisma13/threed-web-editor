import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ResourceFolder, ResourceItem } from '../../resource-explorer.component';

@Component({
  selector: 'app-icon-view',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <!-- Current Folder Path -->
    <div class="folder-path" *ngIf="selectedFolder && selectedFolder.path !== '/'">
      <button mat-button (click)="navigateBack.emit()">
        <mat-icon>arrow_back</mat-icon>
        Back
      </button>
      <span class="path-text">{{ selectedFolder.path }}</span>
    </div>

    <div class="icon-grid">
      <!-- Show parent folder option if we're in a subfolder -->
      <div *ngIf="selectedFolder && selectedFolder.path !== '/'"
           class="icon-item folder-item"
           (click)="navigateBack.emit()"
           (dragover)="$event.preventDefault()"
           (drop)="onParentFolderDrop($event)">
        <mat-icon class="large-icon">arrow_upward</mat-icon>
        <span class="item-name">..</span>
      </div>

      <!-- Show current folder contents -->
      <ng-container *ngIf="!selectedFolder">
        <!-- Root level folders -->
        <div *ngFor="let subfolder of folder.subfolders"
             class="icon-item folder-item"
             [class.selected]="selectedFolder === subfolder"
             (click)="onFolderClick($event, subfolder)"
             (dragover)="$event.preventDefault()"
             (drop)="onItemDrop($event, subfolder)">
          <mat-icon class="large-icon">folder</mat-icon>
          <span class="item-name">{{ subfolder.name }}</span>
        </div>

        <!-- Root level items -->
        <div *ngFor="let item of folder.items"
             class="icon-item"
             [class.selected]="selectedItems.has(item)"
             (click)="onItemClick($event, item)"
             (contextmenu)="onItemContextMenu($event, item)"
             draggable="true"
             (dragstart)="onItemDragStart($event, item)">
          <div class="icon-preview" *ngIf="item.preview">
            <img [src]="item.preview" [alt]="item.name">
            <div class="type-indicator">
              <mat-icon>{{ item.type === 'material' ? 'format_paint' : 
                           item.type === 'texture' ? 'texture' : '3d_rotation' }}</mat-icon>
            </div>
          </div>
          <mat-icon class="large-icon" *ngIf="!item.preview">
            {{ item.type === 'material' ? 'format_paint' : 
               item.type === 'texture' ? 'texture' : '3d_rotation' }}
          </mat-icon>
          <div class="item-info">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-type">{{ item.type }}</span>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="selectedFolder">
        <!-- Selected folder's subfolders -->
        <div *ngFor="let subfolder of selectedFolder.subfolders"
             class="icon-item folder-item"
             [class.selected]="selectedFolder === subfolder"
             (click)="onFolderClick($event, subfolder)"
             (dragover)="$event.preventDefault()"
             (drop)="onItemDrop($event, subfolder)">
          <mat-icon class="large-icon">folder</mat-icon>
          <span class="item-name">{{ subfolder.name }}</span>
        </div>

        <!-- Selected folder's items -->
        <div *ngFor="let item of selectedFolder.items"
             class="icon-item"
             [class.selected]="selectedItems.has(item)"
             (click)="onItemClick($event, item)"
             (contextmenu)="onItemContextMenu($event, item)"
             draggable="true"
             (dragstart)="onItemDragStart($event, item)">
          <div class="icon-preview" *ngIf="item.preview">
            <img [src]="item.preview" [alt]="item.name">
            <div class="type-indicator">
              <mat-icon>{{ item.type === 'material' ? 'format_paint' : 
                           item.type === 'texture' ? 'texture' : '3d_rotation' }}</mat-icon>
            </div>
          </div>
          <mat-icon class="large-icon" *ngIf="!item.preview">
            {{ item.type === 'material' ? 'format_paint' : 
               item.type === 'texture' ? 'texture' : '3d_rotation' }}
          </mat-icon>
          <div class="item-info">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-type">{{ item.type }}</span>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .folder-path {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      background-color: #252525;
      border-bottom: 1px solid #333;
      gap: 8px;
    }

    .folder-path button {
      color: #ffffff;
      padding: 4px 8px;
    }

    .folder-path button mat-icon {
      margin-right: 4px;
    }

    .folder-path .path-text {
      color: #888;
      font-size: 12px;
    }

    .icon-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 16px;
      padding: 16px;
    }

    .icon-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px;
      cursor: pointer;
      border-radius: 4px;
      text-align: center;
      transition: background-color 0.2s;
    }

    .icon-item:hover {
      background-color: #2a2a2a;
    }

    .icon-item.selected {
      background-color: #0078d4;
    }

    .icon-item.folder-item .large-icon {
      color: #ffd700;
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    .icon-preview {
      width: 80px;
      height: 80px;
      margin-bottom: 8px;
      border-radius: 4px;
      overflow: hidden;
      background-color: #2a2a2a;
      position: relative;
    }

    .icon-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .type-indicator {
      position: absolute;
      bottom: 4px;
      right: 4px;
      background-color: rgba(0, 0, 0, 0.7);
      border-radius: 50%;
      padding: 2px;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .type-indicator mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #fff;
    }

    .item-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      width: 100%;
    }

    .item-name {
      font-size: 12px;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 0 4px;
      color: #fff;
    }

    .item-type {
      font-size: 10px;
      color: #888;
      text-transform: capitalize;
    }

    .large-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 8px;
      color: #888;
    }
  `]
})
export class IconViewComponent {
  @Input() folder!: ResourceFolder;
  @Input() selectedItems!: Set<ResourceItem>;
  @Input() selectedFolder: ResourceFolder | null = null;

  @Output() itemClick = new EventEmitter<{event: MouseEvent, item: ResourceItem}>();
  @Output() itemContextMenu = new EventEmitter<{event: MouseEvent, item: ResourceItem}>();
  @Output() itemDragStart = new EventEmitter<{event: DragEvent, item: ResourceItem}>();
  @Output() folderClick = new EventEmitter<{event: MouseEvent, folder: ResourceFolder}>();
  @Output() itemDrop = new EventEmitter<{event: DragEvent, folder: ResourceFolder}>();
  @Output() navigateBack = new EventEmitter<void>();

  onItemClick(event: MouseEvent, item: ResourceItem) {
    this.itemClick.emit({event, item});
  }

  onItemContextMenu(event: MouseEvent, item: ResourceItem) {
    this.itemContextMenu.emit({event, item});
  }

  onItemDragStart(event: DragEvent, item: ResourceItem) {
    this.itemDragStart.emit({event, item});
  }

  onFolderClick(event: MouseEvent, folder: ResourceFolder) {
    this.folderClick.emit({event, folder});
  }

  onItemDrop(event: DragEvent, folder: ResourceFolder) {
    this.itemDrop.emit({event, folder});
  }

  onParentFolderDrop(event: DragEvent) {
    if (!this.selectedFolder) return;
    
    const parentPath = this.selectedFolder.path.split('/').slice(0, -1).join('/') || '/';
    const parentFolder = this.findParentFolder(parentPath);
    
    if (parentFolder) {
      this.itemDrop.emit({event, folder: parentFolder});
    }
  }

  private findParentFolder(path: string): ResourceFolder | null {
    if (path === '/') return this.folder;

    const findFolder = (folder: ResourceFolder, targetPath: string): ResourceFolder | null => {
      if (folder.path === targetPath) return folder;
      
      for (const subfolder of folder.subfolders) {
        const found = findFolder(subfolder, targetPath);
        if (found) return found;
      }
      
      return null;
    };

    return findFolder(this.folder, path);
  }
} 