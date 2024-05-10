import * as io from "socket.io-client";
import { Component } from "../../core/component";
import { engine } from "../../core/engine/engine";
import { loadVRM } from "../../loaders/modelsLoader";
import { PlayerComponent } from "../players/player.component";

export class SyncablePlayerReceiverComponent extends Component {
    private socket: io.Socket;
    private objectId: any;

    public start(): void {
        try {
            this.socket.on("playerPositions", (data: any) => {
                const netPlayerData = data[this.objectId];
                if (netPlayerData) {
                    this.gameObject.position.set(netPlayerData.position[0], netPlayerData.position[1], netPlayerData.position[2]);
                    this.gameObject.rotation.set(netPlayerData.rotation[0], netPlayerData.rotation[1], netPlayerData.rotation[2]);
                    this.gameObject.getComponent<PlayerComponent>(PlayerComponent).changeAnim(netPlayerData.action);
                }
            });

            this.socket.on("change avatar", async (objectId: string, url: string) => {
                if (objectId == this.objectId) {
                    const vrm = await loadVRM(url);
                    this.gameObject.getComponent<PlayerComponent>(PlayerComponent).changeAvatar(vrm, url);
                }
            });

            this.socket.on("player disconnect", (objectId: string) => {
                if (objectId == this.objectId) {
                    engine.removeGameObjects(this.gameObject);
                }
            });
        } catch (error) {
            console.error("Error starting syncable-player-receiver -", error);
        }
    }

    setNetworkdData(socket: io.Socket, objectId: any) {
        this.socket = socket;
        this.objectId = objectId;
    }

    public update(deltaTime: number): void { }

    public override lateUpdate(deltaTime: number): void {

    }

    public onDestroy(): void { }
}
