import { _decorator, Component, EditBox } from 'cc';
import { MapDataEditor } from './MapDataEditor';
const { ccclass, property } = _decorator;

@ccclass
export class SetMapData extends Component {

    @property({ type: EditBox, visible: true })
    private _ebX: EditBox = null;

    @property({ type: EditBox, visible: true })
    private _ebY: EditBox = null;

    @property({ type: MapDataEditor, visible: true })
    private _map: MapDataEditor = null;

    public resetMap() {

        let text = "确定要重置 Map 数据吗？";
        if (confirm(text) == true) {
            try {
                const x = parseInt(this._ebX.string);
                const y = parseInt(this._ebY.string);
                this._map.resetMapData(x, y);
            } catch (error) {
                alert(error);
            }
        }
    }
}