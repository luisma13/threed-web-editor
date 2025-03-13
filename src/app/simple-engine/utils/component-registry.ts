import { Component } from '../core/component';
import { AmbientLightComponent } from '../components/light/ambient-light.component';
import { DirectionalLightComponent } from '../components/light/directional-light.component';
import { SpotLightComponent } from '../components/light/spot-light.component';
import { GridHelperComponent } from '../components/helpers/grid-helper.component';
import { PlayerComponent } from '../components/players/player.component';
import { PlayerControllerComponent } from '../components/players/player-controller.component';
import { PlayerPhysicsComponent } from '../components/players/player-physics.component';
import { BlendshapesComponent } from '../components/players/blendshapes.components';
import { SyncablePlayerSenderComponent } from '../components/networking/syncable-player-sender.component';
import { SyncablePlayerReceiverComponent } from '../components/networking/syncable-player-receiver.component';
import { SyncableSceneComponent } from '../components/networking/syncable-scene.component';
import { EditableObjectComponent } from '../components/editor/editable-object.component';
import { EditableSceneComponent } from '../components/editor/editable-scene.component';
import { FirstPersonCameraComponent } from '../components/camera/first-camera.component';
import { ColliderCameraComponent } from '../components/camera/collider-camera.component';
import { RotateComponent } from '../components/transforms/rotate.component';
import { BoxComponent } from '../components/geometry/box.component';
import { BoxColliderComponent } from '../components/geometry/box-collider.component';
import { SphereComponent } from '../components/geometry/sphere.component';
import { PlaneComponent } from '../components/geometry/plane.component';
import { CylinderComponent } from '../components/geometry/cylinder.component';

// Tipo para el constructor de un componente
type ComponentConstructor = new () => Component;

/**
 * Registro de componentes para poder instanciarlos por su nombre de clase
 */
export class ComponentRegistry {
    private static instance: ComponentRegistry;
    private registry: Map<string, ComponentConstructor> = new Map();

    private constructor() {
        this.registerBuiltInComponents();
    }

    /**
     * Obtiene la instancia única del registro de componentes
     * @returns Instancia del registro de componentes
     */
    public static getInstance(): ComponentRegistry {
        if (!ComponentRegistry.instance) {
            ComponentRegistry.instance = new ComponentRegistry();
        }
        return ComponentRegistry.instance;
    }

    /**
     * Registra un nuevo tipo de componente
     * @param typeName Nombre del tipo de componente
     * @param constructor Constructor del componente
     */
    public registerComponent(typeName: string, constructor: ComponentConstructor): void {
        this.registry.set(typeName, constructor);
    }

    /**
     * Registra los componentes integrados en el engine
     */
    private registerBuiltInComponents(): void {
        // Luces
        this.registerComponent('AmbientLightComponent', AmbientLightComponent);
        this.registerComponent('DirectionalLightComponent', DirectionalLightComponent);
        this.registerComponent('SpotLightComponent', SpotLightComponent);

        // Helpers
        this.registerComponent('GridHelperComponent', GridHelperComponent);

        // Player
        this.registerComponent('PlayerComponent', PlayerComponent);
        this.registerComponent('PlayerControllerComponent', PlayerControllerComponent);
        this.registerComponent('PlayerPhysicsComponent', PlayerPhysicsComponent);
        this.registerComponent('BlendshapesComponent', BlendshapesComponent);

        // Networking
        this.registerComponent('SyncablePlayerSenderComponent', SyncablePlayerSenderComponent);
        this.registerComponent('SyncablePlayerReceiverComponent', SyncablePlayerReceiverComponent);
        this.registerComponent('SyncableSceneComponent', SyncableSceneComponent);

        // Editor
        this.registerComponent('EditableObjectComponent', EditableObjectComponent);
        this.registerComponent('EditableSceneComponent', EditableSceneComponent);

        // Camera
        this.registerComponent('FirstPersonCameraComponent', FirstPersonCameraComponent);
        this.registerComponent('ColliderCameraComponent', ColliderCameraComponent);

        // Transforms
        this.registerComponent('RotateComponent', RotateComponent);

        // Geometry
        this.registerComponent('BoxComponent', BoxComponent);
        this.registerComponent('BoxColliderComponent', BoxColliderComponent);
        this.registerComponent('SphereComponent', SphereComponent);
        this.registerComponent('PlaneComponent', PlaneComponent);
        this.registerComponent('CylinderComponent', CylinderComponent);
    }

    /**
     * Obtiene el constructor de un componente por su nombre de tipo
     * @param typeName Nombre del tipo de componente
     * @returns Constructor del componente o undefined si no se encuentra
     */
    public getComponentConstructor(typeName: string): ComponentConstructor | undefined {
        return this.registry.get(typeName);
    }

    /**
     * Crea una instancia de un componente por su nombre de tipo
     * @param typeName Nombre del tipo de componente
     * @returns Instancia del componente o undefined si no se encuentra
     */
    public createComponent(typeName: string): Component | undefined {
        const constructor = this.getComponentConstructor(typeName);
        if (constructor) {
            return new constructor();
        }
        return undefined;
    }
} 