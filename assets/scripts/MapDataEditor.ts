import { _decorator, Component, Texture2D, ImageAsset, __private, RenderTexture, MeshRenderer, EffectAsset, Material, Slider, input, Input, EventMouse, Camera, geometry, PhysicsSystem, Vec3, Vec2, Toggle, sys } from 'cc';
import { EDITOR } from 'cc/env';
import { CompActive } from './CompActive';
import { IMapData } from './IMapData';
import { MapTester } from './MapTester';
import { SwitcherGroup } from './SwitcherGroup';
import pathfinding from './PathFinding';

const { ccclass, property } = _decorator;
const { astar, Grid } = pathfinding;

type IMemoryImageSource = __private._cocos_core_assets_image_asset__IMemoryImageSource
const RGBA8888 = RenderTexture.PixelFormat.RGBA8888;
const PLANE_DEFAULT_SIZE = 10;

@ccclass('MapDataEditor')
export class MapDataEditor extends CompActive {

    @property({ type: Camera, visible: true })
    public _camera: Camera = null;

    @property({ type: EffectAsset, visible: true })
    private _transUnlit: EffectAsset = null;

    private _debugMesh: MeshRenderer = null;
    private get debugMesh(): MeshRenderer {
        this._debugMesh = this._debugMesh || this.getComponent(MeshRenderer) || this.getComponentInChildren(MeshRenderer);
        return this._debugMesh;
    }

    private _mapData: IMapData = null;
    public get mapData(): IMapData { return this._mapData; }

    private _markWalkable: number = -1;
    public onSetWalkable(g: SwitcherGroup) {
        this._markWalkable = g.selectedIndex;
    }

    // btn download
    public downloadMapData() {
        if (sys.isBrowser) {
            let i = new Blob([JSON.stringify(this._mapData)], { type: "application/json" });
            let o = document.createElement("a");
            o.download = 'mapData.json';
            o.innerHTML = "Download File";
            null != window.webkitURL ? o.href = window.webkitURL.createObjectURL(i)
                : (o.href = window.URL.createObjectURL(i), o.style.display = "none", document.body.appendChild(o));
            o.click();
            window.URL.revokeObjectURL(o.href);
        }
    }

    public resetMapData(x: number, y: number) {
        this._mapData = {
            width: x,
            height: y,
            matrix: null
        };

        this._mapData.matrix = new Array(y);
        for (let i = 0; i < y; i++) {
            this._mapData.matrix[i] = new Array(x);
            for (let j = 0; j < x; j++) {
                this._mapData.matrix[i][j] = 0;
            }
        }

        this.scheduleOnce(this.redraw, 0.1);
    }

    start(): void {
        if (EDITOR) return;

        this.loadStorage();
        if (!this._mapData) {
            this.resetMapData(16, 16);
        }
    }

    set compActive(v: boolean) {
        this._componentActive = v;
        if (v) {
            input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
            input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
            input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
        }
        else {
            input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
            input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
            input.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
        }
    }

    private _mouseDown: boolean = false;
    private onMouseDown(event: EventMouse) {
        if (this.compActive) return;
        const location = event.getLocation();
        this._mouseDown = true;
        this.onClickPos(location);
    }

    private onMouseMove(event: EventMouse) {
        if (this.compActive) return;
        const location = event.getLocation();
        this.onClickPos(location);
    }

    private onMouseUp(event: EventMouse) {
        this._mouseDown = false;
        this.saveStorage();
    }

    private _ray: geometry.Ray = new geometry.Ray();
    private onClickPos(location: Vec2) {
        if (!this._mouseDown) return;
        this._camera.screenPointToRay(location.x, location.y, this._ray);
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

    private bisection(nmin: number, nmax: number, count: number, x: number): number {
        const step = (nmax - nmin) / count;
        let low = 0; let high = count - 1;
        let mid: number;
        while (low < high) {
            mid = Math.floor((low + high) / 2);
            const pos = [nmin + mid * step, nmin + (mid + 1) * step];
            if (pos[0] < x && pos[1] >= x) {
                break;
            }
            else if (x <= pos[0]) {
                high = mid;
            }
            else {
                low = mid + 1;
            }
        }
        return low < mid ? mid : low;
    }

    public getCellByPos(p: Vec3): { x: number, y: number } {
        const x = this.node.worldScale.x * PLANE_DEFAULT_SIZE / 2;
        const y = this.node.worldScale.z * PLANE_DEFAULT_SIZE / 2;

        return {
            x: this.bisection(-x, x, this._mapData.width, p.x),
            y: this.bisection(-y, y, this._mapData.height, p.z),
        }
    }

    public getPosByCell(x: number, y: number): Vec3 {
        const width = this.node.worldScale.x * PLANE_DEFAULT_SIZE;
        const height = this.node.worldScale.z * PLANE_DEFAULT_SIZE;

        const stepX = width / this._mapData.width;
        const stepY = height / this._mapData.height;

        return new Vec3(
            -(width / 2) + x * stepX + stepX / 2,
            0,
            -(height / 2) + y * stepY + stepY / 2
        );
    }

    private onPosClicked(p: Vec3) {
        console.log('onPosClicked', p);
        const pos = this.getCellByPos(p);
        this._mapData.matrix[pos.y][pos.x] = this._markWalkable;

        this.redraw();
    }

    onEnable(): void {
        if (EDITOR) return;

        this.redraw();
    }

    private redraw() {
        this.scheduleOnce(() => {
            if (this._mapData && this.debugMesh) {
                this.makeDebugTexture(this._mapData as IMapData);
            }
        }, 0.1);
    }

    private makeDebugTexture(mapData: IMapData) {

        const newTexture = new Texture2D();
        let data: IMemoryImageSource = {
            _data: null,
            _compressed: false,
            width: mapData.width,
            height: mapData.height,
            format: RGBA8888
        }

        let buff = new Uint8Array(data.width * data.height * 4);

        for (let i = 0; i < data.width; i++) {
            for (let n = 0; n < data.height; n++) {
                let x: number;
                if (mapData.matrix[i][n]) {
                    x = 0;
                }
                else {
                    // walkable
                    x = i % 2 == n % 2 ? 160 : 200;
                }

                // R
                buff[i * data.width * 4 + n * 4 + 0] = x;
                // G
                buff[i * data.width * 4 + n * 4 + 1] = x;
                // B
                buff[i * data.width * 4 + n * 4 + 2] = x;
                // A
                buff[i * data.width * 4 + n * 4 + 3] = 160;
            }
        }

        data._data = buff;

        const image = new ImageAsset(data);
        newTexture.mipmaps = [image];
        newTexture.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);

        const mat = new Material();
        mat.initialize({ effectAsset: this._transUnlit, technique: 1, defines: { USE_TEXTURE: true } });
        mat.setProperty('mainTexture', newTexture);

        this.debugMesh.material = mat;
    }

    public onSlide(slide: Slider) {
        const p = this.node.position.clone();
        p.y = 0.01 + 2 * slide.progress;
        this.node.position = p;
    }

    private loadStorage() {
        if (!this._mapData) {
            const store = localStorage.getItem('MapData');
            if (store && store.length) {
                try {
                    this._mapData = JSON.parse(store) as IMapData;
                }
                catch (e) {
                    console.error(e);
                    // pass
                }
            }
        }
    }

    private saveStorage() {
        if (!this._mapData) return;

        const json = JSON.stringify(this._mapData);
        localStorage.setItem('MapData', json);
    }

    protected onDestroy(): void {
        this.saveStorage();
    }

    public findPath(start: Vec3, end: Vec3): Array<Vec3> {
        const startPos = this.getCellByPos(start);
        const endPos = this.getCellByPos(end);

        let matrix = this._mapData.matrix;
        let height = this._mapData.height;
        let width = this._mapData.width;
        let grid = new Grid(width, height, matrix);
        let p = astar.findPath(startPos.x, startPos.y, endPos.x, endPos.y, grid);
        console.log(grid.toString([startPos.x, startPos.y], [endPos.x, endPos.y], p));

        let path: Array<Vec3> = [];
        if (p.length == 0) {
            // 无路径
        }
        else if (p.length <= 2) {
            // 路径太短，直接到
            path = [start, end];
        }
        else {
            path.push(start);
            for (let i = 1; i < p.length - 1; i++) {
                const x = p[i];
                path.push(this.getPosByCell(x[0], x[1]));
            }
            path.push(end);
        }

        return path;
    }
}