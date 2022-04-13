import { _decorator, Component, Toggle } from 'cc';
const { ccclass } = _decorator;

@ccclass
export class NodeActive extends Component {

    public SetActiveByToggle(t: Toggle): void {
        this.node.active = t.isChecked;
    }

    public SetActive(v: boolean): void {
        this.node.active = v;
    }

    public SetActiveTrue(): void {
        this.node.active = true;
    }

    public SetActiveFalse(): void {
        this.node.active = false;
    }

    public Destroy(): void {
        this.node.destroy();
    }

    public SetActiveContrary(): void {
        this.node.active = !this.node.active;
    }
}