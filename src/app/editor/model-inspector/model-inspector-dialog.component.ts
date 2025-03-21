import { Component, Inject, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { ResourceItem } from '../resource-explorer/resource-explorer.component';
import { CachedModelInfo } from '../../simple-engine/managers/model-manager';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RendererPoolService } from '../services/renderer-pool.service';

@Component({
    selector: 'app-model-inspector-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTabsModule,
        MatFormFieldModule,
        MatInputModule,
        FormsModule
    ],
    templateUrl: './model-inspector-dialog.component.html',
    styleUrls: ['./model-inspector-dialog.component.scss']
})
export class ModelInspectorDialogComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('modelViewer') modelViewerRef!: ElementRef;

    modelInfo: CachedModelInfo;
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private controls!: OrbitControls;
    private animationMixer?: THREE.AnimationMixer;
    private currentAnimation?: THREE.AnimationAction;
    private animationFrameId?: number;
    private loadedModel?: THREE.Object3D;
    private isDisposed = false;

    constructor(
        public dialogRef: MatDialogRef<ModelInspectorDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { resource: ResourceItem },
        private rendererPool: RendererPoolService
    ) {
        this.modelInfo = data.resource.resource as CachedModelInfo;
        this.dialogRef.beforeClosed().subscribe(() => this.disposeResources());
    }

    ngOnInit() {
        if (this.isDisposed) return;
        this.initScene();
    }

    ngAfterViewInit() {
        if (this.isDisposed) return;
        requestAnimationFrame(() => {
            try {
                this.initRenderer();
                this.initCamera();
                this.initControls();
                this.loadModel();
                this.startAnimation();
                this.setupResizeHandler();
            } catch (error) {
                console.error('Error in initialization:', error);
                this.disposeResources();
            }
        });
    }

    private initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x2a2a2a);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(2, 1, 1);
        this.scene.add(directionalLight);
    }

    private setupResizeHandler() {
        if (!this.modelViewerRef) return;

        const resizeObserver = new ResizeObserver(() => {
            if (this.isDisposed || !this.renderer || !this.camera) return;

            const container = this.modelViewerRef.nativeElement;
            const rect = container.getBoundingClientRect();
            const width = Math.floor(rect.width);
            const height = Math.floor(rect.height);

            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            
            this.renderer.setSize(width, height, false);
        });

        resizeObserver.observe(this.modelViewerRef.nativeElement);
        this.dialogRef.beforeClosed().subscribe(() => resizeObserver.disconnect());
    }

    private initRenderer() {
        if (this.isDisposed || !this.modelViewerRef) return;

        this.renderer = this.rendererPool.acquireRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false,
            pixelRatio: Math.min(window.devicePixelRatio, 1.5)
        });
        
        const container = this.modelViewerRef.nativeElement;
        const rect = container.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);
        
        // Configurar el canvas del renderer
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        
        this.renderer.setSize(width, height, false);
        container.appendChild(this.renderer.domElement);
    }

    private initCamera() {
        if (this.isDisposed || !this.modelViewerRef) return;

        const width = this.modelViewerRef.nativeElement.clientWidth;
        const height = this.modelViewerRef.nativeElement.clientHeight;
        
        this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);
    }

    private initControls() {
        if (this.isDisposed || !this.camera || !this.renderer) return;

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enablePan = true;
        this.controls.enableZoom = true;
        this.controls.update();
    }

    private loadModel() {
        if (this.isDisposed || !this.scene) return;

        if (this.loadedModel) {
            this.disposeObject(this.loadedModel);
            this.scene.remove(this.loadedModel);
        }

        if (this.currentAnimation) {
            this.currentAnimation.stop();
            this.currentAnimation = undefined;
        }

        if (this.animationMixer) {
            this.animationMixer.stopAllAction();
            this.animationMixer = undefined;
        }

        this.loadedModel = this.modelInfo.rootObject.clone();
        this.scene.add(this.loadedModel);

        if (this.modelInfo.animations?.length) {
            this.animationMixer = new THREE.AnimationMixer(this.loadedModel);
        }

        this.centerAndScaleModel();
    }

    private centerAndScaleModel() {
        if (!this.loadedModel) return;

        const box = new THREE.Box3().setFromObject(this.loadedModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        this.loadedModel.position.sub(center);
        this.loadedModel.scale.multiplyScalar(2 / maxDim);
    }

    private animate = () => {
        if (this.isDisposed) return;

        if (this.controls) this.controls.update();
        if (this.animationMixer) this.animationMixer.update(0.016);
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
            this.animationFrameId = requestAnimationFrame(this.animate);
        }
    }

    private startAnimation() {
        if (!this.animationFrameId) {
            this.animate();
        }
    }

    private stopAnimation() {
        if (this.animationFrameId !== undefined) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = undefined;
        }
    }

    private disposeObject(obj: THREE.Object3D) {
        obj.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => this.disposeMaterial(material));
                    } else {
                        this.disposeMaterial(child.material);
                    }
                }
            }
        });
    }

    private disposeMaterial(material: THREE.Material) {
        Object.values(material).forEach(value => {
            if (value instanceof THREE.Texture) {
                value.dispose();
            }
        });
        material.dispose();
    }

    private disposeResources() {
        if (this.isDisposed) return;
        this.isDisposed = true;

        this.stopAnimation();

        if (this.currentAnimation) {
            this.currentAnimation.stop();
            this.currentAnimation = undefined;
        }

        if (this.animationMixer) {
            this.animationMixer.stopAllAction();
            this.animationMixer = undefined;
        }

        if (this.controls) {
            this.controls.dispose();
            this.controls = undefined;
        }

        if (this.loadedModel) {
            this.disposeObject(this.loadedModel);
            if (this.scene) {
                this.scene.remove(this.loadedModel);
            }
            this.loadedModel = undefined;
        }

        if (this.scene) {
            this.scene.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    this.disposeObject(object);
                }
            });
            this.scene = null!;
        }

        if (this.renderer) {
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
            this.rendererPool.releaseRenderer(this.renderer);
            this.renderer = null!;
        }

        this.camera = null!;
    }

    ngOnDestroy() {
        this.disposeResources();
    }

    getMaterialName(materialId: string): string {
        return materialId;
    }

    editMaterial(materialId: string) {
        console.log('Edit material:', materialId);
    }

    playAnimation(animation: THREE.AnimationClip) {
        if (!this.animationMixer) return;
        
        this.stopAnimation();
        this.currentAnimation = this.animationMixer.clipAction(animation);
        this.currentAnimation.play();
    }

    onPropertyChange() {
        // Handle property changes
    }

    save() {
        this.dialogRef.close(this.modelInfo);
    }

    close() {
        this.dialogRef.close();
    }

    handleAnimationControl(action: 'play' | 'stop', animation?: THREE.AnimationClip) {
        if (action === 'play' && animation) {
            this.playAnimation(animation);
        } else if (action === 'stop') {
            this.stopAnimation();
        }
    }
} 