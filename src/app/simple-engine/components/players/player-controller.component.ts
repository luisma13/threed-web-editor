import { Vec3 } from "cannon-es";
import { Euler, Vector3 } from "three";
import { Component } from "../../core/component";
import { engine } from "../../core/engine/engine";
import { PlayerComponent } from "./player.component";
import { PlayerBaseState } from "./states/base.state";
import { IdleState } from "./states/idle.state";

interface OnActionChangeEvent {
    (newAnimation: string): void;
}

/**
 *
 * REQUIRE PLAYER COMPONENT ON GAMEOBJECT & PLAYER PHYSICS COMPONENT ON GAMEOBJECT
 *
 */
export class PlayerControllerComponent extends Component {
    currentState: PlayerBaseState;
    currentStateTime = 0;

    cameraTarget = new Vector3();

    shifthPressed = false;
    keysPressed = {};

    isMovementEnabled = true;
    startPosition: Vector3;
    startRotation: Euler;
    startCameraPosition: Vector3;
    startCameraTarget: Vector3;
    startCameraRotation: Euler;

    playerComponent: PlayerComponent;

    onActionChange: OnActionChangeEvent[] = [];

    private _boundKeyDown: (event: KeyboardEvent) => void;
    private _boundKeyUp: (event: KeyboardEvent) => void;

    constructor() {
        super("PlayerControllerComponent");
    }

    public start(): void {
        this.startPosition = this.gameObject.position.clone();
        this.startRotation = this.gameObject.rotation.clone();
        this.startCameraPosition = engine.camera.position.clone();
        this.startCameraTarget = engine.controls.target.clone();
        this.startCameraRotation = engine.camera.rotation.clone();

        this.playerComponent = this.gameObject.getComponent<PlayerComponent>(PlayerComponent);

        this.initKeyListeners();

        this.changeState(new IdleState(this));
    }

    changeState(state: PlayerBaseState) {
        if (state.action == this.currentState?.action) return;

        this.playerComponent.changeAnim(state.action);

        this.currentStateTime = 0;
        this.currentState = state;
        this.currentState.onInput(this.keysPressed, this.shifthPressed);
        this.currentState.onStateEnter();

        this.onActionChange.forEach((onChange) => {
            onChange(this.currentState.action);
        });
    }

    public update(deltaTime: number): void {
        if (!this.isMovementEnabled) {
            return;
        }

        this.currentState?.update(deltaTime);
        this.currentStateTime += deltaTime;
    }

    public override lateUpdate(deltaTime: number): void {
        const lastPos = this.gameObject.position.clone();
        this.gameObject.position.copy(
            new Vector3(this.gameObject.rigidbody.position.x, this.gameObject.rigidbody.position.y - 0.5, this.gameObject.rigidbody.position.z),
        );
        this.updateCameraTarget(lastPos);
    }

    setMovementEnabled(movementEnabled: boolean) {
        if (movementEnabled === false) {
            this.resetPosition();
        }

        this.isMovementEnabled = movementEnabled;
    }

    resetPosition() {
        this.gameObject.rigidbody.position = new Vec3(this.startPosition.x, this.startPosition.y, this.startPosition.z);
        this.gameObject.rigidbody.velocity = new Vec3(0, 0, 0);
        this.gameObject.position.copy(this.startPosition);
        this.gameObject.rotation.copy(this.startRotation);
        engine.camera.position.copy(this.startCameraPosition);
        engine.controls.target.copy(this.startCameraTarget);
        engine.camera.rotation.copy(this.startCameraRotation);
    }

    updateCameraTarget(lastPos: Vector3) {
        engine.camera.position.add(this.gameObject.position.clone().sub(lastPos));
        this.cameraTarget.copy(this.gameObject.position);
        this.cameraTarget.add(new Vector3(0, 1, 0));
        engine.controls.target = this.cameraTarget;
    }

    initKeyListeners() {
        this._boundKeyDown = this.handleKeyDown.bind(this);
        this._boundKeyUp = this.handleKeyUp.bind(this);
        
        document.addEventListener("keydown", this._boundKeyDown);
        document.addEventListener("keyup", this._boundKeyUp);
    }
    
    handleKeyDown(event: KeyboardEvent) {
        if (event.key.toLowerCase() == "b") {
            // const blendShapeComponent = this.gameObject.getComponent<BlendshapesService>(BlendshapesService);
            // blendShapeComponent.resetExpressions();
            // const randomIndex = Math.floor(Math.random() * blendShapeComponent.blendshapesList.length);
            // blendShapeComponent.setExpression(blendShapeComponent.blendshapesList[randomIndex], 1.0);
        } else {
            this.keysPressed[event.key.toLowerCase()] = true;
        }

        this.shifthPressed = event.shiftKey;
        this.currentState?.onInput(this.keysPressed, this.shifthPressed);
    }
    
    handleKeyUp(event: KeyboardEvent) {
        this.keysPressed[event.key.toLowerCase()] = false;

        this.shifthPressed = event.shiftKey;
        this.currentState?.onInput(this.keysPressed, this.shifthPressed);
    }

    public subscribeToActionChange(callback: OnActionChangeEvent) {
        this.onActionChange.push(callback);
    }

    public onDestroy(): void {
        this.cleanup();
    }
    
    /**
     * Resetea el componente a sus valores por defecto
     */
    public reset(): void {
        console.log('PlayerControllerComponent.reset');
        
        // Restaurar valores por defecto
        this.shifthPressed = false;
        this.keysPressed = {};
        this.isMovementEnabled = true;
        this.currentStateTime = 0;
        
        // Actualizar los metadatos si existen
        if (Reflect.hasMetadata("isEditable", this, "isMovementEnabled")) {
            Reflect.defineMetadata("isEditable", { type: "boolean", name: "Movement Enabled", value: this.isMovementEnabled }, this, "isMovementEnabled");
        }
        
        // Resetear la posición y rotación
        this.resetPosition();
        
        // Cambiar al estado inicial
        if (this.playerComponent) {
            this.changeState(new IdleState(this));
        }
    }
    
    public cleanup(): void {
        console.log('PlayerControllerComponent.cleanup');
        
        if (this._boundKeyDown) {
            document.removeEventListener("keydown", this._boundKeyDown);
            this._boundKeyDown = null;
        }
        
        if (this._boundKeyUp) {
            document.removeEventListener("keyup", this._boundKeyUp);
            this._boundKeyUp = null;
        }
        
        this.currentState = null;
        
        this.onActionChange = [];
        
        this.playerComponent = null;
        this.keysPressed = {};
    }
}
