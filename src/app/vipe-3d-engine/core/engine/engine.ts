import * as CANNON from "cannon-es";
import CannonDebugger from "cannon-es-debugger";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { GammaCorrectionShader } from "three/examples/jsm/shaders/GammaCorrectionShader.js";
import { DEBUG, EngineBase } from "./engine.base";

export enum CollisionGroups {
    Default = 1,
    Characters = 2,
    TrimeshColliders = 4,
}

class Engine extends EngineBase {

    controls: OrbitControls;

    // Post-processing effects
    composer: EffectComposer;
    outlinePass: OutlinePass;
    fxaaPass: ShaderPass;

    // to manage timeStep of cannon world physics
    private lastTime: number = 0;

    rendererContainer: HTMLElement;

    override init(container?: HTMLElement, backgroundColour: string = "#fff") {
        this.rendererContainer = container;
        const width = container?.clientWidth || window.innerWidth;
        const height = container?.clientHeight || window.innerHeight;

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance"
        });

        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);
        this.renderer.toneMapping = THREE.LinearToneMapping;
        this.renderer.toneMappingExposure = 0.5;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;

        this.camera = new THREE.PerspectiveCamera(60.0, width / height, 0.01, 1000);

        this.scene = new THREE.Scene();

        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0); // m/s²
        this.world.defaultContactMaterial.friction = 0.1;
        this.world.addContactMaterial(this.BODY_GROUND_CONTACT_MATERIAL);

        this.cannonDebugger = CannonDebugger(this.scene, this.world, {
            onInit(body, mesh) {
                DEBUG.subscribe((debug) => {
                    mesh.visible = debug;
                })
            }
        });

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.camera.position.set(0.0, 1.0, 5.0);

        this.controls.screenSpacePanning = true;
        this.controls.target.set(0.0, 1.0, 0.0);
        this.controls.update();

        this.composer = new EffectComposer(this.renderer);
        this.composer.setSize(width, height);

        // Render pass for the scene
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Outline pass for selected objects
        this.outlinePass = new OutlinePass(
            new THREE.Vector2(width, height),
            this.scene,
            this.camera
        );
        this.outlinePass.edgeStrength = 2.5;
        this.outlinePass.edgeGlow = Number(0.3);
        this.outlinePass.edgeThickness = 1;
        this.outlinePass.pulsePeriod = Number(0.0);
        this.outlinePass.visibleEdgeColor.set('#ffffff');
        this.outlinePass.hiddenEdgeColor.set('#ffffff');
        this.composer.addPass(this.outlinePass);

        // Gamma correction pass
        const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
        this.composer.addPass(gammaCorrectionPass);

        // FXAA pass for anti-aliasing
        this.fxaaPass = new ShaderPass(FXAAShader);
        this.fxaaPass.material.uniforms['resolution'].value.set(1 / (width * window.devicePixelRatio), 1 / (height * window.devicePixelRatio));
        this.composer.addPass(this.fxaaPass);

        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();

        const neutralEnvironment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
        this.scene.environment = neutralEnvironment;
        this.scene.background = new THREE.Color(backgroundColour);

        this.input.init();

        if (container) {
            container.appendChild(this.renderer.domElement);
            this.onResize();
        }
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

        if (this.composer)
            this.composer.render();

        this.lastTime = time;
    }

    override onResize(event?: Event) {
        if (this.rendererContainer) {
            const width = this.rendererContainer.clientWidth;
            const height = this.rendererContainer.clientHeight;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
            this.composer.setSize(width, height);
            this.fxaaPass.material.uniforms['resolution'].value.set(1 / (width * window.devicePixelRatio), 1 / (height * window.devicePixelRatio));
        } else {
            super.onResize(event);
            this.fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * window.devicePixelRatio);
            this.fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * window.devicePixelRatio);
            if (this.composer)
                this.composer.setSize(window.innerWidth, window.innerHeight);
        }
    }

}

const engine = new Engine();
export { engine };

