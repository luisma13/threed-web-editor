import * as io from "socket.io-client";
import { PlayerComponent } from "../players/player.component";
import { SyncablePlayerReceiverComponent } from "./syncable-player-receiver.component";
import { Component } from "../../core/component";
import { engine } from "../../core/engine/engine";
import { GameObject } from "../../core/gameobject";
import { loadVRM } from "../../loaders/modelsLoader";
import { BlendshapesComponent } from "../players/blendshapes.components";

export class SyncableSceneComponent extends Component {
    
    socket: io.Socket;

    constructor() {
        super("SyncableSceneComponent");
    }

    public start(): void {
        try {
            this.socket = io.connect("http://127.0.0.1:3000");

            this.socket.on("initPlayer", (data, playerCount, playerIDs) => {
                for (let i = 0; i < playerCount; i++) {
                    if (playerIDs[i] !== data.id) {
                        this.loadNetworkPlayer(playerIDs[i]);
                    }
                }
            });

            this.socket.on("player connect", (objectId: string, clientsCount: number) => {
                this.loadNetworkPlayer(objectId);
            });
        } catch (error) {
            console.error("Error starting syncable-scene -", error);
        }
    }

    async loadNetworkPlayer(objectId) {
        const url = "https://usercollection.mypinata.cloud/ipfs/QmZan3z9nMTmEKSf99bPb8crKcYm4scMJd5YpCTN14B9mn/Crustybutt_da_gobblin_king.vrm";
        const { vrm } = await loadVRM(url);
        const player = new GameObject(vrm.scene);
        const playerComponent = new PlayerComponent();
        player.addComponent(playerComponent);
        await playerComponent.changeAvatar(vrm, url);
        player.addComponent(new BlendshapesComponent());

        const syncableObjectComponent = new SyncablePlayerReceiverComponent();
        syncableObjectComponent.setNetworkdData(this.socket, objectId);
        player.addComponent(syncableObjectComponent);

        engine.addGameObjects(player);
    }

    public update(deltaTime: number): void { }
    public override lateUpdate(deltaTime: number): void { }
    public onDestroy(): void { }
}
