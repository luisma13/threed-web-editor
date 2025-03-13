import * as CANNON from "cannon-es";
import { BehaviorSubject } from "rxjs";
import * as THREE from "three";
import { GameObject } from "../gameobject";
import { EngineInput } from "../input";
import "reflect-metadata";

export var DEBUG = new BehaviorSubject<boolean>(false);

export abstract class EngineBase {

    readonly gameObjects: GameObject[] = [];

    // mixers for animations
    readonly mixers: THREE.AnimationMixer[] = [];

    // RENDER OBJECTS
    scene: THREE.Scene;

    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;

    // PHYSICS OBJECTS
    world: CANNON.World;

    PHYSICS_ENABLED = true;
    readonly PHYSIC_MATERIAL = new CANNON.Material({
        friction: 0, restitution: 0
    })
    readonly BODY_GROUND_CONTACT_MATERIAL = new CANNON.ContactMaterial(
        this.PHYSIC_MATERIAL,
        this.PHYSIC_MATERIAL,
        {}
    )

    // onGameobjectsChanged: BehaviorSubject<GameObject[]> = new BehaviorSubject(undefined);
    onGameObjectSelected: BehaviorSubject<GameObject> = new BehaviorSubject(undefined);
    onGameobjectCreated: BehaviorSubject<GameObject> = new BehaviorSubject(undefined);
    onGameobjectRemoved: BehaviorSubject<GameObject> = new BehaviorSubject(undefined);
    onGameobjectHerarchyChanged: BehaviorSubject<GameObject> = new BehaviorSubject(undefined);

    cannonDebugger: any;

    castShadows: boolean = true;

    // to manage editor scene
    draggingObject: boolean = false;

    // INPUT
    readonly input = EngineInput;

    init() {

    }

    update() {
    }

    addBody(body: CANNON.Body) {
        this.world.addBody(body);
    }

    removeBody(body: CANNON.Body) {
        this.world.removeBody(body);
    }

    onResize(event?: Event) {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    addGameObjects(...objects: GameObject[]) {
        this.gameObjects.push(...objects);
        const sceneObjects = [...objects.filter((object) => object.parentGameObject === undefined)];
        if (sceneObjects.length > 0) {
            this.scene.add(...sceneObjects as THREE.Object3D[]);
        }
        objects.forEach((gameobject) => {
            if (gameobject.rigidbody)
                this.addBody(gameobject.rigidbody)

            gameobject.getComponents().forEach((component) => {
                component.start();
            });

            gameobject.isAddedToScene = true;
            this.onGameobjectCreated.next(gameobject);
            gameobject.childrenGameObjects.forEach((child) => {
                this.addGameObjects(child);
            });
        });
    }

    findGameObjectByName(name: string) {
        return this.gameObjects.find((gameObject) => gameObject.name === name);
    }

    clearScene() {
        this.removeGameObjects(...this.gameObjects);

        this.scene?.clear();
        this.gameObjects.length = 0;

        this.scene = undefined;
        this.camera = undefined;
        this.renderer = undefined;
    }

    removeGameObjects(...gameobjects: GameObject[] | THREE.Object3D[]) {
        if (!gameobjects || gameobjects.length === 0 || !gameobjects[0])
            return;

        gameobjects.forEach((gameobject) => {
            if (!gameobject) return;
            
            if (gameobject.rigidbody)
                this.removeBody(gameobject.rigidbody)

            if (gameobject.getComponents) {
                gameobject.getComponents().forEach((component) => {
                    if (component && typeof component.onDestroy === 'function') {
                        component.onDestroy();
                    }
                });
            }

            this.onGameobjectRemoved.next(gameobject);

            // Check if children exists before iterating
            if (gameobject.children && Array.isArray(gameobject.children)) {
                // Create a copy of the array to avoid modification during iteration
                const childrenCopy = [...gameobject.children];
                childrenCopy.forEach((child) => {
                    if (child) {
                        this.removeGameObjects(child as GameObject);
                    }
                });
            }

            // Check if childrenGameObjects exists before iterating
            if (gameobject.childrenGameObjects && Array.isArray(gameobject.childrenGameObjects)) {
                // Create a copy of the array to avoid modification during iteration
                const childrenCopy = [...gameobject.childrenGameObjects];
                childrenCopy.forEach((child) => {
                    if (child) {
                        this.removeGameObjects(child);
                    }
                });
            }

            this.deepDelete3DObject(gameobject);
        });

        // Filter out any undefined or null gameobjects before checking includes
        const validGameObjects = this.gameObjects.filter(go => go);
        validGameObjects.forEach((gameobject) => {
            if (gameobjects.includes(gameobject)) {
                const index = this.gameObjects.indexOf(gameobject);
                if (index !== -1) {
                    this.gameObjects.splice(index, 1);
                }
            }
        });
    }

    setCastShadows(gameObject?: GameObject | THREE.Object3D, cast?: boolean) {
        const castShadows = (object: THREE.Object3D) => {
            object.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = cast || this.castShadows;
                }
            });
        }

        if (gameObject) {
            castShadows(gameObject);
        } else {
            this.scene.traverse((object) => {
                castShadows(object);
            });
        }
    }

    private deepDelete3DObject(gameobject: THREE.Object3D) {
        if (!gameobject) return;
        
        // Check if children exists and is an array
        if (gameobject.children && Array.isArray(gameobject.children)) {
            for (let i = gameobject.children.length - 1; i >= 0; i--) {
                const child = gameobject.children[i];
                if (child) {
                    if (child.children && child.children.length > 0) {
                        this.deepDelete3DObject(child);
                    }
                    
                    this.dispose(child);
                    gameobject.remove(child);
                }
            }
        }
        
        this.dispose(gameobject);
        
        // Safely remove from scene if scene exists
        if (this.scene) {
            this.scene.remove(gameobject);
        }
    }

    private dispose(object3D) {
        if (!object3D) return;
        
        const geometry = object3D.geometry;
        if (geometry) {
            geometry.dispose();
        }
        
        const skeleton = object3D.skeleton;
        if (skeleton) {
            skeleton.dispose();
        }
        
        const material = object3D.material;
        if (material) {
            if (Array.isArray(material)) {
                material.forEach((mat) => {
                    if (mat) this.disposeMaterial(mat);
                });
            }
            else if (material) {
                this.disposeMaterial(material);
            }
        }
    }

    private disposeMaterial(material) {
        if (!material) return;
        
        try {
            // Safely iterate through material properties
            if (material && typeof material === 'object') {
                Object.values(material).forEach((value: any) => {
                    if (value?.isTexture) {
                        const texture = value;
                        texture.dispose();
                    }
                });
            }
            
            if (material.isShaderMaterial) {
                const uniforms = material.uniforms;
                if (uniforms) {
                    Object.values(uniforms).forEach((uniform: any) => {
                        const value = uniform?.value;
                        if (value?.isTexture) {
                            const texture = value;
                            texture.dispose();
                        }
                    });
                }
            }
            
            // Finally dispose the material itself
            if (typeof material.dispose === 'function') {
                material.dispose();
            }
        } catch (error) {
            console.error('Error disposing material:', error);
        }
    }

    destroy() {
        this.input.destroy();
        this.clearScene();
    }
}