import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SceneSerializer } from '../simple-engine/utils/scene-serializer';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class SceneExportService {
  private sceneSerializer: SceneSerializer;

  constructor(
    private snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Solo crear el serializador si estamos en el navegador
    if (isPlatformBrowser(this.platformId)) {
      this.sceneSerializer = new SceneSerializer();
    }
  }

  /**
   * Exporta la escena actual a un archivo
   * @param sceneName Nombre de la escena
   */
  public async exportScene(sceneName: string): Promise<void> {
    // Verificar que estamos en el navegador
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      await this.sceneSerializer.exportScene(sceneName);
      this.showNotification('Escena exportada correctamente');
    } catch (error) {
      console.error('Error al exportar la escena:', error);
      this.showNotification('Error al exportar la escena', true);
    }
  }

  /**
   * Importa una escena desde un archivo
   * @param file Archivo de escena
   */
  public async importScene(file: File): Promise<void> {
    // Verificar que estamos en el navegador
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      await this.sceneSerializer.importScene(file);
      this.showNotification('Escena importada correctamente');
    } catch (error) {
      console.error('Error al importar la escena:', error);
      this.showNotification('Error al importar la escena', true);
    }
  }

  /**
   * Muestra una notificación
   * @param message Mensaje a mostrar
   * @param isError Indica si es un error
   */
  private showNotification(message: string, isError: boolean = false): void {
    // Verificar que estamos en el navegador
    if (!isPlatformBrowser(this.platformId)) return;

    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: isError ? ['error-snackbar'] : ['success-snackbar']
    });
  }
} 