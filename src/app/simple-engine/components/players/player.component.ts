import { VRM, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";
import { Component } from "../../core/component";
import { engine } from "../../core/engine/engine";
import { GameObject } from "../../core/gameobject";
import { retargetAnimForVRM } from "../../loaders/mixamoAnimLoader-PRO";

interface OnAvatarChangeEvent {
    (newAvatar: VRM, url: string): void;
}

export class PlayerComponent extends Component {

    currentAnim: string;
    fadeDuration = 0.2;

    vrm: VRM;
    animationsMap: Map<string, THREE.AnimationAction> = new Map();
    mixer: THREE.AnimationMixer;

    // to subscribe to action changes
    private onAvatarChange: OnAvatarChangeEvent[] = [];

    constructor(object?: GameObject) {
        super("PlayerComponent", object);
    }

    public start(): void { }

    changeAnim(animName: any, blend = true) {
        if (this.currentAnim == animName) {
            const current = this.animationsMap.get(this.currentAnim);
            current.reset().play();
            return;
        }
        const toPlayAction = this.animationsMap.get(animName);
        const currentAction = this.animationsMap.get(this.currentAnim);

        if (currentAction) currentAction.fadeOut(this.fadeDuration);

        if (blend) toPlayAction.reset().fadeIn(this.fadeDuration).play();
        else toPlayAction.reset().play();

        this.currentAnim = animName;
    }

    async changeAvatar(vrm: VRM, url?: string) {
        // Update current avatar if exists
        if (this.vrm) {
            this.gameObject.remove(this.vrm.scene);
            this.onDestroy();
            engine.scene.remove(this.vrm.scene);

            vrm.scene.position.copy(new THREE.Vector3(0, 0, 0));
            vrm.scene.quaternion.copy(new THREE.Quaternion(0, 0, 0, 1));
        }

        // Adjust VRM rotation to the same of parent gameobject
        vrm.scene.rotateY(Math.PI);

        // enable shadows
        vrm.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
            }
        });

        this.vrm = vrm;
        this.mixer = new THREE.AnimationMixer(this.vrm.scene);
        this.gameObject.add(vrm.scene);

        // enable shadows
        vrm.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
            }
        });

        await this.fillAnimationsMap();

        this.onAvatarChange.forEach((onChange) => {
            onChange(this.vrm, url);
        });
    }

    private async fillAnimationsMap() {
        const idle = await retargetAnimForVRM("assets/anims/idle.fbx", this.vrm);
        const idleWider = await retargetAnimForVRM("assets/anims/idleWiderArms.fbx", this.vrm);
        const walk = await retargetAnimForVRM("assets/anims/walk.fbx", this.vrm);
        const run = await retargetAnimForVRM("assets/anims/run.fbx", this.vrm);
        const jump = await retargetAnimForVRM("assets/anims/jump.fbx", this.vrm);
        const falling = await retargetAnimForVRM("assets/anims/falling.fbx", this.vrm);
        const fallingHigh = await retargetAnimForVRM("assets/anims/falling-high.fbx", this.vrm);
        const throwAnim = await retargetAnimForVRM("assets/anims/throw.fbx", this.vrm);
        this.animationsMap.set("Idle", this.mixer.clipAction(idle));
        this.animationsMap.set("IdleWider", this.mixer.clipAction(idleWider));
        this.animationsMap.set("Walk", this.mixer.clipAction(walk));
        this.animationsMap.set("Run", this.mixer.clipAction(run));
        this.animationsMap.set("Jump", this.mixer.clipAction(jump));
        this.animationsMap.set("Fall", this.mixer.clipAction(falling));
        this.animationsMap.set("FallHigh", this.mixer.clipAction(fallingHigh));
        this.animationsMap.set("Throw", this.mixer.clipAction(throwAnim));
        console.log(this.animationsMap);
    }

    public async addUserAnimToMap(animName: string, url: string) {
        try {
            const anim = await retargetAnimForVRM(url, this.vrm);
            this.animationsMap.set(animName, this.mixer.clipAction(anim));
        } catch (e) {
            console.error(e);
        }
    }

    public update(deltaTime: number): void {
        this.mixer.update(deltaTime);
        this.vrm.update(deltaTime);
    }

    public override lateUpdate(deltaTime: number): void {

    }

    public onDestroy(): void {
        if (this.vrm && this.vrm.scene) {
            VRMUtils.deepDispose(this.vrm.scene);
        }
    }

    /**
     * Resetea el componente a sus valores por defecto
     */
    public reset(): void {
        console.log('PlayerComponent.reset');
        
        // Detener todas las animaciones actuales
        if (this.mixer) {
            this.animationsMap.forEach(action => {
                action.stop();
            });
        }
        
        // Restaurar valores por defecto
        this.fadeDuration = 0.2;
        
        // Actualizar los metadatos si existen
        if (Reflect.hasMetadata("isEditable", this, "fadeDuration")) {
            Reflect.defineMetadata("isEditable", { type: "number", name: "Fade Duration", value: this.fadeDuration }, this, "fadeDuration");
        }
        
        // No eliminamos el VRM actual, ya que eso requeriría cargar uno nuevo
        // Solo reseteamos las animaciones si hay un VRM cargado
        if (this.vrm && this.mixer) {
            // Cambiar a la animación por defecto
            this.changeAnim("Idle");
        }
    }

    /**
     * Limpia los recursos asociados al componente
     */
    public cleanup(): void {
        console.log('PlayerComponent.cleanup');
        
        // Limpiar el mixer de animaciones
        if (this.mixer) {
            // Detener todas las animaciones
            this.animationsMap.forEach(action => {
                action.stop();
            });
            
            // Limpiar el mapa de animaciones
            this.animationsMap.clear();
            
            this.mixer = null;
        }
        
        // Limpiar el VRM
        if (this.vrm) {
            // Eliminar la escena del VRM del gameObject
            if (this.vrm.scene && this.vrm.scene.parent) {
                this.vrm.scene.parent.remove(this.vrm.scene);
            }
            
            // Eliminar la escena del VRM de la escena principal
            if (this.vrm.scene && engine.scene.children.includes(this.vrm.scene)) {
                engine.scene.remove(this.vrm.scene);
            }
            
            // Limpiar todos los recursos del VRM
            VRMUtils.deepDispose(this.vrm.scene);
            
            this.vrm = null;
        }
        
        // Limpiar los callbacks
        this.onAvatarChange = [];
    }

    public subscribeToAvatarChange(callback: OnAvatarChangeEvent) {
        this.onAvatarChange.push(callback);
    }
}
