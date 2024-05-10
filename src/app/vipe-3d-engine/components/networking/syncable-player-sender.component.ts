import { VRM } from "@pixiv/three-vrm";
import * as io from "socket.io-client";
import { PlayerControllerComponent } from "../players/player-controller.component";
import { PlayerComponent } from "../players/player.component";
import { Component } from "../../core/component";

export class SyncablePlayerSenderComponent extends Component {
    private socket: io.Socket;

    private playerComponent: PlayerComponent;
    private playerControllerComponent: PlayerControllerComponent;

    timer = 0;

    public start(): void {
        this.playerComponent = this.gameObject.getComponent(PlayerComponent);
        this.playerControllerComponent = this.gameObject.getComponent(PlayerControllerComponent);

        this.playerComponent.subscribeToAvatarChange((vrm: VRM, url) => {});
    }

    setNetworkdData(socket: io.Socket) {
        this.socket = socket;
    }

    public update(deltaTime: number): void {
        if (this.socket && this.timer > 1 / 120) {
            this.socket.emit(
                "updateClientPos",
                [this.gameObject.position.x, this.gameObject.position.y, this.gameObject.position.z],
                [this.gameObject.rotation.x, this.gameObject.rotation.y, this.gameObject.rotation.z],
                this.playerControllerComponent.currentState.action,
            );
            this.timer = 0;
        }
        this.timer += deltaTime;
    }

    public override lateUpdate(deltaTime: number): void {
        
    }

    public onDestroy(): void {}
}
