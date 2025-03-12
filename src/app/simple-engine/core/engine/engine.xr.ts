import * as CANNON from "cannon-es";
import CannonDebugger from 'cannon-es-debugger';
import * as THREE from "three";
import { DEBUG, EngineBase } from "./engine.base";

export enum CollisionGroups {
    Default = 1,
    Characters = 2,
    TrimeshColliders = 4,
}

class EngineXR extends EngineBase {

    // to manage timeStep of cannon world physics
    private lastTime: number = 0;

    override init() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.xr.enabled = true;

        this.camera = new THREE.PerspectiveCamera(60.0, window.innerWidth / window.innerHeight, 0.01, 1000);

        this.scene = new THREE.Scene();

        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.world.defaultContactMaterial.friction = 0.1;

        this.cannonDebugger = CannonDebugger(this.scene, this.world, {
            onInit(body, mesh) {
                DEBUG.subscribe((debug) => {
                    mesh.visible = debug;
                })
            }
        });
    }

    override update() {
        const time = performance.now();
        const deltaTime = (time - this.lastTime) / 1000;

        for (const gameObject of this.gameObjects) {
            gameObject.update(deltaTime);
        }

        if (this.PHYSICS_ENABLED)
            this.world?.step(1 / 60, deltaTime, 3);

        for (const gameObject of this.gameObjects) {
            gameObject.lateUpdate(deltaTime);
        }
        
        this.mixers?.forEach(mixer => mixer.update(deltaTime));

        if (DEBUG.getValue())
            this.cannonDebugger.update();

        this.renderer.render(this.scene, this.camera);
        
        this.lastTime = time;
    }

    async browserHasImmersiveArCompatibility(): Promise<boolean> {
        if (window.navigator.xr) {
            const isSupported: boolean = await navigator.xr.isSessionSupported(
                "immersive-ar",
            );
            console.info(
                `[DEBUG] ${isSupported
                    ? "Browser supports immersive-ar"
                    : "Browser does not support immersive-ar"
                }`,
            );
            return isSupported;
        }
        return false;
    }

}

const engineXR = new EngineXR();
export { engineXR };

