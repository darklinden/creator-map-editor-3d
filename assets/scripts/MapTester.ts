
import { _decorator, Component, Node, Input, input, EventMouse, geometry, Vec2, PhysicsSystem, Vec3 } from 'cc';
import { CompActive } from './CompActive';
import { HermiteMove } from './HermiteMove';
import { MapDataEditor } from './MapDataEditor';

const { ccclass, property } = _decorator;

@ccclass('MapTester')
export class MapTester extends CompActive {

    @property({ type: MapDataEditor, visible: true })
    private _map: MapDataEditor = null;

    @property({ type: HermiteMove, visible: true })
    private _player: HermiteMove = null;

    @property({ type: Node, visible: true })
    private _des: Node = null;

    public set compActive(v: boolean) {
        this._componentActive = v;
        this._player && (this._player.node.active = v);
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

        this._player.stop();

        const path = this._map.findPath(this._player.node.position, p);

        if (path && path.length) {
            this._player.runArray(path, (path.length - 1) * 0.3, h => {
                this._des.active = false;
            });
        }
    }
}
