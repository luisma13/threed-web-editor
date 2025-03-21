import { Component, OnInit, OnDestroy, ChangeDetectorRef, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TextureManagerAdapter } from '../resource-manager/texture-manager-adapter.service';
import { MaterialManagerAdapter } from '../resource-manager/material-manager-adapter.service';
import { ModelCacheAdapter } from '../resource-manager/model-cache-adapter.service';
import { ResourceDialogService } from '../resource-manager/resource-dialog.service';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Material, Texture } from 'three';
import { CachedModelInfo } from '../../simple-engine/managers/model-manager';

type ViewMode = 'list' | 'icons';

interface ResourceItem {
  id: string;
  name: string;
  type: 'material' | 'texture' | 'model';
  preview?: string;
  resource: Material | Texture | CachedModelInfo;
  path: string;
}

class ResourceFolder {
  constructor(
    public name: string,
    public path: string,
    public items: ResourceItem[] = [],
    public subfolders: ResourceFolder[] = [],
    public isExpanded: boolean = false
  ) { }
}

@Component({
  selector: 'app-resource-explorer',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule
  ],
  templateUrl: './resource-explorer.component.html',
  styleUrls: ['./resource-explorer.component.scss']
})
export class ResourceExplorerComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];
  private resourceStructure = new BehaviorSubject<ResourceFolder[]>([]);
  private isBrowser: boolean;

  folders$ = this.resourceStructure.asObservable();
  selectedItem: ResourceItem | null = null;
  selectedFolder: ResourceFolder | null = null;
  viewMode: ViewMode = 'list';

  rootFolders: ResourceFolder[] = [
    new ResourceFolder('Root', '/')
  ];

  constructor(
    private textureManager: TextureManagerAdapter,
    private materialManager: MaterialManagerAdapter,
    private modelCache: ModelCacheAdapter,
    private resourceDialogService: ResourceDialogService,
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (!this.isBrowser) return;

    // Subscribe to resource changes
    this.subscriptions.push(
      this.materialManager.materialsObservable.subscribe(materials => {
        this.updateResources('material', materials);
      }),

      this.textureManager.texturesObservable.subscribe(textures => {
        this.updateResources('texture', textures);
      }),

      this.modelCache.modelsObservable.subscribe(models => {
        this.updateResources('model', models);
      })
    );

    // Initialize structure
    this.resourceStructure.next(this.rootFolders);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private findItemById(id: string): ResourceItem | null {
    const findInFolder = (folders: ResourceFolder[]): ResourceItem | null => {
      for (const folder of folders) {
        const item = folder.items.find(i => i.id === id);
        if (item) return item;
        const found = findInFolder(folder.subfolders);
        if (found) return found;
      }
      return null;
    };
    return findInFolder(this.rootFolders);
  }

  private updateResources(type: 'material' | 'texture' | 'model', resources: Map<string, any>) {
    const rootFolder = this.findFolder('/');
    if (!rootFolder) return;

    const items = Array.from(resources.entries()).map(([id, info]) => {
      let preview: string | undefined;

      if (type === 'material') {
        preview = this.materialManager.getMaterialPreview(id);
      } else if (type === 'texture') {
        preview = this.textureManager.getTexturePreview(id);
      } else if (type === 'model') {
        preview = this.modelCache.getModelPreview(id);
      }

      return {
        id,
        name: info.name,
        type,
        preview,
        resource: info.resource || info,
        path: `/${info.name}`
      };
    });

    if (type === 'model') {
      // Para cada modelo, crear una carpeta y organizar sus recursos
      items.forEach(modelItem => {
        const modelInfo = modelItem.resource as CachedModelInfo;

        // Crear o encontrar la carpeta del modelo
        let modelFolder = this.findFolder(`/${modelItem.name}`);
        if (!modelFolder) {
          modelFolder = new ResourceFolder(modelItem.name, `/${modelItem.name}`);
          rootFolder.subfolders.push(modelFolder);
        }

        // Limpiar items antiguos de la carpeta del modelo
        modelFolder.items = [];

        // Añadir el modelo a su carpeta
        modelFolder.items.push({
          ...modelItem,
          path: `/${modelItem.name}/${modelItem.name}`
        });

        // Mover las texturas asociadas a la carpeta del modelo
        if (modelInfo.textures) {
          const addedTextures = new Set<string>();
          modelInfo.textures.forEach(textureId => {
            if (addedTextures.has(textureId)) return; // Skip if already added
            
            const textureInfo = this.textureManager.textures.get(textureId);
            if (textureInfo) {
              // Eliminar la textura de la carpeta raíz si existe
              rootFolder.items = rootFolder.items.filter(item => item.id !== textureId);

              // Verificar si la textura ya existe en la carpeta del modelo
              const textureExists = modelFolder!.items.some(item => item.id === textureId);
              if (!textureExists) {
                // Añadir la textura a la carpeta del modelo
                modelFolder!.items.push({
                  id: textureId,
                  name: textureInfo.name,
                  type: 'texture',
                  preview: this.textureManager.getTexturePreview(textureId),
                  resource: textureInfo.resource,
                  path: `/${modelItem.name}/${textureInfo.name}`
                });
              }
              
              addedTextures.add(textureId);
            }
          });
        }

        // Mover los materiales asociados a la carpeta del modelo
        if (modelInfo.materials) {
          modelInfo.materials.forEach(materialId => {
            const materialInfo = this.materialManager.materials.get(materialId);
            if (materialInfo) {
              // Eliminar el material de la carpeta raíz si existe
              rootFolder.items = rootFolder.items.filter(item => item.id !== materialId);

              // Añadir el material a la carpeta del modelo
              modelFolder!.items.push({
                id: materialId,
                name: materialInfo.name,
                type: 'material',
                preview: this.materialManager.getMaterialPreview(materialId),
                resource: materialInfo.resource,
                path: `/${modelItem.name}/${materialInfo.name}`
              });
            }
          });
        }

        // Expandir la carpeta del modelo por defecto
        modelFolder.isExpanded = true;
      });
    } else {
      // Para texturas y materiales que no están asociados a ningún modelo
      items.forEach(item => {
        // Solo añadir el item si no está ya en alguna carpeta de modelo
        if (!this.isItemInModelFolders(item.id)) {
          const existingItem = this.findItemById(item.id);
          if (existingItem) {
            // Actualizar el item existente
            existingItem.preview = item.preview;
            existingItem.name = item.name;
            existingItem.resource = item.resource;
          } else {
            // Añadir nuevo item a la carpeta raíz
            rootFolder.items.push(item);
          }
        } else {
          // Actualizar el item en la carpeta del modelo
          this.rootFolders.forEach(folder => {
            folder.subfolders.forEach(modelFolder => {
              const existingItem = modelFolder.items.find(i => i.id === item.id);
              if (existingItem) {
                existingItem.preview = item.preview;
                existingItem.name = item.name;
                existingItem.resource = item.resource;
              }
            });
          });
        }
      });
    }

    this.resourceStructure.next([...this.rootFolders]);
    this.changeDetectorRef.detectChanges();
  }

  private isItemInModelFolders(itemId: string): boolean {
    return this.rootFolders.some(folder => 
      folder.subfolders.some(modelFolder => 
        modelFolder.items.some(item => item.id === itemId)
      )
    );
  }

  private findFolder(path: string): ResourceFolder | null {
    const findFolderRecursive = (folders: ResourceFolder[], targetPath: string): ResourceFolder | null => {
      for (const folder of folders) {
        if (folder.path === targetPath) return folder;
        const found = findFolderRecursive(folder.subfolders, targetPath);
        if (found) return found;
      }
      return null;
    };
    return findFolderRecursive(this.rootFolders, path);
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'list' ? 'icons' : 'list';
  }

  onFolderClick(folder: ResourceFolder) {
    if (this.viewMode === 'icons') {
      this.selectedFolder = folder;
    } else {
      folder.isExpanded = !folder.isExpanded;
      this.selectedFolder = folder;
    }
    this.selectedItem = null;
  }

  navigateToParentFolder() {
    if (!this.selectedFolder) return;

    const parentPath = this.selectedFolder.path.split('/').slice(0, -1).join('/') || '/';
    this.selectedFolder = this.findFolder(parentPath);
    this.selectedItem = null;
  }

  onItemClick(item: ResourceItem, event: MouseEvent) {
    event.stopPropagation();
    this.selectedItem = item;
  }

  onItemDragStart(event: DragEvent, item: ResourceItem) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/resource', JSON.stringify({
        id: item.id,
        type: item.type
      }));
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  onItemDrop(event: DragEvent, targetFolder: ResourceFolder) {
    event.preventDefault();
    const data = event.dataTransfer?.getData('application/resource');
    if (!data) return;

    const draggedItem = JSON.parse(data);
    this.moveItemToFolder(draggedItem.id, targetFolder);
  }

  moveItemToFolder(itemId: string, targetFolder: ResourceFolder) {
    // Find the item and its current folder
    let sourceFolder: ResourceFolder | null = null;
    let item: ResourceItem | null = null;

    const findItem = (folders: ResourceFolder[]) => {
      for (const folder of folders) {
        const foundItem = folder.items.find(i => i.id === itemId);
        if (foundItem) {
          sourceFolder = folder;
          item = foundItem;
          return true;
        }
        if (findItem(folder.subfolders)) return true;
      }
      return false;
    };

    findItem(this.rootFolders);

    if (sourceFolder && item) {
      // Remove from source folder
      sourceFolder.items = sourceFolder.items.filter(i => i.id !== itemId);
      // Add to target folder
      targetFolder.items.push({
        ...item,
        path: `${targetFolder.path}/${item.name}`
      });
      this.resourceStructure.next([...this.rootFolders]);
    }
  }

  onRename(item: ResourceItem | ResourceFolder) {
    const newName = prompt('Enter new name:', item instanceof ResourceFolder ? item.name : item.name);
    if (newName && newName !== item.name) {
      if ('type' in item) {
        // It's a ResourceItem
        switch (item.type) {
          case 'material':
            this.materialManager.updateMaterialName(item.id, newName);
            break;
          case 'texture':
            this.textureManager.updateTextureName(item.id, newName);
            break;
          case 'model':
            // Implement model rename logic
            break;
        }
      } else {
        // It's a ResourceFolder
        item.name = newName;
        this.resourceStructure.next([...this.rootFolders]);
      }
    }
  }

  onDelete(item: ResourceItem) {
    if (confirm(`Are you sure you want to delete ${item.name}?`)) {
      switch (item.type) {
        case 'material':
          this.materialManager.releaseMaterial(item.id);
          break;
        case 'texture':
          this.textureManager.releaseTexture(item.id);
          break;
        case 'model':
          this.modelCache.releaseModel(item.id);
          break;
      }
    }
  }

  createFolder(parentFolder: ResourceFolder | null = null) {
    const name = prompt('Enter folder name:');
    if (name) {
      const parent = parentFolder || this.rootFolders[0];
      const path = parent.path === '/' ? `/${name}` : `${parent.path}/${name}`;
      const newFolder = new ResourceFolder(name, path);
      parent.subfolders.push(newFolder);
      this.resourceStructure.next([...this.rootFolders]);
    }
  }

  onAddTexture() {
    this.resourceDialogService.openTextureDialog().subscribe(result => {
      if (result) {
        this.resourceDialogService.processTextureDialogResult(result);
      }
    });
  }

  onAddMaterial() {
    this.resourceDialogService.openMaterialDialog().subscribe(result => {
      if (result) {
        this.resourceDialogService.processMaterialDialogResult(result);
      }
    });
  }

  onEditResource(item: ResourceItem) {
    if (item.type === 'material') {
      this.resourceDialogService.openMaterialDialog(true, item.id).subscribe(result => {
        if (result) {
          this.resourceDialogService.processMaterialDialogResult(result);
        }
      });
    } else if (item.type === 'texture') {
      this.resourceDialogService.openTextureDialog(true, item.id).subscribe(result => {
        if (result) {
          this.resourceDialogService.processTextureDialogResult(result);
        }
      });
    }
  }
} 