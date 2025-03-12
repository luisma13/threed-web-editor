import { VRM } from '@pixiv/three-vrm';
import { Component } from '../../core/component';
import { PlayerComponent } from './player.component';

/**
 * 
 * REQUIRE PLAYER COMPONENT ON GAMEOBJECT
 * 
 */
export class BlendshapesComponent extends Component {

    public expressionsManager;
    public blendshapesList: string[] = [];
    private vrm: VRM;

    constructor() {
        super("BlendshapesComponent");
    }

    public start(): void {
        const playerComponent = this.gameObject.getComponent<PlayerComponent>(PlayerComponent);
        if (playerComponent.vrm) {
            this.init(playerComponent.vrm);
        }

        playerComponent.subscribeToAvatarChange((newAvatar: VRM) => {
            this.init(newAvatar);
        });
    }

    private init(vrm) {
        this.vrm = vrm;
        this.expressionsManager = this.vrm?.expressionManager;
        this.blendshapesList = [];
        for (let i = 0; i < this.expressionsManager?.expressions.length; i++) {
            this.blendshapesList.push(this.expressionsManager.expressions[i].expressionName);
        }
    }

    public update(deltaTime: number): void { }
    
    public override lateUpdate(deltaTime: number): void {
        
    }

    public onDestroy(): void { }

    setExpression(blendshapeName: string, weight: number) {
        this.vrm.expressionManager.setValue(blendshapeName, weight);
        this.vrm.expressionManager.update();
    }

    resetExpressions() {
        for (let i = 0; i < this.vrm.expressionManager.expressions.length; i++) {
            this.vrm.expressionManager.setValue(this.vrm.expressionManager.expressions[i].expressionName, 0.0);
        }
        this.vrm.expressionManager.update();
    }

}