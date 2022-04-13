
import { _decorator, Component } from 'cc';
import { CameraMoveDebug } from './CameraMoveDebug';
import { CompActive } from './CompActive';
import { MapDataEditor } from './MapDataEditor';
import { MapTester } from './MapTester';
import { SwitcherGroup } from './SwitcherGroup';
const { ccclass, property } = _decorator;

export enum EMapEditorState {
    CameraMove,
    MapEdit,
    MapTest
}

@ccclass('StateChecker')
export class StateChecker extends Component {

    @property({ type: SwitcherGroup, visible: true })
    private _stateTg: SwitcherGroup = null;

    @property({ type: CameraMoveDebug, visible: true })
    private _canmeraMove: CameraMoveDebug = null;

    @property({ type: MapDataEditor, visible: true })
    private _mapEditor: MapDataEditor = null;

    @property({ type: MapTester, visible: true })
    private _mapTester: MapTester = null;

    public get state(): EMapEditorState {
        return this._stateTg.selectedIndex as EMapEditorState;
    }

    private _stateComps: CompActive[] = null;
    onGroupChanged(g: SwitcherGroup) {
        this._stateComps = this._stateComps || [
            this._canmeraMove,
            this._mapEditor,
            this._mapTester
        ];

        for (let i = 0; i < this._stateComps.length; i++) {
            const element = this._stateComps[i];
            element.compActive = g.selectedIndex == i;
        }
    }
}