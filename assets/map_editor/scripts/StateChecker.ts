
import { _decorator, Component } from 'cc';
import { SwitcherGroup } from '../../lib/SwitcherGroup';
import { CameraTester } from './CameraTester';
import { ICompActive } from './ICompActive';
import { MapDataEditor } from './MapDataEditor';
import { MapTester } from '../../MapTester';

const { ccclass, property } = _decorator;

export enum EMapEditorState {
    CameraMove,
    MapEdit,
    MapTest
}

@ccclass('StateChecker')
export class StateChecker extends Component {

    @property({ type: CameraTester, visible: true })
    private _canmeraMove: CameraTester = null;

    @property({ type: MapDataEditor, visible: true })
    private _mapEditor: MapDataEditor = null;

    @property({ type: MapTester, visible: true })
    private _mapTester: MapTester = null;

    private _stateComps: ICompActive[] = null;

    onGroupChanged(g: SwitcherGroup) {
        this._stateComps = this._stateComps || [
            this._canmeraMove,
            this._mapEditor,
            this._mapTester
        ];

        for (let i = 0; i < this._stateComps.length; i++) {
            const element = this._stateComps[i];
            element.setCompActive(g.selectedIndex == i);
        }
    }
}