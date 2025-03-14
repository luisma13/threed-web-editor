import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export interface PanelDimensions {
  hierarchyHeight?: number;
  resourcesHeight?: number;
  leftSidebarWidth?: number;
  rightSidebarWidth?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ResizablePanelService {
  // Valores predeterminados
  private readonly DEFAULT_SIDEBAR_WIDTH = 300;
  private readonly DEFAULT_HIERARCHY_RATIO = 0.7;
  private readonly MIN_PANEL_HEIGHT = 100;
  private readonly MIN_PANEL_WIDTH = 200;
  private readonly MIN_VIEWPORT_WIDTH = 400;
  private readonly DIVIDER_HEIGHT = 8;

  // Sujeto observable para las dimensiones de los paneles
  private dimensionsSubject = new BehaviorSubject<PanelDimensions>({
    leftSidebarWidth: this.DEFAULT_SIDEBAR_WIDTH,
    rightSidebarWidth: this.DEFAULT_SIDEBAR_WIDTH
  });

  // Observable público para las dimensiones
  public dimensions$ = this.dimensionsSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // Cargar dimensiones guardadas al iniciar el servicio
    this.loadSavedDimensions();
  }

  /**
   * Carga las dimensiones guardadas desde localStorage
   */
  private loadSavedDimensions(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const savedDimensions = localStorage.getItem('editorPanelDimensions');
      if (savedDimensions) {
        const dimensions = JSON.parse(savedDimensions);
        this.dimensionsSubject.next(dimensions);
      }
    } catch (error) {
      console.error('Error al cargar dimensiones guardadas:', error);
    }
  }

  /**
   * Guarda las dimensiones actuales en localStorage
   * @param dimensions Dimensiones a guardar
   */
  public saveDimensions(dimensions: PanelDimensions): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      localStorage.setItem('editorPanelDimensions', JSON.stringify(dimensions));
      this.dimensionsSubject.next(dimensions);
    } catch (error) {
      console.error('Error al guardar dimensiones:', error);
    }
  }

  /**
   * Actualiza las dimensiones de los paneles
   * @param dimensions Dimensiones parciales a actualizar
   */
  public updateDimensions(dimensions: Partial<PanelDimensions>): void {
    const currentDimensions = this.dimensionsSubject.value;
    const updatedDimensions = { ...currentDimensions, ...dimensions };
    this.dimensionsSubject.next(updatedDimensions);
  }

  /**
   * Calcula las alturas de los paneles de jerarquía y recursos
   * @param totalHeight Altura total disponible
   * @returns Objeto con las alturas calculadas
   */
  public calculatePanelHeights(totalHeight: number): { hierarchyHeight: number, resourcesHeight: number } {
    const dividerHeight = this.DIVIDER_HEIGHT;
    const hierarchyHeight = Math.floor((totalHeight - dividerHeight) * this.DEFAULT_HIERARCHY_RATIO);
    const resourcesHeight = totalHeight - hierarchyHeight - dividerHeight;
    
    return {
      hierarchyHeight: Math.max(this.MIN_PANEL_HEIGHT, hierarchyHeight),
      resourcesHeight: Math.max(this.MIN_PANEL_HEIGHT, resourcesHeight)
    };
  }

  /**
   * Ajusta las alturas de los paneles para que no excedan el espacio disponible
   * @param hierarchyHeight Altura del panel de jerarquía
   * @param resourcesHeight Altura del panel de recursos
   * @param totalHeight Altura total disponible
   * @returns Objeto con las alturas ajustadas
   */
  public adjustPanelHeights(hierarchyHeight: number, resourcesHeight: number, totalHeight: number): { hierarchyHeight: number, resourcesHeight: number } {
    const minHeight = this.MIN_PANEL_HEIGHT;
    const dividerHeight = this.DIVIDER_HEIGHT;
    
    // Calcular las alturas ajustadas
    let adjustedHierarchyHeight = Math.max(minHeight, hierarchyHeight);
    let adjustedResourcesHeight = Math.max(minHeight, resourcesHeight);
    
    // Ajustar si las alturas combinadas exceden el espacio disponible
    const totalRequiredHeight = adjustedHierarchyHeight + adjustedResourcesHeight + dividerHeight;
    if (totalRequiredHeight > totalHeight) {
      // Reducir proporcionalmente ambas alturas
      const ratio = (totalHeight - dividerHeight) / (adjustedHierarchyHeight + adjustedResourcesHeight);
      adjustedHierarchyHeight = Math.max(minHeight, Math.floor(adjustedHierarchyHeight * ratio));
      adjustedResourcesHeight = Math.max(minHeight, Math.floor(adjustedResourcesHeight * ratio));
    }
    
    return {
      hierarchyHeight: adjustedHierarchyHeight,
      resourcesHeight: adjustedResourcesHeight
    };
  }

  /**
   * Ajusta los anchos de los sidebars para que no excedan el espacio disponible
   * @param leftWidth Ancho del sidebar izquierdo
   * @param rightWidth Ancho del sidebar derecho
   * @param totalWidth Ancho total disponible
   * @returns Objeto con los anchos ajustados
   */
  public adjustSidebarWidths(leftWidth: number, rightWidth: number, totalWidth: number): { leftWidth: number, rightWidth: number } {
    const minWidth = this.MIN_PANEL_WIDTH;
    const minViewportWidth = this.MIN_VIEWPORT_WIDTH;
    
    // Calcular los anchos ajustados
    let adjustedLeftWidth = Math.max(minWidth, leftWidth);
    let adjustedRightWidth = Math.max(minWidth, rightWidth);
    
    // Asegurarse de que quede espacio para el viewport
    const availableWidth = totalWidth - adjustedLeftWidth - adjustedRightWidth;
    if (availableWidth < minViewportWidth) {
      // Reducir proporcionalmente ambos anchos
      const excessWidth = minViewportWidth - availableWidth;
      const ratio = excessWidth / (adjustedLeftWidth + adjustedRightWidth);
      adjustedLeftWidth = Math.max(minWidth, Math.floor(adjustedLeftWidth * (1 - ratio)));
      adjustedRightWidth = Math.max(minWidth, Math.floor(adjustedRightWidth * (1 - ratio)));
    }
    
    return {
      leftWidth: adjustedLeftWidth,
      rightWidth: adjustedRightWidth
    };
  }

  /**
   * Obtiene las dimensiones predeterminadas
   * @returns Dimensiones predeterminadas
   */
  public getDefaultDimensions(): PanelDimensions {
    return {
      leftSidebarWidth: this.DEFAULT_SIDEBAR_WIDTH,
      rightSidebarWidth: this.DEFAULT_SIDEBAR_WIDTH
    };
  }
}
