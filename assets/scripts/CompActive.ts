import { _decorator, Component } from "cc";
const { ccclass } = _decorator;

@ccclass
export class CompActive extends Component {

    protected _compActive: boolean = true;
    public get compActive(): boolean { return this._compActive; }
    public set compActive(v: boolean) { this._compActive = v; }

}