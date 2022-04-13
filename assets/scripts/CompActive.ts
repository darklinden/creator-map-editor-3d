import { _decorator, Component } from "cc";
const { ccclass } = _decorator;

@ccclass
export class CompActive extends Component {

    protected _componentActive: boolean = true;
    public get compActive(): boolean { return this._componentActive; }
    public set compActive(v: boolean) { this._componentActive = v; }

}