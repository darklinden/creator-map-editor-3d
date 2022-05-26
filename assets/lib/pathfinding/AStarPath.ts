import Heap from "../Heap";
import { PathNode } from "./PathNode";
import { PathGrid } from "./PathGrid";
import { AStarSettings } from "./Settings";
import { Component, IVec3Like, Vec3, _decorator } from "cc";
import { backtrace, mapPointToPosition, positionToMapPoint } from "./Utils";
import { IMapData } from "./IMapData";
import { IMapPoint, MapPointType } from "./IMapPoint";
import { StartCoroutine, StopCoroutine, waitForNextFrame } from "../Coroutine";
import { WeightCorrection } from "./WeightCorrection";

/**
 * A* path-finder.
 * based upon https://github.com/bgrins/javascript-astar
 */

@_decorator.ccclass
export class AStarPath extends Component {

    // default size 10 * 10
    protected _mapData: IMapData = null;
    protected _grid: PathGrid = null;
    protected _scale: number = 1;

    public set mapData(mapData: IMapData) {
        this._mapData = mapData;
        this._grid = new PathGrid(mapData.width, mapData.height, mapData.matrix);
        this._scale = mapData.scale;
    }

    public get mapData(): IMapData {
        return this._mapData;
    }

    protected _pathComplete: boolean = false;
    public get pathComplete(): boolean { return this._pathComplete; }

    protected _activePath: Array<IMapPoint> = [];
    public get activePath(): Readonly<Array<IMapPoint>> { return this._activePath; }

    protected _startPoint: IMapPoint = { type: MapPointType.PointOnly, x: 0, y: 0, z: 0, cx: 0, cy: 0 };
    public get startPoint(): Readonly<IMapPoint> { return this._startPoint; }

    protected _endPoint: IMapPoint = { type: MapPointType.PointOnly, x: 0, y: 0, z: 0, cx: 0, cy: 0 };
    public get endPoint(): Readonly<IMapPoint> { return this._endPoint; }

    public setStartPosition(v: IVec3Like) {
        Vec3.copy(this._startPoint, v);
        positionToMapPoint(this._startPoint, this.mapData.width, this.mapData.height, this.mapData.scale);
    }

    public setStartPoint(v: IMapPoint) {
        this._startPoint.x = v.x;
        this._startPoint.y = v.y;
        this._startPoint.z = v.z;
        this._startPoint.cx = v.cx;
        this._startPoint.cy = v.cy;
    }

    public setEndPosition(v: IVec3Like) {
        Vec3.copy(this._endPoint, v);
        positionToMapPoint(this._endPoint, this.mapData.width, this.mapData.height, this.mapData.scale);
    }

    public setEndPoint(v: IMapPoint) {
        this._endPoint.x = v.x;
        this._endPoint.y = v.y;
        this._endPoint.z = v.z;
        this._endPoint.cx = v.cx;
        this._endPoint.cy = v.cy;
    }

    protected _routine: string = null;

    // return true if calculate started
    public calculatePath(): boolean {
        if (!this._mapData) return false;

        this._pathComplete = false;
        if (this._routine && this._routine.length) StopCoroutine(this, this._routine);
        this._routine = StartCoroutine(this, this.findPath());
        return true;
    }

    public *routineCaculatePath() {
        if (!this._mapData) return;

        this._pathComplete = false;
        StopCoroutine(this, this._routine);

        yield this.findPath();
    }

    protected expandPathPoint() {
        if (this.activePath.length) {
            const w = this.mapData.scale * AStarSettings.size;
            const h = this.mapData.scale * AStarSettings.size;

            const stepX = w / this.mapData.width;
            const stepY = h / this.mapData.height;

            for (let i = 0; i < this.activePath.length; i++) {
                if (this.activePath[i].type == MapPointType.PointOnly) {
                    this.activePath[i].x = -(w / 2) + this.activePath[i].cx * stepX + stepX / 2;
                    this.activePath[i].z = -(h / 2) + this.activePath[i].cy * stepY + stepY / 2;
                    this.activePath[i].y = 0;
                    this.activePath[i].type = MapPointType.Full;
                }
            }
        }
    }

    protected *findPath() {

        yield waitForNextFrame;

        const openList = new Heap((nodeA: PathNode, nodeB: PathNode) => { return nodeA.astar_cost_score - nodeB.astar_cost_score; });
        this._grid.clearCalc();

        const endX = this.endPoint.cx;
        const endY = this.endPoint.cy;

        const startNode = this._grid.getNodeAt(this.startPoint.cx, this.startPoint.cy);
        const endNode = this._grid.getNodeAt(this.endPoint.cx, this.endPoint.cy);

        let node: PathNode;
        let neighbors: PathNode[];

        //  Math.abs
        //   SQRT2 = Math.SQRT2
        //    node, neighbors, neighbor, i, l, x, y, ng;
        // set the `g` and `f` value of the start node to be 0
        startNode.astar_len_to_start = 0;
        startNode.astar_cost_score = 0;

        // push the start node into the open list
        openList.push(startNode);
        startNode.opened = true;

        let loopCounter = 0;

        // while the open list is not empty
        while (!openList.empty) {
            // pop the position of node which has the minimum `f` value.
            node = openList.pop() as PathNode;
            node.closed = true;

            // if reached the end position, construct the path and return it
            if (node === endNode) {
                this._activePath = backtrace(endNode, this._activePath);
                this.expandPathPoint();
                this._pathComplete = true;
                return;
            }

            // get neigbours of the current node
            neighbors = this._grid.getNeighbors(node, AStarSettings.diagonalMovement);
            for (let i = 0, l = neighbors.length; i < l; ++i) {

                loopCounter++;
                if (loopCounter >= AStarSettings.loopPerFrame) {
                    loopCounter = 0;
                    yield waitForNextFrame;
                }

                const neighbor = neighbors[i];

                if (neighbor.closed) {
                    continue;
                }

                const x = neighbor.x;
                const y = neighbor.y;

                // get the distance between current node and the neighbor
                // and calculate the next g score
                const ng = node.astar_len_to_start + ((x - node.x === 0 || y - node.y === 0) ? 1 : Math.SQRT2);

                // check if the neighbor has not been inspected yet, or
                // can be reached with smaller cost from the current node
                if (!neighbor.opened || ng < neighbor.astar_len_to_start) {
                    neighbor.astar_len_to_start = ng;
                    neighbor.astar_len_to_end = neighbor.astar_len_to_end || AStarSettings.weight * AStarSettings.heuristic(Math.abs(x - endX), Math.abs(y - endY));
                    neighbor.astar_cost_score = neighbor.astar_len_to_start + neighbor.astar_len_to_end + WeightCorrection.getWeight(x, y);
                    neighbor.parent = node;

                    if (!neighbor.opened) {
                        openList.push(neighbor);
                        neighbor.opened = true;
                    } else {
                        // the neighbor can be reached with smaller cost.
                        // Since its f value has been updated, we have to
                        // update its position in the open list
                        openList.updateItem(neighbor);
                    }
                }
            } // end for each neighbor
        } // end while not open list empty


        // fail to find the path
        this._activePath.length = 0;
        this._pathComplete = true;
        return;
    }





    // public findPath(start: IVec3Like, end: IVec3Like): IMapPoint[] {
    //     const startPoint = this.getPointByPos(start);
    //     const endPoint = this.getPointByPos(end);

    //     return this.findPathByPoint(startPoint, endPoint);
    // }

    // public findPathByPoint(start: IMapPoint, end: IMapPoint): IMapPoint[] {
    //     let p = astar.findPath(start.cx, start.cy, end.cx, end.cy, this.grid);
    //     // console.log('MapData.findPathByPoint', this.grid.toString([start.cx, start.cy], [end.cx, end.cy], p));

    //     let path: Array<IMapPoint> = [];
    //     if (p.length == 0) {
    //         // 无路径
    //     }
    //     else if (p.length <= 2) {
    //         // 路径太短，直接到
    //         path = [start, end];
    //     }
    //     else {
    //         path.push(start);
    //         for (let i = 0; i < p.length; i++) {
    //             const x = p[i];
    //             path.push(this.getPointByCell(x[0], x[1]));
    //         }
    //         path.push(end);
    //     }

    //     return path;
    // }

    // public areaRandPos(area: IMapArea): IMapPoint {
    //     const walkableCells: Array<[number, number]> = [];
    //     for (let x = 0; x < area.w; x++) {
    //         for (let y = 0; y < area.h; y++) {
    //             const cell: [number, number] = [area.topLeft.x + x, area.topLeft.y + y];
    //             if (!this.mapData.matrix[cell[1]][cell[0]]) {
    //                 walkableCells.push(cell);
    //             }
    //         }
    //     }

    //     if (walkableCells.length) {
    //         const choice = walkableCells[Math.floor(Math.random() * walkableCells.length)];
    //         const choicePos = this.getPointByCell(choice[0], choice[1]);
    //         console.log('MapData.areaRandPos', JSON.stringify(choicePos));
    //         return choicePos;
    //     }

    //     return { x: 0, y: 0, z: 0, cx: this.mapData.width / 2, cy: this.mapData.height / 2 };
    // }
}
