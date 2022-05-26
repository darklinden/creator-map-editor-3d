
import { _decorator, Component, Node, Input, input, EventMouse, geometry, Vec2, PhysicsSystem, Vec3, IVec3Like } from 'cc';
import { StartCoroutine, StopCoroutine, waitForNextFrame } from './lib/Coroutine';
import { AStarPath } from './lib/pathfinding/AStarPath';
import { Time } from './lib/Time';

const { ccclass, property } = _decorator;

@ccclass
export class PathRunner extends Component {

    public speed: number = 5;
    public remainDistance: number = 0;
    public stopDistance: number = 2;

    _path: AStarPath = null;
    get path(): AStarPath {
        this._path = this._path || this.getComponent(AStarPath) || this.addComponent(AStarPath);
        return this._path;
    }

    private _routine: string = null;

    run(to: IVec3Like) {
        StopCoroutine(this, this._routine);
        this._routine = StartCoroutine(this, this.routineRunTo(to));
    }

    *routineRunTo(to: IVec3Like) {

        yield waitForNextFrame;

        const from = this.node.position;
        this.path.setStartPosition(from);
        this.path.setEndPosition(to);

        yield this.path.routineCaculatePath();

        let activePath = this.path.activePath;
        if (activePath && activePath.length) {
            let remainDistance = 0;
            let prePoint = activePath[0];
            for (let i = 1; i < activePath.length; i++) {
                remainDistance += Vec3.distance(activePath[i], prePoint);
                prePoint = activePath[i];
            }
            this.remainDistance = remainDistance;
        }

        const tmpVec0 = new Vec3();
        const tmpVec1 = new Vec3();
        const tmpVec2 = new Vec3();

        let index = 0;
        let stepPoint: IVec3Like = null;
        let normalVec: IVec3Like = null;
        while (this.remainDistance > this.stopDistance) {

            yield waitForNextFrame;

            if (this.remainDistance <= this.stopDistance) {
                break;
            }

            let fromPoint = stepPoint || activePath[index];
            let toPoint = activePath[index + 1];

            let distance = Time.deltaTime * this.speed;
            if (Vec3.squaredDistance(toPoint, fromPoint) > distance * distance) {
                if (!normalVec) {
                    normalVec = Vec3.normalize(tmpVec0, { x: toPoint.x - fromPoint.x, y: 0, z: toPoint.z - fromPoint.z });
                    const angle = Math.atan2(normalVec.x, normalVec.z) * 180 / Math.PI;
                    this.node.setRotationFromEuler(0, angle, 0);
                }
                stepPoint = Vec3.add(tmpVec1, Vec3.multiplyScalar(tmpVec2, normalVec, distance), fromPoint);
                this.node.setPosition(stepPoint.x, stepPoint.y, stepPoint.z);

                this.remainDistance -= distance;
            }
            else {
                index++;

                this.node.setPosition(toPoint.x, toPoint.y, toPoint.z);
                this.remainDistance -= Vec3.distance(toPoint, fromPoint);

                stepPoint = null;
                normalVec = null;
            }
        }
    }

    stop() {
        StopCoroutine(this, this._routine);
    }
}
