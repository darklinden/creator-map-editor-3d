
import { _decorator, Component, Node, Input, input, EventMouse, geometry, Vec2, PhysicsSystem, Vec3 } from 'cc';
import { CompActive } from './CompActive';
import { MapDataEditor } from './MapDataEditor';

const { ccclass, property } = _decorator;

@ccclass('MapTester')
export class MapTester extends CompActive {

    @property({ type: MapDataEditor, visible: true })
    private _map: MapDataEditor = null;

    @property({ type: Node, visible: true })
    private _player: Node = null;

    @property({ type: Node, visible: true })
    private _des: Node = null;

    public set compActive(v: boolean) {
        this._componentActive = v;
        this._player && (this._player.active = v);
        this._des && (this._des.active = v);
        if (v) {
            input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        }
        else {
            input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        }
    }

    private _mouseDown: boolean = false;
    private onMouseDown(event: EventMouse) {
        if (this.compActive) return;
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

        const path = this._map.findPath(this._player.position, p);

        if (path && path.length) {
            this._path = path;
            this._timePassed = 0;
            this._moveDuration = (path.length - 1) * 0.3;
        }
    }

    private _timePassed: number = -1;
    private _moveDuration: number = 0;
    update(dt: number) {
        if (this._timePassed < 0) return;

        this._timePassed += dt;
        if (this._timePassed < this._moveDuration) {
            const process = this._timePassed / this._moveDuration;
            const sec = Math.floor((this._path.length - 1) * process);
            const ps = this._path[sec], pe = this._path[sec + 1];
            let pp = process - (sec / (this._path.length - 1));
            pp *= this._path.length - 1;
            this._player.position = ps.clone().add(pe.clone().subtract(ps).multiplyScalar(pp));
        }
        else {
            this._player.position = this._path[this._path.length - 1];
            this._des.active = false;
        }
    }
}
