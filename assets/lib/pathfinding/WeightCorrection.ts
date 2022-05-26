import { AStarSettings } from "./Settings";

export class WeightCorrection {

    // 单个权重补正，同一个点允许重叠站位，但是使用权重补偿分散尽量不重叠, 权重补正略大于斜跨路径与横跨路径差值，逼迫横跨路径改道
    private static _weightsPerCorrect: number = Math.SQRT2 - 1 + 0.0001;
    public static get weightsPerCorrect(): number { return this._weightsPerCorrect; }
    public static set weightsPerCorrect(v: number) { this._weightsPerCorrect = v; }

    // 权重补正表 y: x: count 堆叠个数
    private static _weightsCorrection: Map<number, Map<number, number>> = new Map();
    public static clear(): void {
        if (!AStarSettings.weightCorrection) return;

        this._weightsCorrection.clear();
    }

    public static incWeight(x: number, y: number): void {
        if (!AStarSettings.weightCorrection) return;

        if (!this._weightsCorrection.has(y))
            this._weightsCorrection.set(y, new Map());
        let count = this._weightsCorrection.get(y).has(x) ? this._weightsCorrection.get(y).get(x) : 0;
        count++;
        this._weightsCorrection.get(y).set(x, count);
    }

    public static decWeight(x: number, y: number): void {
        if (!AStarSettings.weightCorrection) return;

        if (!this._weightsCorrection.has(y))
            this._weightsCorrection.set(y, new Map());
        let count = this._weightsCorrection.get(y).has(x) ? this._weightsCorrection.get(y).get(x) : 0;
        count = count - 1 < 0 ? 0 : count - 1;
        this._weightsCorrection.get(y).set(x, count);
    }

    public static getWeight(x: number, y: number): number {
        if (!AStarSettings.weightCorrection) return 0;

        let count = !this._weightsCorrection.has(y) ? 0 : !this._weightsCorrection.get(y).has(x) ? 0 : this._weightsCorrection.get(y).get(x);
        return count > 0 ? count * this.weightsPerCorrect : 0;
    }
}