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
     * Obtiene la instancia del registro de componentes (Singleton)
     */
    public static getInstance(): ComponentRegistry {
        if (!ComponentRegistry.instance) {
            ComponentRegistry.instance = new ComponentRegistry();
        }
        return ComponentRegistry.instance;
    }

    /**
     * Registra los componentes integrados en el motor
     */
    private registerBuiltInComponents(): void {
        // Luces
        this.register('AmbientLightComponent', AmbientLightComponent);
        this.register('DirectionalLightComponent', DirectionalLightComponent);
        this.register('SpotLightComponent', SpotLightComponent);

        // Helpers
        this.register('GridHelperComponent', GridHelperComponent);

        // Jugadores
        this.register('PlayerComponent', PlayerComponent);
        this.register('PlayerControllerComponent', PlayerControllerComponent);
        this.register('PlayerPhysicsComponent', PlayerPhysicsComponent);
        this.register('BlendshapesComponent', BlendshapesComponent);

        // Networking
        this.register('SyncablePlayerSenderComponent', SyncablePlayerSenderComponent);
        this.register('SyncablePlayerReceiverComponent', SyncablePlayerReceiverComponent);
        this.register('SyncableSceneComponent', SyncableSceneComponent);

        // Editor
        this.register('EditableObjectComponent', EditableObjectComponent);
        this.register('EditableSceneComponent', EditableSceneComponent);

        // Cámara
        this.register('FirstPersonCameraComponent', FirstPersonCameraComponent);
        this.register('ColliderCameraComponent', ColliderCameraComponent);

        // Transformaciones
        this.register('RotateComponent', RotateComponent);
    }

    /**
     * Registra un componente en el registro
     * @param typeName Nombre del tipo de componente
     * @param constructor Constructor del componente
     */
    public register(typeName: string, constructor: ComponentConstructor): void {
        this.registry.set(typeName, constructor);
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