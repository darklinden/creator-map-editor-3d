import { IMapPoint, MapPointType } from "./IMapPoint";

export class PathNode {
    public walkable: boolean;
    public parent: PathNode | null = null;
    public astar_len_to_start: number = 0;
    public astar_len_to_end: number = 0;
    public astar_cost_score: number = 0;
    public opened: boolean = false;
    public closed: boolean = false;

    public mapPoint: IMapPoint = null;
    public get x(): number { return this.mapPoint.cx; }
    public get y(): number { return this.mapPoint.cy; }

    constructor(x: number, y: number, walkable: boolean = true) {
        this.mapPoint = {
            type: MapPointType.PointOnly,
            cx: x,
            cy: y,
            x: 0,
            y: 0,
            z: 0
        };
        this.walkable = walkable;
    }

    clear() {
        this.parent = null;
        this.astar_len_to_start = 0;
        this.astar_len_to_end = 0;
        this.astar_cost_score = 0;
        this.opened = false;
        this.closed = false;
    }
}
