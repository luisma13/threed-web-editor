import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { MaterialSelectorDialogComponent, MaterialSelectorDialogData } from './material-selector-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class MaterialSelectorService {
  constructor(private dialog: MatDialog) {}
  
  /**
   * Abre un diálogo para seleccionar un material
   * @param currentMaterialId ID del material actualmente seleccionado (opcional)
   * @returns Observable que emite el ID del material seleccionado o undefined si se cancela
   */
  openMaterialSelector(currentMaterialId?: string): Observable<string | undefined> {
    const dialogData: MaterialSelectorDialogData = {
      currentMaterialId: currentMaterialId || ''
    };
    
    return this.dialog.open(MaterialSelectorDialogComponent, {
      width: '500px',
      data: dialogData,
      panelClass: 'material-selector-dialog-panel'
    }).afterClosed();
  }
} 