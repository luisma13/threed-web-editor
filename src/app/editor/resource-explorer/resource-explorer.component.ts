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
import { ContextMenuService } from '../context-menu/context-menu.service';
import { EditorEventsService } from '../editor-events.service';
import { ListViewComponent } from './components/list-view/list-view.component';
import { IconViewComponent } from './components/icon-view/icon-view.component';
import { MatDialog } from '@angular/material/dialog';
import { ModelInspectorDialogComponent } from '../model-inspector/model-inspector-dialog.component';
import { EditorService } from '../editor.service';

export type ViewMode = 'list' | 'icons';
export type ResourceType = 'material' | 'texture' | 'model';

export interface ResourceItem {
  id: string;
  name: string;
  type: ResourceType;
  preview?: string;
  resource: Material | Texture | CachedModelInfo;
  path: string;
}

export class ResourceFolder {
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
    MatTooltipModule,
    ListViewComponent,
    IconViewComponent
  ],
  templateUrl: './resource-explorer.component.html',
  styleUrls: ['./resource-explorer.component.scss']
})
export class ResourceExplorerComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];
  private resourceStructure = new BehaviorSubject<ResourceFolder[]>([]);
  private isBrowser: boolean;

  folders$ = this.resourceStructure.asObservable();
  selectedItems: Set<ResourceItem> = new Set();
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
    private contextMenuService: ContextMenuService,
    private editorEventsService: EditorEventsService,
    private editorService: EditorService,
    private dialog: MatDialog,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (!this.isBrowser) return;
    this.initializeSubscriptions();
    this.resourceStructure.next(this.rootFolders);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initializeSubscriptions(): void {
    this.subscriptions.push(
      this.materialManager.materialsObservable.subscribe(materials => 
        this.updateResources('material', materials)
      ),
      this.textureManager.texturesObservable.subscribe(textures => 
        this.updateResources('texture', textures)
      ),
      this.modelCache.modelsObservable.subscribe(models => 
        this.updateResources('model', models)
      ),
      this.editorEventsService.onResourceAction.subscribe(action => {
        switch (action.action) {
          case 'inspect': this.onInspectModel(action.resource); break;
          case 'edit': this.onEditResource(action.resource); break;
          case 'rename': this.onRename(action.resource); break;
          case 'delete': this.onDelete(action.resource); break;
          case 'addToScene': this.onAddToScene(action.resource); break;
        }
      })
    );
  }

  private getResourcePreview(type: ResourceType, id: string): string | undefined {
    switch (type) {
      case 'material': return this.materialManager.getMaterialPreview(id);
      case 'texture': return this.textureManager.getTexturePreview(id);
      case 'model': return this.modelCache.getModelPreview(id);
      default: return undefined;
    }
  }

  private createResourceItem(id: string, info: any, type: ResourceType): ResourceItem {
    return {
      id,
      name: info.name,
      type,
      preview: this.getResourcePreview(type, id),
      resource: info.resource || info,
      path: `/${info.name}`
    };
  }

  private updateModelResources(modelItem: ResourceItem, rootFolder: ResourceFolder): void {
    const modelInfo = modelItem.resource as CachedModelInfo;
    let modelFolder = this.findFolder(`/${modelItem.name}`);
    
    if (!modelFolder) {
      modelFolder = new ResourceFolder(modelItem.name, `/${modelItem.name}`);
      rootFolder.subfolders.push(modelFolder);
    }

    modelFolder.items = [];
    modelFolder.items.push({
      ...modelItem,
      path: `/${modelItem.name}/${modelItem.name}`
    });

    this.updateModelTextures(modelInfo, modelFolder, rootFolder);
    this.updateModelMaterials(modelInfo, modelFolder, rootFolder);
    modelFolder.isExpanded = true;
  }

  private updateModelTextures(modelInfo: CachedModelInfo, modelFolder: ResourceFolder, rootFolder: ResourceFolder): void {
    if (!modelInfo.textures) return;

    const addedTextures = new Set<string>();
    modelInfo.textures.forEach(textureId => {
      if (addedTextures.has(textureId)) return;
      
      const textureInfo = this.textureManager.textures.get(textureId);
      if (textureInfo) {
        rootFolder.items = rootFolder.items.filter(item => item.id !== textureId);
        
        if (!modelFolder.items.some(item => item.id === textureId)) {
          modelFolder.items.push({
            id: textureId,
            name: textureInfo.name,
            type: 'texture',
            preview: this.textureManager.getTexturePreview(textureId),
            resource: textureInfo.resource,
            path: `/${modelFolder.name}/${textureInfo.name}`
          });
        }
        
        addedTextures.add(textureId);
      }
    });
  }

  private updateModelMaterials(modelInfo: CachedModelInfo, modelFolder: ResourceFolder, rootFolder: ResourceFolder): void {
    if (!modelInfo.materials) return;

    modelInfo.materials.forEach(materialId => {
      const materialInfo = this.materialManager.materials.get(materialId);
      if (materialInfo) {
        rootFolder.items = rootFolder.items.filter(item => item.id !== materialId);
        modelFolder.items.push({
          id: materialId,
          name: materialInfo.name,
          type: 'material',
          preview: this.materialManager.getMaterialPreview(materialId),
          resource: materialInfo.resource,
          path: `/${modelFolder.name}/${materialInfo.name}`
        });
      }
    });
  }

  private updateStandaloneResources(items: ResourceItem[], rootFolder: ResourceFolder): void {
    items.forEach(item => {
      if (!this.isItemInModelFolders(item.id)) {
        const existingItem = this.findItemById(item.id);
        if (existingItem) {
          this.updateExistingItem(existingItem, item);
        } else {
          rootFolder.items.push(item);
        }
      } else {
        this.updateItemInModelFolders(item);
      }
    });
  }

  private updateExistingItem(existingItem: ResourceItem, newItem: ResourceItem): void {
    existingItem.preview = newItem.preview;
    existingItem.name = newItem.name;
    existingItem.resource = newItem.resource;
  }

  private updateItemInModelFolders(item: ResourceItem): void {
    this.rootFolders.forEach(folder => {
      folder.subfolders.forEach(modelFolder => {
        const existingItem = modelFolder.items.find(i => i.id === item.id);
        if (existingItem) {
          this.updateExistingItem(existingItem, item);
        }
      });
    });
  }

  private updateResources(type: ResourceType, resources: Map<string, any>): void {
    const rootFolder = this.findFolder('/');
    if (!rootFolder) return;

    const items = Array.from(resources.entries())
      .map(([id, info]) => this.createResourceItem(id, info, type));

    if (type === 'model') {
      items.forEach(modelItem => this.updateModelResources(modelItem, rootFolder));
            } else {
      this.updateStandaloneResources(items, rootFolder);
    }

    this.resourceStructure.next([...this.rootFolders]);
    this.changeDetectorRef.detectChanges();
  }

  // Métodos de búsqueda y utilidad
  private findItemById(id: string): ResourceItem | null {
    const findInFolder = (folders: ResourceFolder[]): ResourceItem | null => {
      for (const folder of folders) {
        const item = folder.items.find(i => i.id === id);
        if (item) return item;
        const foundInSubfolders = findInFolder(folder.subfolders);
        if (foundInSubfolders) return foundInSubfolders;
      }
      return null;
    };
    return findInFolder(this.rootFolders);
  }

  private isItemInModelFolders(id: string): boolean {
    return this.rootFolders.some(folder =>
      folder.subfolders.some(modelFolder =>
        modelFolder.items.some(item => item.id === id)
      )
    );
  }

  private findFolder(path: string): ResourceFolder | null {
    const findFolderRecursive = (folders: ResourceFolder[], targetPath: string): ResourceFolder | null => {
      for (const folder of folders) {
        if (folder.path === targetPath) return folder;
        const foundInSubfolders = findFolderRecursive(folder.subfolders, targetPath);
        if (foundInSubfolders) return foundInSubfolders;
      }
      return null;
    };
    return findFolderRecursive(this.rootFolders, path);
  }

  // Métodos de UI
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
    this.selectedItems.clear();
  }

  navigateToParentFolder() {
    if (!this.selectedFolder) return;
    const parentPath = this.selectedFolder.path.split('/').slice(0, -1).join('/') || '/';
    this.selectedFolder = this.findFolder(parentPath);
    this.selectedItems.clear();
  }

  onItemClick(item: ResourceItem, event: MouseEvent) {
    event.stopPropagation();
    
    if (event.button === 2) {
      if (!this.selectedItems.has(item)) {
        this.selectedItems.clear();
        this.selectedItems.add(item);
      }
      this.contextMenuService.showContextMenu(event, 'resource', item);
    } else if (event.detail === 2) { // Double click
      if (item.type === 'model') {
        this.editorEventsService.onResourceAction.next({ action: 'inspect', resource: item });
      } else if (item.type === 'material' || item.type === 'texture') {
        this.onEditResource(item);
      }
    } else { // Single click
      if (event.ctrlKey || event.metaKey) {
        // Toggle selection
        if (this.selectedItems.has(item)) {
          this.selectedItems.delete(item);
        } else {
          this.selectedItems.add(item);
        }
      } else if (event.shiftKey && this.selectedItems.size > 0) {
        // Range selection
        const items = this.getAllItems();
        const lastSelected = items.find(i => this.selectedItems.has(i));
        if (lastSelected) {
          const start = items.indexOf(lastSelected);
          const end = items.indexOf(item);
          const range = items.slice(
            Math.min(start, end),
            Math.max(start, end) + 1
          );
          this.selectedItems.clear();
          range.forEach(i => this.selectedItems.add(i));
        }
      } else {
        // Single selection
        this.selectedItems.clear();
        this.selectedItems.add(item);
      }
    }
  }

  private getAllItems(): ResourceItem[] {
    const items: ResourceItem[] = [];
    const collectItems = (folders: ResourceFolder[]) => {
      for (const folder of folders) {
        items.push(...folder.items);
        collectItems(folder.subfolders);
      }
    };
    collectItems(this.rootFolders);
    return items;
  }

  onItemContextMenu(event: MouseEvent, item: ResourceItem) {
    event.preventDefault();
    event.stopPropagation();
    this.selectedItems.clear();
    this.selectedItems.add(item);
    this.contextMenuService.showContextMenu(event, 'resource', item);
  }

  onItemDragStart(event: DragEvent, item: ResourceItem) {
    if (event.dataTransfer) {
      const itemsToMove = this.selectedItems.has(item) 
        ? Array.from(this.selectedItems)
        : [item];
      
      event.dataTransfer.setData('application/resource', JSON.stringify({
        items: itemsToMove.map(i => ({ id: i.id, type: i.type }))
      }));
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onItemDrop(event: DragEvent, targetFolder: ResourceFolder) {
    event.preventDefault();
    const data = event.dataTransfer?.getData('application/resource');
    if (!data) return;

    const draggedData = JSON.parse(data);
    if (Array.isArray(draggedData.items)) {
      draggedData.items.forEach((item: { id: string }) => {
        this.moveItemToFolder(item.id, targetFolder);
      });
    }
  }

  moveItemToFolder(itemId: string, targetFolder: ResourceFolder) {
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
      sourceFolder.items = sourceFolder.items.filter(i => i.id !== itemId);
      targetFolder.items.push({
        ...item,
        path: `${targetFolder.path}/${item.name}`
      });
      this.resourceStructure.next([...this.rootFolders]);
    }
  }

  // Métodos de gestión de recursos
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

  onRename(item: ResourceItem | ResourceFolder) {
    const newName = prompt('Enter new name:', item instanceof ResourceFolder ? item.name : item.name);
    if (newName && newName !== item.name) {
      if ('type' in item) {
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
        item.name = newName;
        this.resourceStructure.next([...this.rootFolders]);
      }
    }
  }

  onDelete(itemOrFolder: ResourceItem | ResourceFolder) {
    let itemsToDelete: ResourceItem[] = [];
    let confirmMessage = '';

    if ('type' in itemOrFolder) {
      // Es un ResourceItem
      itemsToDelete = Array.from(this.selectedItems.size > 1 ? this.selectedItems : [itemOrFolder]);
      confirmMessage = this.selectedItems.size > 1 
        ? `Are you sure you want to delete ${this.selectedItems.size} items?`
        : `Are you sure you want to delete ${itemOrFolder.name}?`;
    } else {
      // Es un ResourceFolder
      itemsToDelete = this.getResourcesInFolder(itemOrFolder);
      confirmMessage = `Are you sure you want to delete the folder "${itemOrFolder.name}" and all its contents (${itemsToDelete.length} items)?`;
    }

    if (confirm(confirmMessage)) {
      this.deleteResourcesRecursively(itemsToDelete);
      
      if (!('type' in itemOrFolder)) {
        // Si era una carpeta, la eliminamos de la estructura
        const parent = this.findParentFolder(itemOrFolder);
        if (parent) {
          parent.subfolders = parent.subfolders.filter(f => f !== itemOrFolder);
          this.resourceStructure.next([...this.rootFolders]);
        }
      }
      
      this.selectedItems.clear();
    }
  }

  private findParentFolder(folder: ResourceFolder): ResourceFolder | null {
    const findParent = (folders: ResourceFolder[], target: ResourceFolder): ResourceFolder | null => {
      for (const f of folders) {
        if (f.subfolders.includes(target)) return f;
        const found = findParent(f.subfolders, target);
        if (found) return found;
      }
      return null;
    };
    return findParent(this.rootFolders, folder);
  }

  private deleteResourcesRecursively(items: ResourceItem[]): void {
    const uniqueItems = new Set(items);
    uniqueItems.forEach(item => {
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
    });
  }

  private getResourcesInFolder(folder: ResourceFolder): ResourceItem[] {
    const resources: ResourceItem[] = [...folder.items];
    folder.subfolders.forEach(subfolder => {
      resources.push(...this.getResourcesInFolder(subfolder));
    });
    return resources;
  }

  onInspectModel(item: ResourceItem) {
    if (item.type !== 'model') return;

    const dialogRef = this.dialog.open(ModelInspectorDialogComponent, {
      data: { resource: item },
      panelClass: 'model-inspector-dialog-container',
      maxWidth: '100vw',
      maxHeight: '100vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Handle model updates if needed
        this.modelCache.updateModel(item.id, result);
      }
    });
  }

  onAddToScene(item: ResourceItem) {
    if (item.type !== 'model') return;

    const modelInfo = item.resource as CachedModelInfo;
    if (!modelInfo) return;

    // Crear un nuevo GameObject
    const newGameObject = this.editorService.newGameObject();
    newGameObject.name = item.name;

    // Clonar el modelo y asignarlo al GameObject
    const clonedModel = modelInfo.rootObject.clone();
    newGameObject.add(clonedModel);

    // Actualizar la escena
    if (this.editorService.editableSceneComponent) {
        this.editorService.editableSceneComponent.selectObject(newGameObject);
        this.editorService.editableSceneComponent.selectedObject.next(newGameObject);
    }
  }
} 