import { Material, MeshStandardMaterial, Color } from 'three';
import { ResourceService } from '../../editor/resource-manager/resource.service';

/**
 * MaterialManager acts as an intermediary between components and the ResourceService.
 * Components can request materials by ID without directly depending on ResourceService.
 */
export class MaterialManager {
    private static instance: MaterialManager;
    private resourceService: ResourceService;

    private constructor() {
        // This will be set by the EditorService
    }

    /**
     * Get the singleton instance of MaterialManager
     */
    public static getInstance(): MaterialManager {
        if (!MaterialManager.instance) {
            MaterialManager.instance = new MaterialManager();
        }
        return MaterialManager.instance;
    }

    /**
     * Set the ResourceService instance
     * This should be called by the EditorService during initialization
     */
    public setResourceService(resourceService: ResourceService): void {
        this.resourceService = resourceService;
    }

    /**
     * Get a material by ID
     * @param id The material ID
     * @param defaultColor Default color to use if creating a new material
     * @returns The material
     */
    public getMaterial(id: string, defaultColor: string = '#ffffff'): Material {
        if (!id) {
            return new MeshStandardMaterial({ color: new Color(defaultColor) });
        }

        if (this.resourceService) {
            const material = this.resourceService.getMaterial(id);
            if (material) {
                return material;
            }
        }

        // Create a new material if not found
        const newMaterial = new MeshStandardMaterial({ 
            color: new Color(defaultColor),
            name: id
        });

        // Register with ResourceService if available
        if (this.resourceService) {
            this.resourceService.addMaterial(newMaterial, id);
        }

        return newMaterial;
    }

    /**
     * Release a material
     * @param id The material ID
     */
    public releaseMaterial(id: string): void {
        if (id && this.resourceService) {
            this.resourceService.releaseMaterial(id);
        }
    }
} 