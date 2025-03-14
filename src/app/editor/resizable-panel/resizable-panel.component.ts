import { Component, ElementRef, EventEmitter, HostListener, Inject, Input, OnDestroy, OnInit, Output, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ResizablePanelService, PanelDimensions } from './resizable-panel.service';
import { engine } from '../../simple-engine/core/engine/engine';
import { Subscription } from 'rxjs';

export type DividerType = 'horizontal' | 'vertical-left' | 'vertical-right';

@Component({
  selector: 'app-resizable-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resizable-panel.component.html',
  styleUrl: './resizable-panel.component.scss'
})
export class ResizablePanelComponent implements OnInit, OnDestroy {
  @Input() type: DividerType = 'horizontal';
  @Input() containerSelector: string;
  @Input() leftPanelSelector: string;
  @Input() rightPanelSelector: string;
  @Input() topPanelSelector: string;
  @Input() bottomPanelSelector: string;
  @Input() viewportSelector: string;
  
  @Output() dimensionsChanged = new EventEmitter<void>();
  
  private isDragging = false;
  private initialMouseX = 0;
  private initialMouseY = 0;
  private initialLeftWidth = 0;
  private initialRightWidth = 0;
  private initialTopHeight = 0;
  private initialBottomHeight = 0;
  private totalHeight = 0;
  private totalWidth = 0;
  
  private leftPanel: HTMLElement | null = null;
  private rightPanel: HTMLElement | null = null;
  private topPanel: HTMLElement | null = null;
  private bottomPanel: HTMLElement | null = null;
  private container: HTMLElement | null = null;
  
  private subscription: Subscription;
  private currentDimensions: PanelDimensions = {};
  
  constructor(
    private resizablePanelService: ResizablePanelService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}
  
  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    this.initializePanels();
    
    // Suscribirse a cambios en las dimensiones
    this.subscription = this.resizablePanelService.dimensions$.subscribe(dimensions => {
      this.currentDimensions = dimensions;
      this.updatePanelDimensions();
    });
  }
  
  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
  
  /**
   * Inicializa las referencias a los paneles
   */
  private initializePanels(): void {
    if (this.type === 'horizontal') {
      this.topPanel = document.querySelector(this.topPanelSelector);
      this.bottomPanel = document.querySelector(this.bottomPanelSelector);
      this.container = this.topPanel?.parentElement || null;
      
      if (!this.topPanel || !this.bottomPanel || !this.container) {
        console.error('No se pudieron encontrar los paneles para el divisor horizontal');
        return;
      }
      
      this.totalHeight = this.container.offsetHeight;
      
      // Aplicar dimensiones iniciales
      const dimensions = this.resizablePanelService.calculatePanelHeights(this.totalHeight);
      this.applyVerticalDimensions(dimensions.hierarchyHeight, dimensions.resourcesHeight);
    } else {
      // Para divisores verticales
      this.leftPanel = document.querySelector(this.leftPanelSelector);
      this.rightPanel = document.querySelector(this.rightPanelSelector);
      this.container = document.querySelector(this.containerSelector);
      
      if (!this.container) {
        console.error('No se pudo encontrar el contenedor para el divisor vertical');
        return;
      }
      
      this.totalWidth = this.container.clientWidth;
      
      // Aplicar dimensiones iniciales según el tipo de divisor
      if (this.type === 'vertical-left' && this.leftPanel) {
        const leftWidth = this.currentDimensions.leftSidebarWidth || 300;
        this.leftPanel.style.width = `${leftWidth}px`;
      } else if (this.type === 'vertical-right' && this.rightPanel) {
        const rightWidth = this.currentDimensions.rightSidebarWidth || 300;
        this.rightPanel.style.width = `${rightWidth}px`;
      }
    }
  }
  
  /**
   * Actualiza las dimensiones de los paneles según el servicio
   */
  private updatePanelDimensions(): void {
    if (this.type === 'horizontal' && this.topPanel && this.bottomPanel) {
      if (this.currentDimensions.hierarchyHeight && this.currentDimensions.resourcesHeight) {
        this.applyVerticalDimensions(this.currentDimensions.hierarchyHeight, this.currentDimensions.resourcesHeight);
      }
    } else if (this.type === 'vertical-left' && this.leftPanel) {
      if (this.currentDimensions.leftSidebarWidth) {
        this.leftPanel.style.width = `${this.currentDimensions.leftSidebarWidth}px`;
      }
    } else if (this.type === 'vertical-right' && this.rightPanel) {
      if (this.currentDimensions.rightSidebarWidth) {
        this.rightPanel.style.width = `${this.currentDimensions.rightSidebarWidth}px`;
      }
    }
    
    // Notificar que las dimensiones han cambiado
    this.dimensionsChanged.emit();
  }
  
  /**
   * Aplica dimensiones verticales a los paneles
   */
  private applyVerticalDimensions(topHeight: number, bottomHeight: number): void {
    if (!this.topPanel || !this.bottomPanel) return;
    
    this.topPanel.style.flex = 'none';
    this.topPanel.style.height = `${topHeight}px`;
    this.bottomPanel.style.height = `${bottomHeight}px`;
  }
  
  /**
   * Inicia el arrastre del divisor
   */
  public startDrag(event: MouseEvent): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    event.preventDefault();
    this.isDragging = true;
    
    // Guardar la posición inicial del mouse
    this.initialMouseX = event.clientX;
    this.initialMouseY = event.clientY;
    
    // Guardar las dimensiones iniciales según el tipo de divisor
    if (this.type === 'horizontal' && this.topPanel && this.bottomPanel) {
      this.initialTopHeight = this.topPanel.offsetHeight;
      this.initialBottomHeight = this.bottomPanel.offsetHeight;
      this.totalHeight = this.initialTopHeight + this.initialBottomHeight;
    } else if (this.type === 'vertical-left' && this.leftPanel) {
      this.initialLeftWidth = this.leftPanel.offsetWidth;
    } else if (this.type === 'vertical-right' && this.rightPanel) {
      this.initialRightWidth = this.rightPanel.offsetWidth;
    }
    
    // Añadir eventos temporales para el arrastre
    document.addEventListener('mousemove', this.onDrag);
    document.addEventListener('mouseup', this.stopDrag);
  }
  
  /**
   * Maneja el arrastre del divisor
   */
  private onDrag = (event: MouseEvent): void => {
    if (!this.isDragging) return;
    
    if (this.type === 'horizontal') {
      this.handleHorizontalDrag(event);
    } else if (this.type === 'vertical-left') {
      this.handleVerticalLeftDrag(event);
    } else if (this.type === 'vertical-right') {
      this.handleVerticalRightDrag(event);
    }
  }
  
  /**
   * Maneja el arrastre horizontal (ajuste de altura)
   */
  private handleHorizontalDrag(event: MouseEvent): void {
    if (!this.topPanel || !this.bottomPanel || !this.container) return;
    
    // Calcular la posición relativa del ratón dentro del contenedor
    const containerRect = this.container.getBoundingClientRect();
    const relativeY = Math.max(0, Math.min(event.clientY - containerRect.top, containerRect.height));
    
    // Calcular las nuevas alturas
    const minHeight = 100; // Altura mínima en píxeles
    const dividerHeight = 8; // Altura del divisor
    const maxTopHeight = containerRect.height - minHeight - dividerHeight;
    
    // Limitar la altura del panel superior entre minHeight y maxTopHeight
    let newTopHeight = Math.max(minHeight, Math.min(relativeY, maxTopHeight));
    
    // La altura del panel inferior es el resto del espacio disponible menos la altura del divisor
    let newBottomHeight = containerRect.height - newTopHeight - dividerHeight;
    
    // Aplicar las nuevas alturas
    this.applyVerticalDimensions(newTopHeight, newBottomHeight);
    
    // Actualizar el motor para que se ajuste al nuevo tamaño del viewport
    this.updateEngineViewport();
  }
  
  /**
   * Maneja el arrastre vertical del panel izquierdo
   */
  private handleVerticalLeftDrag(event: MouseEvent): void {
    if (!this.leftPanel || !this.container) return;
    
    // Calcular el desplazamiento del mouse
    const deltaX = event.clientX - this.initialMouseX;
    
    // Calcular el nuevo ancho
    const minWidth = 200; // Ancho mínimo en píxeles
    const maxWidth = window.innerWidth - 600; // Ancho máximo (dejar espacio para el viewport y el panel derecho)
    
    // Limitar el ancho entre minWidth y maxWidth
    let newWidth = Math.max(minWidth, Math.min(this.initialLeftWidth + deltaX, maxWidth));
    
    // Aplicar el nuevo ancho
    this.leftPanel.style.width = `${newWidth}px`;
    
    // Actualizar el motor para que se ajuste al nuevo tamaño del viewport
    this.updateEngineViewport();
  }
  
  /**
   * Maneja el arrastre vertical del panel derecho
   */
  private handleVerticalRightDrag(event: MouseEvent): void {
    if (!this.rightPanel || !this.container) return;
    
    // Calcular el desplazamiento del mouse
    const deltaX = event.clientX - this.initialMouseX;
    
    // Calcular el nuevo ancho (negativo porque se arrastra desde la izquierda)
    const minWidth = 200; // Ancho mínimo en píxeles
    const maxWidth = window.innerWidth - 600; // Ancho máximo (dejar espacio para el viewport y el panel izquierdo)
    
    // Limitar el ancho entre minWidth y maxWidth
    let newWidth = Math.max(minWidth, Math.min(this.initialRightWidth - deltaX, maxWidth));
    
    // Aplicar el nuevo ancho
    this.rightPanel.style.width = `${newWidth}px`;
    
    // Actualizar el motor para que se ajuste al nuevo tamaño del viewport
    this.updateEngineViewport();
  }
  
  /**
   * Detiene el arrastre del divisor
   */
  private stopDrag = (): void => {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    
    // Eliminar los eventos temporales
    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('mouseup', this.stopDrag);
    
    // Guardar las dimensiones actuales
    this.saveDimensions();
    
    // Asegurarse de que el motor se actualice correctamente después de terminar el arrastre
    setTimeout(() => {
      this.updateEngineViewport();
    }, 0);
  }
  
  /**
   * Guarda las dimensiones actuales
   */
  private saveDimensions(): void {
    const dimensions: Partial<PanelDimensions> = {};
    
    if (this.type === 'horizontal' && this.topPanel && this.bottomPanel) {
      dimensions.hierarchyHeight = this.topPanel.offsetHeight;
      dimensions.resourcesHeight = this.bottomPanel.offsetHeight;
    } else if (this.type === 'vertical-left' && this.leftPanel) {
      dimensions.leftSidebarWidth = this.leftPanel.offsetWidth;
    } else if (this.type === 'vertical-right' && this.rightPanel) {
      dimensions.rightSidebarWidth = this.rightPanel.offsetWidth;
    }
    
    this.resizablePanelService.updateDimensions(dimensions);
    this.resizablePanelService.saveDimensions({
      ...this.currentDimensions,
      ...dimensions
    });
  }
  
  /**
   * Actualiza el viewport del motor para que coincida con el tamaño actual del contenedor
   */
  private updateEngineViewport(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    const viewportElement = document.querySelector(this.viewportSelector);
    if (viewportElement && engine.scene && engine.camera) {
      // Asegurarse de que el contenedor del renderer esté configurado correctamente
      engine.rendererContainer = viewportElement as HTMLElement;
      // Forzar una actualización del tamaño del motor
      engine.onResize();
    }
  }
  
  @HostListener('window:resize')
  onWindowResize(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    // Recalcular dimensiones totales
    if (this.container) {
      if (this.type === 'horizontal') {
        this.totalHeight = this.container.offsetHeight;
      } else {
        this.totalWidth = this.container.clientWidth;
      }
    }
    
    // Actualizar el motor solo si la escena y la cámara están inicializadas
    if (engine.scene && engine.camera) {
      this.updateEngineViewport();
    }
  }
} 