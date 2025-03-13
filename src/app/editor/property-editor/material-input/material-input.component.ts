import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MaterialSelectorService } from '../../resource-manager/material-selector/material-selector.service';
import { ResourceService } from '../../resource-manager/resource.service';
import { MeshStandardMaterial, Color } from 'three';

@Component({
  selector: 'app-material-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="material-input-container" 
         [class.drag-over]="isDragOver"
         (dragover)="onDragOver($event)"
         (dragleave)="onDragLeave($event)"
         (drop)="onDrop($event)">
      <mat-form-field appearance="outline" class="material-field">
        <input matInput [placeholder]="'Seleccionar ' + label" [value]="getMaterialDisplayName()" readonly (click)="openMaterialSelector()">
        <div class="suffix-container" matSuffix>
          <div class="material-preview" 
               [style.background-color]="materialColor"
               [style.background-image]="getMaterialPreviewStyle()"
               [style.background-size]="'cover'"
               (click)="openMaterialSelector(); $event.stopPropagation()">
            <mat-icon *ngIf="!value" class="material-icon">texture</mat-icon>
          </div>
          <button *ngIf="value" mat-icon-button aria-label="Clear" 
                  (click)="clearMaterial($event)" 
                  class="clear-button">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </mat-form-field>
    </div>
  `,
  styles: [`
    .material-input-container {
      width: 100%;
      position: relative;
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    
    .material-input-container.drag-over {
      background-color: rgba(123, 31, 162, 0.2);
      box-shadow: 0 0 0 2px #7b1fa2;
    }
    
    .material-field {
      width: 100%;
    }
    
    .material-field ::ng-deep .mat-mdc-form-field-infix {
      width: auto;
      min-height: auto;
      display: flex;
      align-items: center;
    }
    
    .material-field ::ng-deep .mat-mdc-text-field-wrapper {
      padding: 0 8px;
    }
    
    .material-field ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }
    
    .material-field ::ng-deep .mat-mdc-form-field-flex {
      align-items: center;
    }
    
    .suffix-container {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-right: -8px;
    }
    
    .material-preview {
      width: 24px;
      height: 24px;
      min-width: 24px;
      border-radius: 4px;
      border: 1px solid #555;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      background-position: center;
      background-repeat: no-repeat;
    }
    
    .material-preview:hover {
      transform: scale(1.1);
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    }
    
    .material-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: rgba(255, 255, 255, 0.7);
    }
    
    input[readonly] {
      cursor: pointer;
    }
    
    .clear-button {
      width: 24px !important;
      height: 24px !important;
      padding: 0 !important;
      line-height: 24px !important;
      display: flex !important;
      align-items: center;
      justify-content: center;
    }
    
    .clear-button ::ng-deep .mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      line-height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class MaterialInputComponent {
  @Input() label: string = 'Material';
  @Input() value: string = '';
  @Output() valueChange = new EventEmitter<string>();
  
  isDragOver = false;
  materialColor = '#cccccc';
  
  constructor(
    private materialSelectorService: MaterialSelectorService,
    private resourceService: ResourceService
  ) {}
  
  ngOnChanges(): void {
    this.updateMaterialColor();
  }
  
  getMaterialDisplayName(): string {
    if (!this.value) {
      return 'Sin material';
    }
    
    const materialInfo = this.resourceService.materials.get(this.value);
    if (materialInfo) {
      return materialInfo.name;
    }
    
    return this.value;
  }
  
  getMaterialPreviewStyle(): string {
    if (!this.value) {
      return 'none';
    }
    
    const previewUrl = this.resourceService.getMaterialPreview(this.value);
    if (previewUrl) {
      return `url('${previewUrl}')`;
    }
    
    return 'none';
  }
  
  updateMaterialColor(): void {
    if (this.value) {
      const materialInfo = this.resourceService.materials.get(this.value);
      if (materialInfo && materialInfo.resource instanceof MeshStandardMaterial && 
          materialInfo.resource.color instanceof Color) {
        this.materialColor = `#${materialInfo.resource.color.getHexString()}`;
        return;
      }
    }
    this.materialColor = '#cccccc';
  }
  
  openMaterialSelector(): void {
    this.materialSelectorService.openMaterialSelector(this.value)
      .subscribe(materialId => {
        if (materialId !== undefined) {
          this.value = materialId;
          this.valueChange.emit(materialId);
          this.updateMaterialColor();
        }
      });
  }
  
  clearMaterial(event: Event): void {
    event.stopPropagation();
    this.value = '';
    this.valueChange.emit('');
    this.updateMaterialColor();
  }
  
  onDragOver(event: DragEvent): void {
    // Solo aceptar si es un material
    if (event.dataTransfer?.types.includes('application/material-id')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      this.isDragOver = true;
    }
  }
  
  onDragLeave(event: DragEvent): void {
    this.isDragOver = false;
  }
  
  onDrop(event: DragEvent): void {
    this.isDragOver = false;
    
    if (event.dataTransfer?.types.includes('application/material-id')) {
      event.preventDefault();
      
      const materialId = event.dataTransfer.getData('application/material-id');
      if (materialId) {
        this.value = materialId;
        this.valueChange.emit(materialId);
        this.updateMaterialColor();
      }
    }
  }
} 