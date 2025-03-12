import { Injectable } from '@angular/core';
import { ContextMenuComponent, ContextType } from './context-menu.component';

@Injectable({
  providedIn: 'root'
})
export class ContextMenuService {
  private contextMenuComponent: ContextMenuComponent;

  constructor() {}

  /**
   * Registra el componente de menú contextual
   * @param component Componente de menú contextual
   */
  registerContextMenu(component: ContextMenuComponent): void {
    this.contextMenuComponent = component;
  }

  /**
   * Muestra el menú contextual
   * @param event Evento del mouse
   * @param type Tipo de contexto
   * @param contextObject Objeto de contexto
   */
  showContextMenu(event: MouseEvent, type: ContextType, contextObject: any = null): void {
    console.log('ContextMenuService.showContextMenu:', type, contextObject?.name || contextObject?.constructor?.name);
    
    if (this.contextMenuComponent) {
      this.contextMenuComponent.showContextMenu(event, type, contextObject);
    } else {
      console.warn('ContextMenuComponent no registrado en ContextMenuService');
    }
  }
} 