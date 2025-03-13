import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MaterialSelectorComponent } from './material-selector.component';

export interface MaterialSelectorDialogData {
  currentMaterialId: string;
}

@Component({
  selector: 'app-material-selector-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MaterialSelectorComponent
  ],
  template: `
    <div class="material-selector-dialog">
      <h2 mat-dialog-title>Seleccionar Material</h2>
      
      <mat-dialog-content>
        <app-material-selector
          [selectedMaterialId]="selectedMaterialId"
          (materialSelected)="onMaterialSelected($event)">
        </app-material-selector>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancelar</button>
        <button mat-button color="primary" [disabled]="!selectedMaterialId" (click)="onConfirm()">Seleccionar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .material-selector-dialog {
      min-width: 400px;
      max-width: 600px;
    }
    
    mat-dialog-content {
      height: 400px;
      overflow: hidden;
    }
  `]
})
export class MaterialSelectorDialogComponent {
  selectedMaterialId: string = '';
  
  constructor(
    public dialogRef: MatDialogRef<MaterialSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MaterialSelectorDialogData
  ) {
    // Inicializar con el material actual si existe
    if (data && data.currentMaterialId) {
      this.selectedMaterialId = data.currentMaterialId;
    }
  }
  
  onMaterialSelected(materialId: string): void {
    this.selectedMaterialId = materialId;
  }
  
  onCancel(): void {
    this.dialogRef.close();
  }
  
  onConfirm(): void {
    this.dialogRef.close(this.selectedMaterialId);
  }
} 