import { _decorator, Component, Enum, Vec3 } from "cc";
const { ccclass, property } = _decorator;

enum EMoveState {
    None,
    Moving,
    Paused
}

export enum EScaleFunc {
    Linear,
    QuadraticEaseIn,
    QuadraticEaseOut,
    QuadraticEaseInOut,

    CubicEaseIn,
    CubicEaseOut,
    CubicEaseInOut,

    QuarticEaseIn,
    QuarticEaseOut,
    QuarticEaseInOut,

    QuinticEaseIn,
    QuinticEaseOut,
    QuinticEaseInOut,

    SineEaseIn,
    SineEaseOut,
    SineEaseInOut
}

const halfPi = Math.PI * 0.5;
const runAwayDuration = 1;

function EaseInPower(progress: number, power: number): number { return Math.pow(progress, power); }

function EaseOutPower(progress: number, power: number): number { let sign = power % 2 == 0 ? -1 : 1; return (sign * (Math.pow(progress - 1, power) + sign)); }

function EaseInOutPower(progress: number, power: number): number {
    progress *= 2.0;
    if (progress < 1) {
        return Math.pow(progress, power) / 2.0;
    }
    else {
        let sign = power % 2 == 0 ? -1 : 1;
        return (sign / 2.0 * (Math.pow(progress - 2, power) + sign * 2));
    }
}

function LinearFunc(progress: number): number { return progress; }

/// <summary>
/// A quadratic (x^2) progress scale function that eases in.
/// </summary>
function QuadraticEaseInFunc(progress: number): number { return EaseInPower(progress, 2); }

/// <summary>
/// A quadratic (x^2) progress scale function that eases out.
/// </summary>
function QuadraticEaseOutFunc(progress: number): number { return EaseOutPower(progress, 2); }

/// <summary>
/// A quadratic (x^2) progress scale function that eases in and out.
/// </summary>
function QuadraticEaseInOutFunc(progress: number): number { return EaseInOutPower(progress, 2); }

/// <summary>
/// A cubic (x^3) progress scale function that eases in.
/// </summary>
function CubicEaseInFunc(progress: number): number { return EaseInPower(progress, 3); }

/// <summary>
/// A cubic (x^3) progress scale function that eases out.
/// </summary>
function CubicEaseOutFunc(progress: number): number { return EaseOutPower(progress, 3); }

/// <summary>
/// A cubic (x^3) progress scale function that eases in and out.
/// </summary>
function CubicEaseInOutFunc(progress: number): number { return EaseInOutPower(progress, 3); }

/// <summary>
/// A quartic (x^4) progress scale function that eases in.
/// </summary>
function QuarticEaseInFunc(progress: number): number { return EaseInPower(progress, 4); }

/// <summary>
/// A quartic (x^4) progress scale function that eases out.
/// </summary>
function QuarticEaseOutFunc(progress: number): number { return EaseOutPower(progress, 4); }

/// <summary>
/// A quartic (x^4) progress scale function that eases in and out.
/// </summary>
function QuarticEaseInOutFunc(progress: number): number { return EaseInOutPower(progress, 4); }

/// <summary>
/// A quintic (x^5) progress scale function that eases in.
/// </summary>
function QuinticEaseInFunc(progress: number): number { return EaseInPower(progress, 5); }

/// <summary>
/// A quintic (x^5) progress scale function that eases out.
/// </summary>
function QuinticEaseOutFunc(progress: number): number { return EaseOutPower(progress, 5); }

/// <summary>
/// A quintic (x^5) progress scale function that eases in and out.
/// </summary>
function QuinticEaseInOutFunc(progress: number): number { return EaseInOutPower(progress, 5); }

/// <summary>
/// A sine progress scale function that eases in.
/// </summary>
function SineEaseInFunc(progress: number): number { return Math.sin(progress * halfPi - halfPi) + 1; }

/// <summary>
/// A sine progress scale function that eases out.
/// </summary>
function SineEaseOutFunc(progress: number): number { return Math.sin(progress * halfPi); }

/// <summary>
/// A sine progress scale function that eases in and out.
/// </summary>
function SineEaseInOutFunc(progress: number): number { return (Math.sin(progress * Math.PI - halfPi) + 1) / 2; }

@ccclass
export class HermiteMove extends Component {

    @property({ type: Enum(EScaleFunc), visible: true })
    private _scaleFuncType: EScaleFunc = EScaleFunc.Linear;

    public get scaleFuncType(): EScaleFunc { return this._scaleFuncType; }
    public set scaleFuncType(v: EScaleFunc) {
        this._scaleFuncType = v;
    }

    private get scaleFunc(): (progress: number) => number {

        switch (this._scaleFuncType) {
            case EScaleFunc.Linear:
                return LinearFunc;
            case EScaleFunc.QuadraticEaseIn:
                return QuadraticEaseInFunc;
            case EScaleFunc.QuadraticEaseOut:
                return QuadraticEaseOutFunc;
            case EScaleFunc.QuadraticEaseInOut:
                return QuadraticEaseInOutFunc;
            case EScaleFunc.CubicEaseIn:
                return CubicEaseInFunc;
            case EScaleFunc.CubicEaseOut:
                return CubicEaseOutFunc;
            case EScaleFunc.CubicEaseInOut:
                return CubicEaseInOutFunc;
            case EScaleFunc.QuarticEaseIn:
                return QuarticEaseInFunc;
            case EScaleFunc.QuarticEaseOut:
                return QuarticEaseOutFunc;
            case EScaleFunc.QuarticEaseInOut:
                return QuarticEaseInOutFunc;
            case EScaleFunc.QuinticEaseIn:
                return QuinticEaseInFunc;
            case EScaleFunc.QuinticEaseOut:
                return QuinticEaseOutFunc;
            case EScaleFunc.QuinticEaseInOut:
                return QuinticEaseInOutFunc;
            case EScaleFunc.SineEaseIn:
                return SineEaseInFunc;
            case EScaleFunc.SineEaseOut:
                return SineEaseOutFunc;
            case EScaleFunc.SineEaseInOut:
                return SineEaseInOutFunc;
        }
        return LinearFunc;
    }

    private _state: EMoveState = EMoveState.None;
    private _duration: number;

    private _completion: (h: HermiteMove) => void;
    private _timePassed: number;
    private _timeToPause: number;
    private _points: Array<Vec3>;

    public get moveable(): boolean {
        return this._points != null && this._points.length >= 2;
    }

    public stop(): void {
        this._timePassed = 0;
        this._state = EMoveState.None;
    }

    private _vec3Tmp: Vec3 = new Vec3();
    private _vec3Tmp0: Vec3 = new Vec3();
    private _vec3Tmp1: Vec3 = new Vec3();
    private _vec3Tmp2: Vec3 = new Vec3();
    private _vec3Tmp3: Vec3 = new Vec3();
    public pointOnHermite(pointList: Array<Vec3>, progress_: number): Vec3 {
        var progress = this.scaleFunc(progress_);

        const ret = this._vec3Tmp;

        if (pointList.length == 2) {
            ret.set(pointList[1]);
            ret.subtract(pointList[0]);
            ret.multiplyScalar(progress);
            ret.add(pointList[0]);
            return ret.clone();
        }

        let idx = 0;
        let segmentCount = pointList.length - 1;
        for (var i = 0; i < segmentCount; i++) {
            if (progress >= i / segmentCount
                && progress < (i + 1) / segmentCount) {
                idx = i;
                break;
            }
        }

        var t = (progress - (idx / segmentCount)) * segmentCount;
        if (t < 0) t = 0;
        if (t > 1) t = 1;

        const m0 = this._vec3Tmp0;
        // determine control points of segment
        if (idx > 0) {
            m0.set(pointList[idx + 1]);
            m0.subtract(pointList[idx - 1]);
            m0.multiplyScalar(0.5);
        }
        else {
            m0.set(pointList[idx + 1]);
            m0.subtract(pointList[idx]);
        }

        const m1 = this._vec3Tmp1;
        if (idx < pointList.length - 2) {
            m1.set(pointList[idx + 2]);
            m1.subtract(pointList[idx]);
            m1.multiplyScalar(0.5);
        }
        else {
            m1.set(pointList[idx + 1]);
            m1.subtract(pointList[idx]);
        }

        const t2 = t * t;
        const t3 = t2 * t;

        const p0 = this._vec3Tmp2;
        const p1 = this._vec3Tmp3;
        p0.set(pointList[idx]);
        p1.set(pointList[idx + 1]);

        ret.set(Vec3.ZERO);

        p0.multiplyScalar(2.0 * t * t * t - 3.0 * t * t + 1.0);
        m0.multiplyScalar(t * t * t - 2.0 * t * t + t);
        p1.multiplyScalar(-2.0 * t * t * t + 3.0 * t * t);
        m1.multiplyScalar(t * t * t - t * t);

        ret.add(p0).add(m0).add(p1).add(m1);

        return ret.clone();
    }

    public setupPoints(...points: Array<Vec3>): void {
        this._state = EMoveState.None;

        if (this._points == null) this._points = [];
        this._points.length = 0;
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (p) this._points.push(p);
        }
    }

    public runArray(
        points: Array<Vec3>,
        duration: number,
        completion: (h: HermiteMove) => void = null) {
        this.setupPoints(...points);
        this._timePassed = 0;
        this._duration = duration;
        this._completion = completion;
        this._state = EMoveState.Moving;
    }

    public run3(
        point0: Vec3,
        point1: Vec3,
        point2: Vec3,
        duration: number,
        completion: (h: HermiteMove) => void = null) {
        this.setupPoints(point0, point1, point2);
        this._timePassed = 0;
        this._duration = duration;
        this._completion = completion;
        this._state = EMoveState.Moving;
    }

    public run2(
        point0: Vec3,
        point1: Vec3,
        duration: number,
        completion: (h: HermiteMove) => void = null) {
        this.setupPoints(point0, point1);
        this._timePassed = 0;
        this._duration = duration;
        this._completion = completion;
        this._state = EMoveState.Moving;
    }

    private _updatePos: Vec3 = new Vec3();
    public updatePosition(progress: number): boolean {
        if (progress <= 1) {
            this._updatePos.set(this.pointOnHermite(this._points, progress));
        }
        else {
            this._updatePos.set(this._points[this._points.length - 1]);
        }

        this.node.position = this._updatePos;

        return (progress >= 1);
    }

    public runAway() {
        if (this._duration > 0 && this._timePassed > 0) {
            this._timePassed = this._timePassed / this._duration * runAwayDuration;
        }
        else {
            this._timePassed = 0;
        }
        this._duration = runAwayDuration;
    }

    public pauseMove(timeToPause: number = -0xff) {
        if (this._state == EMoveState.None) return;
        this._timeToPause = timeToPause;
        this._state = EMoveState.Paused;
    }

    public continueMove() {
        this._timeToPause = 0;
        this._state = EMoveState.Moving;
    }

    update(dt: number) {
        switch (this._state) {
            case EMoveState.Moving:
                {
                    this._timePassed += dt;
                    const isComplete = this.updatePosition(this._timePassed / this._duration);
                    if (isComplete) {
                        this._state = EMoveState.None;
                        this._completion && this._completion(this);
                    }
                }
                break;
            case EMoveState.Paused: {
                if (this._timeToPause == -0xff) {
                    // pause for ever until resume
                }
                else {
                    this._timeToPause -= dt;
                    if (this._timeToPause < 0) {
                        this._timeToPause = 0;
                        this._state = EMoveState.Moving;
                    }
                }
            }
                break;
            case EMoveState.None:
                break;
            default:
                break;
        }
    }
}