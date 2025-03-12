import * as THREE from 'three';
import { Component } from '../../core/component';
import { engine } from '../../core/engine/engine';

export class FirstPersonCameraComponent extends Component {
    private camera: THREE.PerspectiveCamera;
    private velocity: THREE.Vector3 = new THREE.Vector3();

    private moveSpeed: number = 5;
    private lookSpeed: number = 0.002;

    private euler = new THREE.Euler(0, 0, 0, 'YXZ');
    private quaternion = new THREE.Quaternion();

    private lastMouseX = 0;
    private lastMouseY = 0;
    
    // Flag para controlar si la cámara está activa
    private isCameraActive = false;
    
    // Flag para indicar si se estaba rotando la cámara
    private wasRotatingCamera = false;
    
    // Flag para deshabilitar temporalmente todos los eventos de la cámara
    private isEnabled = true;
    
    // Elemento DOM que contiene el viewport
    private viewportElement: HTMLElement | null = null;

    constructor() {
        super("FirstPersonCameraComponent");
    }

    /**
     * Configura el elemento del viewport para detectar clics
     * @param element Elemento DOM que contiene el viewport
     */
    public setViewportElement(element: HTMLElement): void {
        this.viewportElement = element;
    }

    /**
     * Habilita o deshabilita temporalmente los eventos de la cámara
     * @param enabled true para habilitar, false para deshabilitar
     */
    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        
        // Si se está deshabilitando, asegurarse de que la cámara no esté activa
        if (!enabled) {
            this.isCameraActive = false;
        }
    }

    public override start(): void {
        this.camera = engine.camera as THREE.PerspectiveCamera;
        engine.controls.enabled = false;
        
        // Añadir listener para detectar cuando se hace clic en el viewport
        if (typeof document !== 'undefined') {
            // Usar bind para mantener el contexto correcto
            const boundMouseDown = this.onMouseDown.bind(this);
            const boundMouseUp = this.onMouseUp.bind(this);
            
            document.addEventListener('mousedown', boundMouseDown);
            document.addEventListener('mouseup', boundMouseUp);
            
            // Guardar referencias a las funciones bound para poder eliminarlas después
            this['_boundMouseDown'] = boundMouseDown;
            this['_boundMouseUp'] = boundMouseUp;
        }
    }
    
    /**
     * Indica si se estaba rotando la cámara
     * @returns true si se estaba rotando la cámara, false en caso contrario
     */
    public wasRotating(): boolean {
        console.log("wasRotating check:", this.wasRotatingCamera);
        return this.wasRotatingCamera;
    }

    /**
     * Resetea el flag de rotación de cámara
     */
    public resetRotationFlag(): void {
        console.log("Resetting rotation flag from:", this.wasRotatingCamera, "to false");
        this.wasRotatingCamera = false;
    }

    private onMouseDown(event: MouseEvent): void {
        // Si la cámara está deshabilitada, no procesar eventos
        if (!this.isEnabled) return;
        
        // Si no hay un elemento de viewport configurado, usar comportamiento predeterminado
        if (!this.viewportElement) {
            this.isCameraActive = event.button === 0; // Solo para clic izquierdo
            return;
        }
        
        // Verificar si el clic fue dentro del viewport
        const target = event.target as HTMLElement;
        const isInsideViewport = this.viewportElement.contains(target);
        
        // Activar la cámara solo si el clic fue dentro del viewport y es clic izquierdo
        if (isInsideViewport && event.button === 0) {
            this.isCameraActive = true;
            this.wasRotatingCamera = false; // Inicialmente no se está rotando
        }
    }
    
    private onMouseUp(): void {
        // Si la cámara está deshabilitada, no procesar eventos
        if (!this.isEnabled) return;
        
        // No marcamos automáticamente que se estaba rotando la cámara aquí
        // Solo se marcará si realmente hubo movimiento en handleInput
        this.isCameraActive = false;
    }

    public override update(deltaTime: number): void {
        // Si la cámara está deshabilitada o se está arrastrando un objeto, no procesar eventos
        if (!this.isEnabled || engine.draggingObject)
            return;
        
        this.handleInput(deltaTime);
    }

    private handleInput(deltaTime: number): void {
        // Si la cámara está deshabilitada, no procesar eventos
        if (!this.isEnabled) return;
        
        const moveDirection = new THREE.Vector3();

        // space key event
        if (engine.input.keys.get(' ')) {
            this.camera.position.y += this.moveSpeed * deltaTime;
        }

        if (engine.input.keys.get('c')) {
            this.camera.position.y -= this.moveSpeed * deltaTime;
        }

        if (engine.input.keys.get('w')) {
            this.euler.setFromQuaternion(this.camera.quaternion);
            moveDirection.add(this.camera.getWorldDirection(new THREE.Vector3()));
        }
        if (engine.input.keys.get('s')) {
            this.euler.setFromQuaternion(this.camera.quaternion);
            moveDirection.sub(this.camera.getWorldDirection(new THREE.Vector3()));
        }
        if (engine.input.keys.get('a') || engine.input.keys.get('d')) {
            this.euler.setFromQuaternion(this.camera.quaternion);
            const cameraDirection = this.camera.getWorldDirection(new THREE.Vector3());
            const horizontalDirection = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();

            if (engine.input.keys.get('a')) {
                horizontalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
            } else if (engine.input.keys.get('d')) {
                horizontalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
            }

            moveDirection.add(horizontalDirection);
        }

        if (moveDirection.length() > 0) moveDirection.normalize();

        this.velocity.copy(moveDirection).multiplyScalar(this.moveSpeed * deltaTime);
        this.camera.position.add(this.velocity);

        // Solo procesar el movimiento de la cámara si está activa
        if (engine.input.mouseLeftDown && this.isCameraActive) {
            const deltaX = engine.input.mouse.x - this.lastMouseX;
            const deltaY = engine.input.mouse.y - this.lastMouseY;

            // Si hay movimiento significativo, marcar que se está rotando la cámara
            // Usamos un umbral más bajo para ser más sensibles al movimiento
            if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
                if (!this.wasRotatingCamera) {
                    console.log("Detectado movimiento de cámara:", deltaX, deltaY);
                    this.wasRotatingCamera = true;
                }
            }

            this.euler.setFromQuaternion(this.camera.quaternion);
            this.euler.y -= deltaX * this.lookSpeed;
            this.euler.x -= deltaY * this.lookSpeed;

            this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));

            this.quaternion.setFromEuler(this.euler);
            this.camera.quaternion.copy(this.quaternion);

            if (engine.input.mouseWheel !== 0) {
                this.moveSpeed += engine.input.mouseWheel * -0.005;
                this.moveSpeed = Math.min(20, Math.max(0.1, this.moveSpeed));
            }
        }

        this.lastMouseX = engine.input.mouse.x;
        this.lastMouseY = engine.input.mouse.y;
    }

    public override lateUpdate(deltaTime: number): void { }

    public override onDestroy(): void {
        engine.controls.enabled = true;
        
        // Eliminar los event listeners al destruir el componente
        if (typeof document !== 'undefined') {
            document.removeEventListener('mousedown', this['_boundMouseDown']);
            document.removeEventListener('mouseup', this['_boundMouseUp']);
        }
    }
}
