import { Component, Inject, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TextureManagerAdapter } from '../texture-manager-adapter.service';

@Component({
    standalone: true,
    selector: 'app-texture-selection-dialog',
    templateUrl: './texture-selection-dialog.component.html',
    styleUrls: ['./texture-selection-dialog.component.scss'],
    imports: [
        CommonModule,
        MatDialogModule,
        MatListModule,
        MatButtonModule,
        MatInputModule,
        MatFormFieldModule,
        MatIconModule,
        MatTooltipModule,
        FormsModule
    ]
})
export class TextureSelectionDialogComponent implements OnInit, OnDestroy {
    @ViewChild('textureList') textureList: any;
    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
    
    activeTab: 'existing' | 'url' | 'upload' = 'existing';
    textureUrl: string = '';
    urlError: string | null = null;
    urlValid: boolean = false;
    
    selectedFile: File | null = null;
    filePreviewUrl: string | null = null;
    isDragging: boolean = false;
    
    private styleElement: HTMLStyleElement | null = null;

    constructor(
        public dialogRef: MatDialogRef<TextureSelectionDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { textures: string[] },
        private textureManager: TextureManagerAdapter
    ) {}

    ngOnInit(): void {
        // Añadir estilos globales para el panel del diálogo
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .texture-selection-dialog {
                background-color: #333 !important;
                border-radius: 8px !important;
                overflow: hidden !important;
            }
            
            .texture-selection-dialog .mat-mdc-dialog-container {
                padding: 0 !important;
                overflow: hidden !important;
            }
            
            .texture-selection-dialog .mat-mdc-dialog-surface {
                background-color: #333 !important;
                color: #e0e0e0 !important;
            }
        `;
        document.head.appendChild(styleElement);
        this.styleElement = styleElement;
        
        // Configurar el panel del diálogo
        this.dialogRef.addPanelClass('texture-selection-dialog');
    }

    ngOnDestroy(): void {
        // Limpiar URL de vista previa
        if (this.filePreviewUrl) {
            URL.revokeObjectURL(this.filePreviewUrl);
        }
        
        // Eliminar estilos globales
        if (this.styleElement) {
            document.head.removeChild(this.styleElement);
        }
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onConfirm(): void {
        if (this.activeTab === 'existing' && this.textureList?.selectedOptions?.selected?.length) {
            this.dialogRef.close(this.textureList.selectedOptions.selected[0].value);
        } else if (this.activeTab === 'url' && this.textureUrl && this.urlValid) {
            // Crear un nombre para la textura basado en la URL
            const urlParts = this.textureUrl.split('/');
            const fileName = urlParts[urlParts.length - 1] || `texture_${Date.now()}.jpg`;
            
            // Cargar la textura desde la URL
            this.loadTextureFromUrl(this.textureUrl, fileName);
        } else if (this.activeTab === 'upload' && this.selectedFile) {
            // Cargar la textura desde el archivo
            this.loadTextureFromFile(this.selectedFile);
        }
    }

    isSelectionValid(): boolean {
        if (this.activeTab === 'existing') {
            return this.textureList?.selectedOptions?.selected?.length > 0;
        } else if (this.activeTab === 'url') {
            return !!this.textureUrl && this.urlValid;
        } else if (this.activeTab === 'upload') {
            return !!this.selectedFile;
        }
        return false;
    }

    handleImageError(event: ErrorEvent): void {
        this.urlError = 'Failed to load image from URL';
        this.urlValid = false;
    }

    handleImageLoad(event: Event): void {
        this.urlError = null;
        this.urlValid = true;
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = true;
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
        
        if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
            const file = event.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                this.handleFile(file);
            }
        }
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.handleFile(input.files[0]);
        }
    }

    private handleFile(file: File): void {
        this.selectedFile = file;
        
        // Crear URL para vista previa
        if (this.filePreviewUrl) {
            URL.revokeObjectURL(this.filePreviewUrl);
        }
        this.filePreviewUrl = URL.createObjectURL(file);
    }

    private async loadTextureFromUrl(url: string, fileName: string): Promise<void> {
        try {
            // Cargar la textura usando el TextureManagerAdapter
            const textureInfo = await this.textureManager.loadTextureFromUrl(url, {
                generateMipmaps: true,
                flipY: true
            });
            
            if (textureInfo) {
                console.log(`Textura cargada con UUID: ${textureInfo.uuid}`);
                // Cerrar el diálogo con el UUID de la textura
                this.dialogRef.close(textureInfo.uuid);
            } else {
                console.error('No se pudo cargar la textura desde la URL');
                this.dialogRef.close();
            }
        } catch (error) {
            console.error('Error loading texture from URL:', error);
            this.dialogRef.close();
        }
    }

    private async loadTextureFromFile(file: File): Promise<void> {
        try {
            // Crear textura usando el TextureManagerAdapter
            const textureInfo = await this.textureManager.createTextureFromFile(file, {
                generateMipmaps: true,
                flipY: true
            });
            
            if (textureInfo) {
                console.log(`Textura creada con UUID: ${textureInfo.uuid}`);
                // Cerrar el diálogo con el UUID de la textura
                this.dialogRef.close(textureInfo.uuid);
            } else {
                console.error('No se pudo crear la textura desde el archivo');
                this.dialogRef.close();
            }
        } catch (error) {
            console.error('Error loading texture from file:', error);
            this.dialogRef.close();
        }
    }

    /**
     * Obtiene la URL de vista previa para una textura existente
     * @param textureId UUID o nombre de la textura
     * @returns URL de la imagen de vista previa o null si no se puede obtener
     */
    getTexturePreviewUrl(textureId: string): string | null {
        if (!textureId) return null;
        
        // Obtener la vista previa usando el TextureManagerAdapter
        const textureInfo = this.textureManager.textures.get(textureId);
        if (textureInfo && textureInfo.resource) {
            return this.textureManager.getTexturePreviewUrl(textureInfo.resource);
        }
        
        // Si no se encuentra por UUID, intentar buscarla por nombre
        const textureByName = Array.from(this.textureManager.textures.entries())
            .find(([_, info]) => info.name === textureId);
        
        if (textureByName) {
            return this.textureManager.getTexturePreviewUrl(textureByName[1].resource);
        }
        
        return null;
    }

    getTextureName(uuid: string): string {
        const textureInfo = this.textureManager.textures.get(uuid);
        return textureInfo ? textureInfo.name : uuid;
    }
} 