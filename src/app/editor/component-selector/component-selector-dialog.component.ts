import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

export interface ComponentInfo {
  name: string;
  description: string;
  icon: string;
  type: any; // Constructor del componente
}

@Component({
  selector: 'app-component-selector-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatTooltipModule,
    FormsModule,
    MatInputModule,
    MatFormFieldModule
  ],
  template: `
    <h2 mat-dialog-title>Añadir Componente</h2>
    <div mat-dialog-content>
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Buscar componente</mat-label>
        <input matInput [(ngModel)]="searchText" (ngModelChange)="onSearchChange()" placeholder="Escribe para buscar...">
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
      
      <mat-list class="component-list">
        <mat-list-item *ngFor="let component of filteredComponents" 
                      (click)="selectComponent(component)"
                      [class.selected]="selectedComponent === component">
          <mat-icon matListItemIcon>{{component.icon}}</mat-icon>
          <div matListItemTitle>{{component.name}}</div>
          <div matListItemLine class="component-description">{{component.description}}</div>
        </mat-list-item>
        <div *ngIf="filteredComponents.length === 0" class="no-results">
          No se encontraron componentes que coincidan con la búsqueda
        </div>
      </mat-list>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button color="primary" 
              [disabled]="!selectedComponent" 
              (click)="onConfirm()">
        Añadir
      </button>
    </div>
  `,
  styles: [`
    .search-field {
      width: 100%;
      margin-bottom: 16px;
    }
    
    .component-list {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #444;
      border-radius: 4px;
    }
    
    .mat-mdc-list-item {
      cursor: pointer;
      border-bottom: 1px solid #444;
    }
    
    .mat-mdc-list-item:hover {
      background-color: rgba(74, 144, 226, 0.1);
    }
    
    .mat-mdc-list-item.selected {
      background-color: rgba(74, 144, 226, 0.2);
    }
    
    .component-description {
      color: #999;
      font-size: 12px;
      margin-top: 4px;
    }
    
    h2 {
      margin-bottom: 16px;
    }
    
    .no-results {
      padding: 16px;
      text-align: center;
      color: #999;
    }
  `]
})
export class ComponentSelectorDialogComponent {
  components: ComponentInfo[] = [];
  filteredComponents: ComponentInfo[] = [];
  selectedComponent: ComponentInfo | null = null;
  searchText: string = '';

  constructor(
    public dialogRef: MatDialogRef<ComponentSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { components: ComponentInfo[] }
  ) {
    this.components = data.components;
    this.filteredComponents = [...this.components];
  }

  ngOnInit() {
    // Inicializar la lista filtrada
    this.filteredComponents = [...this.components];
  }

  onSearchChange() {
    if (!this.searchText) {
      this.filteredComponents = [...this.components];
    } else {
      const searchLower = this.searchText.toLowerCase();
      this.filteredComponents = this.components.filter(component => 
        component.name.toLowerCase().includes(searchLower) || 
        component.description.toLowerCase().includes(searchLower)
      );
    }
  }

  selectComponent(component: ComponentInfo) {
    this.selectedComponent = component;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.selectedComponent) {
      this.dialogRef.close(this.selectedComponent);
    }
  }
} 