import { Component, Inject, HostListener, ViewChild, ElementRef, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Texture, TextureEncoding, Wrapping } from 'three';
import { PLATFORM_ID, Inject as NgInject } from '@angular/core';
import { TextureManagerAdapter } from '../texture-manager-adapter.service';

export interface TextureDialogData {
    isEdit: boolean;
    path?: string;
    texture?: Texture;
}

@Component({
    standalone: true,
    selector: 'app-texture-dialog',
    templateUrl: './texture-dialog.component.html',
    styleUrls: ['./texture-dialog.component.scss'],
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule
    ]
})
export class TextureDialogComponent implements OnInit, OnDestroy {
    texturePath: string = '';
    textureUrl: string = '';
    previewUrl: string | null = null;
    wrapS: Wrapping = 1000; // THREE.RepeatWrapping
    wrapT: Wrapping = 1000; // THREE.RepeatWrapping
    encoding: TextureEncoding = 3000; // THREE.LinearEncoding
    generateMipmaps: boolean = true;
    flipY: boolean = true;
    
    // Store the selected file
    selectedFile: File | null = null;
    
    // Drag and drop state
    isDragging: boolean = false;
    
    // Referencia al input de archivo
    @ViewChild('fileInput') fileInput!: ElementRef;
    
    // Propiedad para indicar si se debe mantener la imagen original
    keepOriginalImage = false;
    
    private styleElement: HTMLStyleElement | null = null;
    private isBrowser: boolean;
    
    // Variable para rastrear si creamos un blob URL en este componente
    private createdBlobUrl: boolean = false;

    constructor(
        public dialogRef: MatDialogRef<TextureDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: TextureDialogData,
        @NgInject(PLATFORM_ID) platformId: Object,
        private changeDetectorRef: ChangeDetectorRef,
        private textureManager: TextureManagerAdapter
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
        
        if (data.isEdit && data.texture) {
            this.texturePath = data.path || '';
            
            // Set texture properties from the existing texture
            this.wrapS = data.texture.wrapS;
            this.wrapT = data.texture.wrapT;
            
            // Force encoding to be a number and ensure it's properly set
            const encodingValue = Number(data.texture.encoding);
            this.encoding = encodingValue as TextureEncoding;
            
            console.log('Raw texture encoding value:', data.texture.encoding);
            console.log('Converted encoding value:', encodingValue);
            console.log('Setting encoding to:', this.encoding);
            
            this.generateMipmaps = data.texture.generateMipmaps;
            this.flipY = data.texture.flipY;
            
            // Obtener la URL de previsualización de la textura usando el servicio
            this.previewUrl = this.textureManager.getTexturePreviewUrl(data.texture);
            
            if (this.previewUrl) {
                console.log('Preview URL obtained successfully');
            } else {
                console.log('No preview URL could be obtained for texture');
            }
            
            // Forzar la detección de cambios para actualizar la UI
            this.forcePreviewUpdate();
        }
    }

    ngOnInit(): void {
        if (!this.isBrowser) return;
        
        // Añadir estilos globales para el panel del diálogo
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .texture-dialog-panel {
                background-color: #333 !important;
                border-radius: 8px !important;
                overflow: hidden !important;
            }
            
            .texture-dialog-panel .mat-mdc-dialog-container {
                padding: 0 !important;
                overflow: hidden !important;
            }
            
            .texture-dialog-panel .mat-mdc-dialog-surface {
                background-color: #333 !important;
                color: #e0e0e0 !important;
            }
        `;
        document.head.appendChild(styleElement);
        this.styleElement = styleElement;
        
        // Configurar el panel del diálogo
        this.dialogRef.addPanelClass('texture-dialog-panel');
    }

    ngOnDestroy(): void {
        if (!this.isBrowser) return;
        
        // Limpiar URL de vista previa solo si fue creada por este componente
        if (this.previewUrl && this.previewUrl.startsWith('blob:') && this.createdBlobUrl) {
            console.log('Revocando blob URL al destruir componente:', this.previewUrl);
            URL.revokeObjectURL(this.previewUrl);
        }
        
        // Eliminar estilos globales
        if (this.styleElement) {
            document.head.removeChild(this.styleElement);
        }
    }

    /**
     * Abre el selector de archivos
     */
    openFileSelector(): void {
        this.fileInput.nativeElement.click();
    }

    /**
     * Maneja la selección de un archivo
     */
    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            this.handleFile(file);
        }
    }

    /**
     * Fuerza la actualización de la previsualización
     */
    private forcePreviewUpdate(): void {
        // Usar setTimeout para asegurar que la actualización ocurre después de que Angular haya procesado otros cambios
        setTimeout(() => {
            this.changeDetectorRef.detectChanges();
            console.log('Forced preview update');
        }, 0);
    }

    /**
     * Maneja el cambio de URL
     */
    onUrlChange(): void {
        if (this.textureUrl) {
            // Revocar el blob URL anterior si existe y fue creado por este componente
            if (this.previewUrl && this.previewUrl.startsWith('blob:') && this.createdBlobUrl) {
                URL.revokeObjectURL(this.previewUrl);
                this.createdBlobUrl = false;
            }
            
            // Usar directamente la URL como previsualización sin crear una imagen para probarla
            this.previewUrl = this.textureUrl;
            this.texturePath = this.getFileNameFromUrl(this.textureUrl);
            this.keepOriginalImage = false; // Se ha seleccionado una nueva URL
            
            // Forzar la actualización de la previsualización
            this.forcePreviewUpdate();
        } else {
            // Revocar el blob URL anterior si existe y fue creado por este componente
            if (this.previewUrl && this.previewUrl.startsWith('blob:') && this.createdBlobUrl) {
                URL.revokeObjectURL(this.previewUrl);
                this.createdBlobUrl = false;
            }
            this.previewUrl = null;
            
            // Forzar la actualización de la previsualización
            this.forcePreviewUpdate();
        }
    }

    /**
     * Obtiene el nombre de archivo de una URL
     */
    private getFileNameFromUrl(url: string): string {
        const urlParts = url.split('/');
        return urlParts[urlParts.length - 1] || `texture_${Date.now()}.jpg`;
    }

    /**
     * Maneja el evento de arrastrar sobre la zona de drop
     */
    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = true;
    }

    /**
     * Maneja el evento de salir de la zona de drop
     */
    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
    }

    /**
     * Maneja el evento de soltar en la zona de drop
     */
    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
        
        if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
            const file = event.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                this.handleFile(file);
                // No es necesario forzar la actualización aquí porque handleFile ya lo hace
            } else {
                console.warn('El archivo arrastrado no es una imagen:', file.type);
                // Forzar la actualización de la previsualización
                this.forcePreviewUpdate();
            }
        } else {
            // Forzar la actualización de la previsualización
            this.forcePreviewUpdate();
        }
    }

    /**
     * Procesa un archivo seleccionado o arrastrado
     */
    private handleFile(file: File): void {
        if (!file.type.startsWith('image/')) {
            console.warn('El archivo seleccionado no es una imagen:', file.type);
            return;
        }
        
        this.selectedFile = file;
        this.texturePath = file.name;
        
        // Revocar el blob URL anterior si existe y fue creado por este componente
        if (this.previewUrl && this.previewUrl.startsWith('blob:') && this.createdBlobUrl) {
            URL.revokeObjectURL(this.previewUrl);
        }
        
        // Crear una nueva URL de blob para la vista previa
        this.previewUrl = URL.createObjectURL(file);
        this.createdBlobUrl = true; // Marcar que hemos creado un blob URL
        this.keepOriginalImage = false; // Se ha seleccionado un nuevo archivo
        
        // Forzar la actualización de la previsualización
        this.forcePreviewUpdate();
    }

    /**
     * Verifica si el formulario es válido
     */
    isFormValid(): boolean {
        // Si estamos editando, siempre es válido
        if (this.data.isEdit) return true;
        
        // Necesitamos un archivo seleccionado o una URL válida
        return !!this.selectedFile || (!!this.textureUrl && !!this.previewUrl);
    }

    /**
     * Detiene la propagación de eventos de clic para evitar que interactúen con la escena
     */
    stopPropagation(event: MouseEvent): void {
        event.stopPropagation();
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onConfirm(): void {
        // Force encoding to be a number and ensure it's properly typed
        const encodingValue = Number(this.encoding) as TextureEncoding;
        
        // Datos básicos que siempre se envían
        const result = {
            isEdit: this.data.isEdit,
            path: this.data.isEdit ? this.data.path : this.texturePath,
            originalPath: this.data.path, // Añadir el path original para referencia
            wrapS: this.wrapS,
            wrapT: this.wrapT,
            encoding: encodingValue,
            generateMipmaps: this.generateMipmaps,
            flipY: this.flipY
        };
        
        // Si estamos editando y no se ha seleccionado un nuevo archivo ni URL
        if (this.data.isEdit && !this.selectedFile && !this.textureUrl) {
            this.dialogRef.close({
                ...result,
                keepOriginalImage: true
            });
        } else {
            this.dialogRef.close({
                ...result,
                file: this.selectedFile,
                url: this.textureUrl,
                previewUrl: this.previewUrl,
                keepOriginalImage: false
            });
        }
    }
} 