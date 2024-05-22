import { AttributeType, Component } from "../../../vipe-3d-engine/core/component";
import { Action } from "./actions";

export class ChangeComponentAttributeAction extends Action<{ component: Component, attribute: AttributeType }> {
    override async executeUndo() {
        this.state.component[this.state.attribute.name] = this.state.attribute.value;
    }
    override async executeRedo() {
        this.state.component[this.state.attribute.name] = this.state.attribute.value;
    }
}