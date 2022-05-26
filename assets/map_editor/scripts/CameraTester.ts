import { _decorator, EventMouse } from "cc";
import { CameraMoveDebug } from "../../lib/CameraMoveDebug";
import { ICompActive } from "./ICompActive";
const { ccclass } = _decorator;

@ccclass
export class CameraTester extends CameraMoveDebug implements ICompActive {

    private _compActive: boolean = false;
    public compActive(): boolean { return this._compActive; }
    public setCompActive(v: boolean) { this._compActive = v; }

    protected onMouseMove(event: EventMouse) {
        if (!this.compActive()) return;

        super.onMouseMove(event);
    }

    update(dt: number) {
        if (!this.compActive()) return;

        super.update(dt);
    }
}
