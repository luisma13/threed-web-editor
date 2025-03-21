import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef, PLATFORM_ID, Inject } from '@angular/core';
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
import { Material, Texture, WebGLRenderer, Scene, PerspectiveCamera, SphereGeometry, Mesh, DirectionalLight, AmbientLight, Box3, Vector3, MeshStandardMaterial } from 'three';
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
export class ResourceExplorerComponent implements OnInit, OnDestroy, AfterViewInit {
  private subscriptions: Subscription[] = [];
  private resourceStructure = new BehaviorSubject<ResourceFolder[]>([]);

  folders$ = this.resourceStructure.asObservable();
  selectedItem: ResourceItem | null = null;
  selectedFolder: ResourceFolder | null = null;
  viewMode: ViewMode = 'list';

  rootFolders: ResourceFolder[] = [
    new ResourceFolder('Root', '/')
  ];

  // Preview rendering
  @ViewChild('previewCanvas') previewCanvasRef!: ElementRef<HTMLCanvasElement>;
  private renderer: WebGLRenderer | null = null;
  private scene: Scene | null = null;
  private camera: PerspectiveCamera | null = null;
  private previewMesh: Mesh | null = null;
  private previewGeometry: SphereGeometry | null = null;
  private isInitializing = false;
  private isBrowser: boolean;
  private modelPreviews: Map<string, string> = new Map();

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
      this.materialManager.materialsSubject.subscribe(materials => {
        this.updateResources('material', materials);
        if (this.isInitialized && !this.isInitializing) {
          setTimeout(() => {
            this.renderAllMaterialPreviews();
          }, 100);
        }
      }),

      this.textureManager.texturesSubject.subscribe(textures => {
        // Procesar las texturas inmediatamente
        this.processTextureUpdates(textures);
        // Forzar una actualización después de un breve retraso
        setTimeout(() => {
          this.processTextureUpdates(textures);
          this.changeDetectorRef.detectChanges();
        }, 500);
      }),

      this.modelCache.modelsSubject.subscribe(models => {
        this.updateResources('model', models);
        if (this.isInitialized && !this.isInitializing) {
          this.renderModelPreviews();
          // Procesar las texturas del modelo después de cargarlo
          setTimeout(() => {
            this.processTextureUpdates(this.textureManager.textures);
          }, 200);
        }
      })
    );

    // Initialize structure
    this.resourceStructure.next(this.rootFolders);
  }

  ngAfterViewInit() {
    if (!this.isBrowser) return;
    setTimeout(() => this.initRenderer(), 100);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.cleanupRenderer();
  }

  private get isInitialized(): boolean {
    return !!this.renderer && !!this.scene && !!this.camera;
  }

  private isWebGLAvailable(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  private initRenderer(): void {
    if (!this.isBrowser || this.renderer) return;

    if (!this.isWebGLAvailable()) {
      console.warn('WebGL no está disponible en este navegador.');
      return;
    }

    this.isInitializing = true;

    try {
      const canvas = this.previewCanvasRef.nativeElement;
      canvas.width = 128;
      canvas.height = 128;

      this.renderer = new WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true
      });
      this.renderer.setSize(canvas.width, canvas.height);
      this.renderer.setPixelRatio(1);
      this.renderer.setClearColor(0x222222);

      this.scene = new Scene();

      this.camera = new PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 100);
      this.camera.position.set(0, 0, 3.5);

      const ambientLight = new AmbientLight(0x404040);
      this.scene.add(ambientLight);

      const directionalLight = new DirectionalLight(0xffffff, 1);
      directionalLight.position.set(1, 1, 1);
      this.scene.add(directionalLight);

      this.previewGeometry = new SphereGeometry(1.2, 32, 32);
      this.previewMesh = new Mesh(this.previewGeometry);
      this.previewMesh.rotation.x = 0.4;
      this.previewMesh.rotation.y = 0.8;
      this.scene.add(this.previewMesh);

      canvas.addEventListener('webglcontextlost', (event) => {
        console.warn('WebGL context lost');
        event.preventDefault();
        setTimeout(() => {
          this.cleanupRenderer();
          this.initRenderer();
          this.renderAllMaterialPreviews();
          this.renderModelPreviews();
        }, 500);
      }, false);

      this.isInitializing = false;
      this.renderAllMaterialPreviews();
      this.renderModelPreviews();
    } catch (error) {
      console.error('Error initializing renderer:', error);
      this.isInitializing = false;
    }
  }

  private cleanupRenderer(): void {
    if (!this.renderer) return;

    if (this.previewGeometry) {
      this.previewGeometry.dispose();
      this.previewGeometry = null;
    }

    try {
      const gl = this.renderer.getContext();
      const ext = (gl as any).getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    } catch (e) {
      console.warn('Error forcing context loss:', e);
    }

    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.previewMesh = null;
  }

  private renderAllMaterialPreviews(): void {
    if (!this.isBrowser || !this.isInitialized || this.isInitializing) return;

    this.isInitializing = true;
    const materials = this.getAllMaterials();
    const BATCH_SIZE = 10;

    materials.forEach((material, i) => {
      const batchIndex = Math.floor(i / BATCH_SIZE);
      setTimeout(() => {
        this.renderMaterialPreview(material);
        if (i === materials.length - 1) {
          this.isInitializing = false;
          this.changeDetectorRef.detectChanges();
        }
      }, batchIndex * 100 + (i % BATCH_SIZE) * 20);
    });

    setTimeout(() => {
      this.isInitializing = false;
      this.changeDetectorRef.detectChanges();
    }, materials.length * 30 + 500);
  }

  private renderMaterialPreview(material: ResourceItem): void {
    if (!this.renderer || !this.scene || !this.camera || !this.previewMesh || material.type !== 'material') return;

    try {
      // Asegurarnos de que el preview mesh está en la escena
      if (!this.scene.children.includes(this.previewMesh)) {
        this.scene.add(this.previewMesh);
      }

      this.previewMesh.material = material.resource as Material;

      // Fondo transparente para materiales
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.render(this.scene, this.camera);
      const dataUrl = this.renderer.domElement.toDataURL('image/png');
      this.materialManager.saveMaterialPreview(material.id, dataUrl);
      material.preview = dataUrl;
      this.changeDetectorRef.detectChanges();
    } catch (error) {
      console.error('Error rendering material preview:', error);
      if (material.resource instanceof MeshStandardMaterial && material.resource.color) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = `#${material.resource.color.getHexString()}`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/png');
          this.materialManager.saveMaterialPreview(material.id, dataUrl);
          material.preview = dataUrl;
          this.changeDetectorRef.detectChanges();
        }
      }
    }
  }

  private renderModelPreviews(): void {
    if (!this.isBrowser || !this.isInitialized || this.isInitializing) return;

    this.isInitializing = true;
    const models = this.getAllModels();
    const BATCH_SIZE = 5;

    models.forEach((model, i) => {
      const batchIndex = Math.floor(i / BATCH_SIZE);
      setTimeout(() => {
        this.renderModelPreview(model);
        if (i === models.length - 1) {
          this.isInitializing = false;
          this.changeDetectorRef.detectChanges();
        }
      }, batchIndex * 100 + (i % BATCH_SIZE) * 20);
    });

    setTimeout(() => {
      this.isInitializing = false;
      this.changeDetectorRef.detectChanges();
    }, models.length * 30 + 500);
  }

  private renderModelPreview(model: ResourceItem): void {
    if (!this.renderer || !this.scene || !this.camera || model.type !== 'model') return;

    try {
      // Clear previous objects
      while (this.scene.children.length > 0) {
        const child = this.scene.children[0];
        if (child instanceof DirectionalLight || child instanceof AmbientLight) break;
        this.scene.remove(child);
      }

      // Remove preview mesh if it exists
      if (this.previewMesh) {
        this.scene.remove(this.previewMesh);
      }

      const modelInfo = model.resource as CachedModelInfo;
      const object = modelInfo.rootObject.clone();

      // Center and scale the object
      const box = new Box3().setFromObject(object);
      const center = box.getCenter(new Vector3());
      const size = box.getSize(new Vector3());

      object.position.sub(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = this.camera!.fov * (Math.PI / 180);
      const distance = maxDim / (2 * Math.tan(fov / 2));
      this.camera!.position.z = distance * 1.5;
      this.camera!.lookAt(0, 0, 0);

      object.rotation.y = Math.PI / 4;
      this.scene.add(object);

      // Asegurarnos de que el fondo sea gris para los modelos
      this.renderer.setClearColor(0x222222);
      this.renderer.render(this.scene, this.camera);
      const dataUrl = this.renderer.domElement.toDataURL('image/png');
      this.modelPreviews.set(model.id, dataUrl);
      model.preview = dataUrl;
      this.changeDetectorRef.detectChanges();

      this.scene.remove(object);

      // Restaurar el preview mesh si existe
      if (this.previewMesh) {
        this.scene.add(this.previewMesh);
      }
    } catch (error) {
      console.error('Error rendering model preview:', error);
    }
  }

  private getAllMaterials(): ResourceItem[] {
    const materials: ResourceItem[] = [];
    const collectMaterials = (folders: ResourceFolder[]) => {
      folders.forEach(folder => {
        materials.push(...folder.items.filter(item => item.type === 'material'));
        collectMaterials(folder.subfolders);
      });
    };
    collectMaterials(this.rootFolders);
    return materials;
  }

  private getAllModels(): ResourceItem[] {
    const models: ResourceItem[] = [];
    const collectModels = (folders: ResourceFolder[]) => {
      folders.forEach(folder => {
        models.push(...folder.items.filter(item => item.type === 'model'));
        collectModels(folder.subfolders);
      });
    };
    collectModels(this.rootFolders);
    return models;
  }

  private processTextureUpdates(textures: Map<string, any>) {
    const rootFolder = this.findFolder('/');
    if (!rootFolder) return;

    const textureItems = Array.from(textures.entries()).map(([id, info]) => {
      let preview: string | undefined;
      const texture = info.resource as Texture;

      // Intentar obtener la URL de la textura de diferentes formas
      if (texture && texture.image) {
        if (texture.image instanceof HTMLImageElement) {
          preview = texture.image.src;
        } else if ('src' in texture.image) {
          preview = (texture.image as any).src;
        } else if (texture.image instanceof HTMLCanvasElement) {
          preview = texture.image.toDataURL();
        } else if (texture.image instanceof ImageBitmap) {
          // Para ImageBitmap, crear un canvas temporal
          const canvas = document.createElement('canvas');
          canvas.width = texture.image.width;
          canvas.height = texture.image.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(texture.image, 0, 0);
            preview = canvas.toDataURL('image/png');
          }
        }
      }

      // Si no se pudo obtener la preview, intentar obtenerla del servicio
      if (!preview) {
        preview = this.textureManager.getTexturePreview(id);
      }

      // Si aún no hay preview y tenemos una textura válida
      if (!preview && texture && texture.image) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          try {
            // Intentar dibujar la imagen de la textura
            if (texture.image instanceof HTMLImageElement && texture.image.complete) {
              ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
              preview = canvas.toDataURL('image/png');
            } else if (texture.image instanceof HTMLImageElement) {
              // Si la imagen no está cargada, esperar a que se cargue
              texture.image.onload = () => {
                ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
                const newPreview = canvas.toDataURL('image/png');
                this.textureManager.saveTexturePreview(id, newPreview);
                // Actualizar el item existente
                const existingItem = this.findItemById(id);
                if (existingItem) {
                  existingItem.preview = newPreview;
                  this.changeDetectorRef.detectChanges();
                }
              };
            } else {
              ctx.drawImage(texture.image as any, 0, 0, canvas.width, canvas.height);
              preview = canvas.toDataURL('image/png');
            }

            if (preview) {
              this.textureManager.saveTexturePreview(id, preview);
            }
          } catch (error) {
            console.warn('Error creating texture preview:', error);
          }
        }
      }

      return {
        id,
        name: info.name,
        type: 'texture' as const,
        preview,
        resource: texture,
        path: `/${info.name}`
      };
    });

    // Actualizar o añadir las texturas
    textureItems.forEach(item => {
      const existingItem = this.findItemById(item.id);
      if (existingItem) {
        // Actualizar el item existente solo si hay cambios
        if (existingItem.preview !== item.preview || existingItem.name !== item.name) {
          existingItem.preview = item.preview;
          existingItem.name = item.name;
          existingItem.resource = item.resource;
        }
      } else {
        // Añadir nuevo item
        rootFolder.items.push(item);
      }
    });

    // Actualizar la estructura
    this.resourceStructure.next([...this.rootFolders]);
    this.changeDetectorRef.detectChanges();
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
      } else if (type === 'model') {
        preview = this.modelPreviews.get(id);
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
          modelInfo.textures.forEach(textureId => {
            const textureInfo = this.textureManager.textures.get(textureId);
            if (textureInfo) {
              // Eliminar la textura de la carpeta raíz si existe
              rootFolder.items = rootFolder.items.filter(item => item.id !== textureId);

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
        }
      });
    }

    this.resourceStructure.next([...this.rootFolders]);
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