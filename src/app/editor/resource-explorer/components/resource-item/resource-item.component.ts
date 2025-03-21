import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ResourceItem } from '../../resource-explorer.component';

@Component({
  selector: 'app-resource-item',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="resource-item"
         [class.selected]="selected"
         [class.dragging]="dragging"
         (click)="onClick($event)"
         (contextmenu)="onContextMenu($event)"
         draggable="true"
         (dragstart)="onDragStart($event)"
         (dragend)="dragging = false">
      <div class="item-preview" *ngIf="item.preview">
        <img [src]="item.preview" [alt]="item.name">
        <div class="type-indicator">
          <mat-icon>{{ 
            item.type === 'material' ? 'format_paint' : 
            item.type === 'texture' ? 'texture' : '3d_rotation' 
          }}</mat-icon>
        </div>
      </div>
      <mat-icon *ngIf="!item.preview">{{ 
        item.type === 'material' ? 'format_paint' : 
        item.type === 'texture' ? 'texture' : '3d_rotation' 
      }}</mat-icon>
      <div class="item-info">
        <span class="item-name">{{ item.name }}</span>
        <span class="item-type">{{ item.type }}</span>
      </div>
    </div>
  `,
  styles: [`
    .resource-item {
      display: flex;
      align-items: center;
      padding: 8px;
      cursor: pointer;
      border-radius: 4px;
      margin: 2px 0;
      gap: 12px;
      transition: background-color 0.2s;
    }

    .resource-item:hover {
      background-color: #2a2a2a;
    }

    .resource-item.selected {
      background-color: #0078d4;
    }

    .resource-item.dragging {
      opacity: 0.5;
    }

    .item-preview {
      width: 40px;
      height: 40px;
      overflow: hidden;
      border-radius: 4px;
      position: relative;
      background-color: #2a2a2a;
    }

    .item-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .type-indicator {
      position: absolute;
      bottom: -4px;
      right: -4px;
      background-color: #333;
      border-radius: 50%;
      padding: 2px;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #1e1e1e;
    }

    .type-indicator mat-icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
      color: #fff;
    }

    mat-icon {
      color: #888;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .item-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .item-name {
      font-size: 13px;
      color: #fff;
    }

    .item-type {
      font-size: 11px;
      color: #888;
      text-transform: capitalize;
    }
  `]
})
export class ResourceItemComponent {
  @Input() item!: ResourceItem;
  @Input() selected: boolean = false;
  dragging: boolean = false;

  @Output() itemClick = new EventEmitter<{event: MouseEvent, item: ResourceItem}>();
  @Output() itemContextMenu = new EventEmitter<{event: MouseEvent, item: ResourceItem}>();
  @Output() itemDragStart = new EventEmitter<{event: DragEvent, item: ResourceItem}>();

  onClick(event: MouseEvent) {
    this.itemClick.emit({event, item: this.item});
  }

  onContextMenu(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.itemContextMenu.emit({event, item: this.item});
  }

  onDragStart(event: DragEvent) {
    this.dragging = true;
    this.itemDragStart.emit({event, item: this.item});
  }
} 