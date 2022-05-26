import { _decorator, Component, isValid } from "cc";
import { Time } from "./Time";

export class WaitForSeconds {
    public seconds: number;
    public useUnscaleTime: boolean = true;
    constructor(seconds: number, useUnscaleTime: boolean = true) {
        this.seconds = seconds;
        this.useUnscaleTime = useUnscaleTime;
    }
}

export class WaitForNextFrame {
}

export const waitForNextFrame = new WaitForNextFrame();

export class WaitUntil {

    public condition: (c: Coroutine) => Promise<any>;

    constructor(condition: (c: Coroutine) => Promise<any>) {
        this.condition = condition;
    }
}

@_decorator.ccclass
export class Coroutine extends Component {

    private m_abortController: AbortController = new AbortController();
    public get abortSignal(): AbortSignal {
        return this.m_abortController.signal;
    }

    private m_exitCalled: boolean = false;

    public onExit: (id: string, arg?: any) => void;

    public routineId: string;

    public cancelRoutine() {
        this.m_abortController.abort();
    }

    private exitRoutine(exitArg: any = null) {
        if (this.m_exitCalled) return;

        this.m_exitCalled = true;
        this.onExit && this.onExit(this.routineId, exitArg);
        this.destroy();
    }

    public executeRoutine(gen: Generator) {

        if (this.abortSignal) {

            if (this.abortSignal.aborted) {
                this.exitRoutine();
                return;
            }

            this.abortSignal.addEventListener('abort', () => {
                if (this._timeEnd) {
                    this._timeEnd();
                    this._timeEnd = null;
                }
            });
        }

        this.asyncRoutine(gen);
    }

    private _timeEnd: () => void = null;
    private _useUnscaleTime: boolean = false;
    private _timePassed: number = 0;
    private _timeDuration: number = 0;

    protected update(dt: number) {
        if (this._timeEnd) {
            this._timePassed += this._useUnscaleTime ? Time.unscaledDeltaTime : Time.deltaTime;
            if (this._timePassed >= this._timeDuration) {
                this._timeEnd();
                this._timeEnd = null;
            }
        }
    }

    public async asyncWaitForSeconds(delay: number, useUnscaleTime: boolean = true): Promise<void> {

        if (!(isValid(this) && isValid(this.node))) return null;

        this._timePassed = 0;
        this._timeDuration = delay;
        this._useUnscaleTime = useUnscaleTime;

        return new Promise((resolve, reject) => {

            this._timeEnd = () => {
                resolve();
            }

            if (this.abortSignal) {
                if (this.abortSignal.aborted) {
                    this._timeEnd = null;
                    resolve();
                }
            }
        });
    }

    private async asyncRoutine(gen: Generator) {

        // await this.asyncWaitForSeconds(0);

        const genStack: Array<Generator> = [];
        genStack.push(gen);

        while (true) {

            if (!(isValid(this) && isValid(this.node))) break;

            if (!genStack || !genStack.length) break;

            if (this.abortSignal && this.abortSignal.aborted) break;

            let current = genStack[genStack.length - 1];

            let vd;

            try {
                vd = current.next(this);
            }
            catch (e) {
                console.log(e);
                if (e) {
                    genStack.pop();
                    continue;
                }
            }

            if (vd.done) {
                genStack.pop();
            }

            const value = vd.value;

            if (value instanceof WaitForSeconds) {
                await this.asyncWaitForSeconds(value.seconds, value.useUnscaleTime);
                continue;
            }

            if (value instanceof WaitForNextFrame) {
                await this.asyncWaitForSeconds(0, true);
                continue;
            }

            if (value instanceof WaitUntil) {
                await value.condition(this);
                continue;
            }

            // how to detect instanceof GeneratorFunction ?
            if (typeof value == 'object') {
                genStack.push(value);
            }
        }

        this.exitRoutine(null);
    }

    protected onDestroy(): void {
        this.onExit = null;
        this._timeEnd = null;
    }
}

interface CoroutineExecutorBinder {
    m_coroutineExecutor: CoroutineExecutor;
}

class CoroutineExecutor {

    private m_routineId: number = 1;
    public genRoutineId(): string {
        return 'routine_' + this.m_routineId++;
    }

    private _routines: Coroutine[] = [];
    public routineExitCallback: (id: string, exitArg?: any) => void = null;

    private onCoroutineExitCallback(id: string, exitArg?: any): void {
        this.routineExitCallback && this.routineExitCallback(id, exitArg);
    }

    public static with(c: Component): CoroutineExecutor {

        // prevent mess when node destroy
        if (!(isValid(c) && isValid(c.node))) return null;

        const binder: CoroutineExecutorBinder = c as any as CoroutineExecutorBinder;
        if (binder.m_coroutineExecutor) return binder.m_coroutineExecutor;

        binder.m_coroutineExecutor = new CoroutineExecutor();
        return binder.m_coroutineExecutor;
    }

    public StartCoroutine(c: Component, gen: Generator): string {
        const routine: Coroutine = c.addComponent(Coroutine);
        routine.routineId = this.genRoutineId();
        this._routines.push(routine);

        routine.onExit = this.onRoutineExit.bind(this);
        routine.executeRoutine(gen);

        return routine.routineId;
    }

    public StopCoroutine(id: string): boolean {
        let has = false;
        if (id && id.length) {
            for (let i = this._routines.length - 1; i >= 0; i--) {
                const routine = this._routines[i];
                if (routine && routine.routineId == id) {
                    routine.cancelRoutine();
                    has = true;
                    break;
                }
            }
        }
        return has;
    }

    public IsCoroutineRunning(id: string): boolean {
        let has = true;
        for (let i = this._routines.length - 1; i >= 0; i--) {
            const routine = this._routines[i];
            if (routine && routine.routineId == id) {
                has = true;
                break;
            }
        }
        return has;
    }

    private onRoutineExit(id: string, exitArg: any) {
        if (id && id.length) {

            let routineExist = false;
            for (let i = this._routines.length - 1; i >= 0; i--) {
                const routine = this._routines[i];
                if (routine && routine.routineId == id) {
                    this._routines.splice(i, 1);
                    routineExist = true;
                    break;
                }
            }

            routineExist && this.onCoroutineExitCallback(id, exitArg);
        }
    }

    public StopAllCoroutines() {
        for (let i = this._routines.length - 1; i >= 0; i--) {
            const routine = this._routines[i];
            if (routine) {
                routine.cancelRoutine();
            }
        }
        this._routines.length = 0;
    }
}

export function CoroutineSetExitCall(c: Component, exitCall: (id: string, exitArg?: any) => void): void {
    let exec = CoroutineExecutor.with(c);
    if (exec) exec.routineExitCallback = exitCall;
}

export function CoroutineRemoveExitCall(c: Component): void {
    let exec = CoroutineExecutor.with(c);
    if (exec) exec.routineExitCallback = null;
}

export function StartCoroutine(c: Component, gen: Generator): string {
    let exec = CoroutineExecutor.with(c);
    return exec ? exec.StartCoroutine(c, gen) : null;
}

export function StopCoroutine(c: Component, id: string): boolean {
    let exec = CoroutineExecutor.with(c);
    return exec ? exec.StopCoroutine(id) : false;
}

export function IsCoroutineRunning(c: Component, id: string): boolean {
    let exec = CoroutineExecutor.with(c);
    return exec ? exec.IsCoroutineRunning(id) : false;
}

export function StopAllCoroutines(c: Component): void {
    let exec = CoroutineExecutor.with(c);
    exec && exec.StopAllCoroutines();
}