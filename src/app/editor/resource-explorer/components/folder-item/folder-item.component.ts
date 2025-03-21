import { Component, Input, Output, EventEmitter, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ResourceFolder } from '../../resource-explorer.component';

@Component({
  selector: 'app-folder-item',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="folder"
         [class.selected]="selected"
         (click)="onClick($event)"
         (dragover)="onDragOver($event)"
         (drop)="onDrop($event)">
      <mat-icon>{{ folder.isExpanded ? 'folder_open' : 'folder' }}</mat-icon>
      <span class="folder-name">{{ folder.name }}</span>
    </div>
    <div class="folder-contents" *ngIf="folder.isExpanded" [style.padding-left.px]="20">
      <ng-container *ngTemplateOutlet="contentTemplate; context: { $implicit: folder }">
      </ng-container>
    </div>
  `,
  styles: [`
    .folder {
      display: flex;
      align-items: center;
      padding: 4px 8px;
      cursor: pointer;
      border-radius: 4px;
      margin: 2px 0;
      gap: 8px;
    }

    .folder:hover {
      background-color: #2a2a2a;
    }

    .folder.selected {
      background-color: #0078d4;
    }

    .folder mat-icon {
      color: #ffd700;
    }

    .folder-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .folder-contents {
      margin-left: 16px;
    }
  `]
})
export class FolderItemComponent {
  @Input() folder!: ResourceFolder;
  @Input() selected: boolean = false;
  @Input() contentTemplate!: TemplateRef<any>;
  @Output() folderClick = new EventEmitter<{event: MouseEvent, folder: ResourceFolder}>();
  @Output() folderDrop = new EventEmitter<{event: DragEvent, folder: ResourceFolder}>();

  onClick(event: MouseEvent) {
    this.folderClick.emit({event, folder: this.folder});
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent) {
    this.folderDrop.emit({event, folder: this.folder});
  }
} 