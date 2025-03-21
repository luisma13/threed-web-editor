import { Component, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { Material, MeshStandardMaterial, Color } from 'three';
import { MaterialManagerAdapter } from '../material-manager-adapter.service';

@Component({
  selector: 'app-material-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  template: `
    <div class="material-selector-container">
      <div class="search-container">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Buscar material</mat-label>
          <input matInput [(ngModel)]="searchTerm" (input)="filterMaterials()" placeholder="Buscar...">
          <button *ngIf="searchTerm" matSuffix mat-icon-button aria-label="Clear" (click)="clearSearch()">
            <mat-icon>close</mat-icon>
          </button>
        </mat-form-field>
      </div>
      
      <div class="materials-list">
        <div 
          *ngFor="let material of filteredMaterials" 
          class="material-item"
          [class.selected]="selectedMaterialId === material.id"
          (click)="selectMaterial(material.id)"
          draggable="true"
          (dragstart)="onDragStart($event, material.id)">
          <div class="material-preview" 
               [style.background-color]="getMaterialColor(material.resource)"
               [style.background-image]="getMaterialPreviewStyle(material.id)"
               [style.background-size]="'cover'">
          </div>
          <div class="material-info">
            <div class="material-name">{{ material.name }}</div>
            <div class="material-id">ID: {{ material.id.substring(0, 8) }}...</div>
            <div class="material-type">{{ getMaterialType(material.resource) }}</div>
          </div>
        </div>
        
        <div *ngIf="filteredMaterials.length === 0" class="no-materials">
          No se encontraron materiales
        </div>
      </div>
    </div>
  `,
  styles: [`
    .material-selector-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: #2a2a2a;
      color: #e0e0e0;
    }
    
    .search-container {
      padding: 8px;
    }
    
    .search-field {
      width: 100%;
    }
    
    .materials-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }
    
    .material-item {
      display: flex;
      align-items: center;
      padding: 8px;
      border-radius: 4px;
      margin-bottom: 8px;
      background-color: #3a3a3a;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .material-item:hover {
      background-color: #4a4a4a;
    }
    
    .material-item.selected {
      background-color: #5a5a5a;
      border-left: 3px solid #7b1fa2;
    }
    
    .material-preview {
      width: 32px;
      height: 32px;
      border-radius: 4px;
      margin-right: 12px;
      border: 1px solid #555;
      background-position: center;
      background-repeat: no-repeat;
    }
    
    .material-info {
      flex: 1;
    }
    
    .material-name {
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    .material-id {
      font-size: 11px;
      color: #aaa;
      margin-bottom: 2px;
    }
    
    .material-type {
      font-size: 12px;
      color: #aaa;
    }
    
    .no-materials {
      padding: 16px;
      text-align: center;
      color: #888;
    }
  `]
})
export class MaterialSelectorComponent implements OnInit, OnDestroy {
  @Input() selectedMaterialId: string = '';
  @Output() materialSelected = new EventEmitter<string>();
  
  materials: Array<{ id: string, resource: Material, name: string }> = [];
  filteredMaterials: Array<{ id: string, resource: Material, name: string }> = [];
  searchTerm: string = '';
  
  private materialsSubscription: Subscription | null = null;
  private materialPreviewsSubscription: Subscription | null = null;
  
  constructor(
    private dialog: MatDialog,
    private materialManager: MaterialManagerAdapter
  ) {}
  
  ngOnInit(): void {

  }
  
  ngOnDestroy(): void {
    if (this.materialsSubscription) {
      this.materialsSubscription.unsubscribe();
    }
    
    if (this.materialPreviewsSubscription) {
      this.materialPreviewsSubscription.unsubscribe();
    }
  }
  
  filterMaterials(): void {
    if (!this.searchTerm) {
      this.filteredMaterials = [...this.materials];
      return;
    }
    
    const searchTermLower = this.searchTerm.toLowerCase();
    this.filteredMaterials = this.materials.filter(material => 
      material.name.toLowerCase().includes(searchTermLower) ||
      material.id.toLowerCase().includes(searchTermLower)
    );
  }
  
  clearSearch(): void {
    this.searchTerm = '';
    this.filterMaterials();
  }
  
  selectMaterial(materialId: string): void {
    this.selectedMaterialId = materialId;
    this.materialSelected.emit(materialId);
  }
  
  getMaterialPreviewStyle(materialId: string): string {
    const previewUrl = this.materialManager.getMaterialPreview(materialId);
    if (previewUrl) {
      return `url('${previewUrl}')`;
    }
    return 'none';
  }
  
  onDragStart(event: DragEvent, materialId: string): void {
    if (event.dataTransfer) {
      // Configurar los datos para drag & drop
      event.dataTransfer.setData('application/material-id', materialId);
      event.dataTransfer.effectAllowed = 'copy';
      
      // Opcional: crear una imagen personalizada para el arrastre
      const dragImage = document.createElement('div');
      dragImage.textContent = materialId;
      dragImage.style.backgroundColor = '#3a3a3a';
      dragImage.style.color = '#fff';
      dragImage.style.padding = '8px';
      dragImage.style.borderRadius = '4px';
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-1000px';
      document.body.appendChild(dragImage);
      
      event.dataTransfer.setDragImage(dragImage, 0, 0);
      
      // Eliminar el elemento después de un breve retraso
      setTimeout(() => {
        document.body.removeChild(dragImage);
      }, 100);
    }
  }
  
  getMaterialColor(material: Material): string {
    // Verificar si es un MeshStandardMaterial con color
    if (material instanceof MeshStandardMaterial && material.color instanceof Color) {
      return `#${material.color.getHexString()}`;
    }
    return '#cccccc'; // Color por defecto
  }
  
  getMaterialType(material: Material): string {
    // Devolver el tipo de material
    return material.type;
  }
} 