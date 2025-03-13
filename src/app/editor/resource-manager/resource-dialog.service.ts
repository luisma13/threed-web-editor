import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { TextureDialogComponent, TextureDialogData } from './texture-dialog/texture-dialog.component';
import { MaterialDialogComponent, MaterialDialogData } from './material-dialog/material-dialog.component';
import { ResourceService } from './resource.service';
import { Texture, TextureEncoding, MeshStandardMaterial } from 'three';

@Injectable({
  providedIn: 'root'
})
export class ResourceDialogService {
  constructor(
    private dialog: MatDialog,
    private resourceService: ResourceService
  ) {}

  /**
   * Abre un diálogo para añadir o editar una textura
   * @param isEdit Si es true, se está editando una textura existente
   * @param texturePath Ruta de la textura a editar (solo si isEdit es true)
   * @returns Observable con los datos de la textura
   */
  openTextureDialog(isEdit: boolean = false, texturePath?: string): Observable<any> {
    const dialogData: TextureDialogData = {
      isEdit,
      path: '',
    };

    if (isEdit && texturePath) {
      console.log(`Abriendo diálogo para editar textura: ${texturePath}`);
      
      // Obtener la textura existente del servicio de recursos
      const textureInfo = this.resourceService.textures.get(texturePath);
      if (textureInfo) {
        dialogData.path = texturePath;
        dialogData.texture = textureInfo.resource;
        
        // Verificar si la textura tiene una imagen válida
        if (dialogData.texture.image) {
          console.log('La textura tiene una imagen:', dialogData.texture.image);
          
          // Verificar si la imagen tiene una URL src
          if (dialogData.texture.image.src) {
            console.log('URL de la imagen:', dialogData.texture.image.src);
          } else {
            console.log('La imagen no tiene una URL src');
          }
        } else {
          console.warn('La textura no tiene una imagen');
        }
      } else {
        console.warn(`No se encontró la textura con clave: ${texturePath}`);
      }
    }

    return this.dialog.open(TextureDialogComponent, {
      width: '500px',
      data: dialogData
    }).afterClosed();
  }

  /**
   * Abre un diálogo para añadir o editar un material
   * @param isEdit Si es true, se está editando un material existente
   * @param materialUuid UUID del material a editar (solo si isEdit es true)
   * @returns Observable con los datos del material
   */
  openMaterialDialog(isEdit: boolean = false, materialUuid?: string): Observable<any> {
    const dialogData: MaterialDialogData = {
      isEdit
    };

    if (isEdit && materialUuid) {
      console.log(`Abriendo diálogo para editar material con UUID: ${materialUuid}`);
      
      // Obtener el material existente del servicio de recursos
      const materialInfo = this.resourceService.materials.get(materialUuid);
      if (materialInfo) {
        console.log(`Material encontrado: ${materialInfo.name} (UUID: ${materialUuid})`);
        dialogData.name = materialInfo.name;
        dialogData.material = materialInfo.resource;
        dialogData.uuid = materialUuid;
        
        console.log('Datos del diálogo preparados:', {
          isEdit: dialogData.isEdit,
          name: dialogData.name,
          uuid: dialogData.uuid,
          materialType: dialogData.material instanceof MeshStandardMaterial ? 'MeshStandardMaterial' : 'Otro tipo'
        });
      } else {
        console.warn(`No se encontró el material con UUID: ${materialUuid}`);
        console.log('Materiales disponibles:', Array.from(this.resourceService.materials.entries()).map(([uuid, info]) => ({
          uuid,
          name: info.name
        })));
      }
    }

    return this.dialog.open(MaterialDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'material-dialog-panel',
      data: dialogData
    }).afterClosed();
  }

  /**
   * Procesa los datos de una textura después de cerrar el diálogo
   * @param result Resultado del diálogo
   * @returns true si se ha añadido/actualizado la textura, false en caso contrario
   */
  processTextureDialogResult(result: any): boolean {
    if (!result) return false;

    // Ensure all properties are properly typed
    const textureOptions = {
      wrapS: result.wrapS,
      wrapT: result.wrapT,
      encoding: Number(result.encoding) as TextureEncoding, // Force encoding to be a number and cast to TextureEncoding
      generateMipmaps: result.generateMipmaps,
      flipY: result.flipY
    };

    console.log('Processing texture with options:', textureOptions);
    console.log('Encoding type:', typeof textureOptions.encoding, 'value:', textureOptions.encoding);

    if (result.isEdit) {
      // Si se está editando y se indicó mantener la imagen original
      if (result.keepOriginalImage) {
        // Solo actualizar las propiedades de la textura existente
        this.resourceService.updateTexture(result.path, textureOptions);
        console.log('Textura actualizada (manteniendo imagen original):', result);
        return true;
      }
      
      // Si se cambió la URL o el archivo
      if (result.file || result.url) {
        // Usar originalPath si está disponible, de lo contrario usar path
        const oldPath = result.originalPath || result.path;
        
        // Verificar si la textura existe en el mapa de texturas
        const textureExists = this.resourceService.textures.has(oldPath);
        
        if (!textureExists) {
          console.warn(`La textura con clave "${oldPath}" no existe en el mapa de texturas. Creando una nueva textura.`);
          
          // Si la textura no existe, crear una nueva en lugar de actualizar
          if (result.file) {
            // Crear una nueva textura con el archivo
            this.resourceService.createTextureFromFile(result.file, textureOptions)
              .then(() => {
                console.log('Nueva textura creada con archivo:', result.file.name);
              })
              .catch(error => {
                console.error('Error al crear textura desde archivo:', error);
              });
          } else if (result.url) {
            // Crear una nueva textura con la URL
            this.resourceService.loadTextureFromUrl(result.url, textureOptions)
              .then(() => {
                console.log('Nueva textura creada con URL:', result.url);
              })
              .catch(error => {
                console.error('Error al crear textura desde URL:', error);
              });
          }
        } else {
          // La textura existe, actualizarla
          if (result.file) {
            // Actualizar la textura existente con el nuevo archivo
            this.resourceService.updateTextureFromFile(oldPath, result.file, textureOptions)
              .then(() => {
                console.log('Textura actualizada con nuevo archivo:', oldPath);
              })
              .catch(error => {
                console.error('Error al actualizar textura con nuevo archivo:', error);
              });
          } else if (result.url) {
            // Actualizar la textura existente con la nueva URL
            this.resourceService.updateTextureFromUrl(oldPath, result.url, textureOptions)
              .then(() => {
                console.log('Textura actualizada con nueva URL:', oldPath);
              })
              .catch(error => {
                console.error('Error al actualizar textura con nueva URL:', error);
              });
          }
        }
      } else {
        // Solo actualizar las propiedades
        this.resourceService.updateTexture(result.path, textureOptions);
        console.log('Textura actualizada (solo propiedades):', result);
      }
    } else {
      // Añadir nueva textura
      if (result.file) {
        // Verificar si ya existe una textura con el mismo nombre de archivo
        const fileName = result.file.name;
        const textureExists = this.resourceService.textures.has(fileName);
        
        if (textureExists) {
          // Si ya existe una textura con el mismo nombre, generar un nombre único
          const uniqueFileName = `${fileName.split('.')[0]}_${Date.now()}.${fileName.split('.').pop()}`;
          
          console.log(`Ya existe una textura con el nombre "${fileName}". Creando con nombre único: "${uniqueFileName}"`);
          
          // Crear la textura con el nombre único
          this.resourceService.createTextureFromFile(result.file, textureOptions, uniqueFileName)
            .catch(error => {
              console.error('Error al crear textura desde archivo con nombre único:', error);
            });
        } else {
          // Si no existe, crear normalmente
          this.resourceService.createTextureFromFile(result.file, textureOptions)
            .catch(error => {
              console.error('Error al crear textura desde archivo:', error);
            });
        }
      } else if (result.url) {
        // Para URLs, extraer el nombre del archivo
        const fileName = this.getFileNameFromUrl(result.url);
        const textureExists = this.resourceService.textures.has(fileName);
        
        if (textureExists) {
          // Si ya existe una textura con el mismo nombre, generar un nombre único para la referencia interna
          console.log(`Ya existe una textura con el nombre "${fileName}" extraído de la URL. Usando timestamp para diferenciarla.`);
          
          // Cargar la textura con un nombre único generado internamente
          this.resourceService.loadTextureFromUrl(result.url, textureOptions, true)
            .catch(error => {
              console.error('Error al cargar textura desde URL con nombre único:', error);
            });
        } else {
          // Si no existe, cargar normalmente
          this.resourceService.loadTextureFromUrl(result.url, textureOptions)
            .catch(error => {
              console.error('Error al cargar textura desde URL:', error);
            });
        }
      } else {
        // Si solo tenemos una ruta, verificar si ya existe
        const textureExists = this.resourceService.textures.has(result.path);
        
        if (textureExists) {
          // Si ya existe, generar un nombre único
          const uniquePath = `${result.path.split('.')[0]}_${Date.now()}.${result.path.split('.').pop()}`;
          console.log(`Ya existe una textura con la ruta "${result.path}". Usando ruta única: "${uniquePath}"`);
          
          // Cargar con el nombre único
          this.resourceService.loadTexture(uniquePath, textureOptions)
            .catch(error => {
              console.error('Error al cargar textura desde ruta única:', error);
            });
        } else {
          // Si no existe, cargar normalmente
          this.resourceService.loadTexture(result.path, textureOptions)
            .catch(error => {
              console.error('Error al cargar textura desde ruta:', error);
            });
        }
      }
      console.log('Textura añadida:', result);
    }

    return true;
  }

  /**
   * Obtiene el nombre de archivo de una URL
   * @param url URL de la que extraer el nombre de archivo
   * @returns Nombre de archivo extraído de la URL
   */
  private getFileNameFromUrl(url: string): string {
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1] || `texture_${Date.now()}.jpg`;
  }

  /**
   * Procesa los datos de un material después de cerrar el diálogo
   * @param result Resultado del diálogo
   * @returns true si se ha añadido/actualizado el material, false en caso contrario
   */
  processMaterialDialogResult(result: any): boolean {
    if (!result) {
      console.log('No se recibió resultado del diálogo de material');
      return false;
    }

    console.log('Resultado del diálogo de material:', JSON.stringify(result, null, 2));
    
    // Preparar las propiedades del material
    const materialProperties = {
      name: result.name,
      color: result.properties.color,
      roughness: result.properties.roughness,
      metalness: result.properties.metalness,
      transparent: result.properties.transparent,
      opacity: result.properties.opacity,
      side: result.properties.side,
      flatShading: result.properties.flatShading,
      wireframe: result.properties.wireframe,
      alphaTest: result.properties.alphaTest,
      depthTest: result.properties.depthTest,
      depthWrite: result.properties.depthWrite,
      emissiveColor: result.properties.emissiveColor,
      emissiveIntensity: result.properties.emissiveIntensity,
      map: result.properties.map || null,
      normalMap: result.properties.normalMap || null,
      roughnessMap: result.properties.roughnessMap || null,
      metalnessMap: result.properties.metalnessMap || null,
      emissiveMap: result.properties.emissiveMap || null
    };

    console.log('Propiedades preparadas para actualizar:', materialProperties);

    if (result.isEdit) {
      console.log('Modo edición detectado');
      
      // Determinar el UUID a utilizar para la actualización
      let materialUuid: string | undefined;
      
      // Verificar todas las posibles fuentes del UUID
      if (result.uuid) {
        materialUuid = result.uuid;
        console.log('Usando UUID del resultado:', materialUuid);
      } else if (result.data && result.data.uuid) {
        materialUuid = result.data.uuid;
        console.log('Usando UUID de datos originales:', materialUuid);
      } else {
        console.log('No se encontró UUID directo, buscando por nombre');
        // Buscar el UUID del material por su nombre actual
        const materialData = this.resourceService.getMaterialByName(result.data.name);
        if (materialData) {
          materialUuid = materialData.uuid;
          console.log('UUID encontrado por nombre:', materialUuid);
        }
      }
      
      if (materialUuid) {
        console.log(`Actualizando material con UUID: ${materialUuid}`);
        this.resourceService.updateMaterial(materialUuid, materialProperties);
        console.log('Material actualizado:', result.name);
        return true;
      } else {
        console.error(`No se pudo determinar el UUID para el material: ${result.name}`);
        return false;
      }
    } else {
      console.log('Modo creación detectado');
      // Crear nuevo material
      this.resourceService.createMaterial(result.name, materialProperties);
      console.log('Material creado:', result.name);
      return true;
    }
  }
} 