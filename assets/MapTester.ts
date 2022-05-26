
import { _decorator, Component, Node, Input, input, EventMouse, geometry, Vec2, PhysicsSystem, Vec3 } from 'cc';
import { ICompActive } from './map_editor/scripts/ICompActive';
import { MapDataEditor } from './map_editor/scripts/MapDataEditor';
import { PathRunner } from './PathRunner';

const { ccclass, property } = _decorator;

@ccclass
export class MapTester extends Component implements ICompActive {

    @property({ type: MapDataEditor, visible: true })
    private _map: MapDataEditor = null;

    @property({ type: PathRunner, visible: true })
    private _player: PathRunner = null;

    @property({ type: Node, visible: true })
    private _des: Node = null;

    private _compActive: boolean = false;
    public compActive(): boolean { return this._compActive; }
    public setCompActive(v: boolean) {
        this._compActive = v;
        this._player && (this._player.node.active = v);
        this._des && (this._des.active = false);
        if (v) {
            this._player.path.mapData = this._map.mapData;
            input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        }
        else {
            input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        }
    }

    private _mouseDown: boolean = false;
    private onMouseDown(event: EventMouse) {
        if (!this.compActive()) return;
        const location = event.getLocation();
        this._mouseDown = true;
        this.onClickPos(location);
    }

    private _ray: geometry.Ray = new geometry.Ray();
    private onClickPos(location: Vec2) {
        if (!this._mouseDown) return;
        this._map._camera.screenPointToRay(location.x, location.y, this._ray);
        if (PhysicsSystem.instance.raycast(this._ray)) {
            const raycastResults = PhysicsSystem.instance.raycastResults;
            for (let i = 0; i < raycastResults.length; i++) {
                const item = raycastResults[i];
                if (item.collider.node == this.node) {
                    this.onPosClicked(item.hitPoint);
                    break;
                }
            }
        } else {
            console.log('raycast does not hit the target node !');
        }
    }

    private _path: Array<Vec3> = null;
    private onPosClicked(p: Vec3) {
        this._des.position = p;
        this._des.active = true;

        this._player.stop();
        this._player.run(p);
    }
}
