import { director, dragonBones, Node, TweenSystem, Animation, ISchedulable, sp, game } from "cc";
import { PREVIEW } from "cc/env";

/** muzzik
 * pause resume 
 // https://forum.cocos.org/t/topic/123701
 * # 前言
众所周知，我们想要全局暂停游戏的话只能调用 director.pause 或者  game.pause， 但这两个方法都有局限性，首先是不能排除部分节点不暂停，其次是新增节点也会随之暂停，适用性很窄

# 讲解
由于本人工作中需要用到游戏暂停效果，所以花了一上午写了个比较全面的游戏暂停方法
首先在3.x中，之前的各种管理器全部都变成了 system，而我们只需要分类管理即可，下面是运行时system
可以看到 system 一共有5个，分别是

Scheduler：定时器
AnimationManager：动画管理器
TweenSystem：缓动
PhysicsSystem：3d物理
PhysicsSystem2D：2d物理
SkeletonSystem: Spine
ArmatureSystem：龙骨
 */

class TimeCache {

    /**暂停状态 */
    public static isPaused = false;

    /**2d物理系统状态 */
    public static isPhysics2DRunning: boolean = null;

    /**3d物理系统状态 */
    public static isPhysics3DRunning: boolean = null;

    /**定时器对象列表 */
    public static schedulerPausedTargets: ISchedulable[];

    /**动画列表 */
    public static ccAnimationPausedTargets: Animation[] = [];

    /**缓动对象列表 */
    public static tweenPausedTargets: Node[];

    /**龙骨组件列表 */
    public static spinePausedTargets: sp.Skeleton[];

    /**龙骨组件列表 */
    public static dragonbonesPausedTargets: dragonBones.ArmatureDisplay[];
    public static dragonbonesTimeScales: Map<string, number /**float */> = new Map<string, number /**float */>();

    public static excludeNodes: Set<string> = new Set<string>();

    public static globalTimeScale: number = 1;

    public static globalRealDeltaTime: number = 0;
    public static globalDeltaTime: number = 0;
    public static globalRealtimeSinceStartup: number = 0;
}

export interface IPauseConfig {
    /**排除节点 */
    excludeNodes?: Node[];
    /**递归排除节点 */
    recurseExcludeNodes?: Node[];
}

export class Time {

    private static expandChildNode(parent: Node, all_children: Set<string>): void {
        if (!parent) return;

        all_children.add(parent.uuid);
        parent.children.forEach(v1 => {
            this.expandChildNode(v1, all_children);
        });
    }

    /**暂停游戏 */
    public static pause(config_?: IPauseConfig): void {

        if (TimeCache.isPaused) return;
        TimeCache.isPaused = true;

        TimeCache.excludeNodes.clear();
        if (config_) {
            if (config_.excludeNodes) {
                config_.excludeNodes.forEach(n => {
                    TimeCache.excludeNodes.add(n.uuid);
                });
            }
            if (config_.recurseExcludeNodes) config_.recurseExcludeNodes.forEach(v1 => {
                this.expandChildNode(v1, TimeCache.excludeNodes);
            });
        }

        // 暂停定时器
        TimeCache.schedulerPausedTargets = director.getScheduler().pauseAllTargets();
        for (let i = TimeCache.schedulerPausedTargets.length - 1; i >= 0; i--) {
            let s: any = TimeCache.schedulerPausedTargets[i];

            let n: string = s['node'] && s['node'] instanceof Node ? s.node.uuid : null;
            if (n && TimeCache.excludeNodes.has(n)) {
                director.getScheduler().resumeTarget(s);
                TimeCache.schedulerPausedTargets.splice(i, 1);
            }
        }

        // 暂停当前动画
        {
            let animationSystem = director.getSystem('animation' /**AnimationManager.ID*/);
            if (animationSystem) {
                TimeCache.ccAnimationPausedTargets.length = 0;
                // @ts-ignore
                const animStates = animationSystem["_anims"].array;
                for (let i = 0; i < animStates.length; i++) {
                    let as = animStates[i];

                    let n: string = as['_targetNode'] && as['_targetNode'] instanceof Node ? as['_targetNode'].uuid : null;
                    if (n && TimeCache.excludeNodes.has(n)) {
                        // pass
                    }
                    else {
                        // @ts-ignore
                        as._target && as._target.pause();
                        TimeCache.ccAnimationPausedTargets.push(as._target);
                    }
                }
            }
        }

        // 暂停Spine动画
        {
            let skeletonSystem = director.getSystem('SKELETON');
            if (skeletonSystem) {
                // @ts-ignore
                TimeCache.spinePausedTargets = Array.from(skeletonSystem._skeletons);
                for (let i = TimeCache.spinePausedTargets.length - 1; i >= 0; i--) {
                    const ske = TimeCache.spinePausedTargets[i];

                    let n: string = ske.node ? ske.node.uuid : null;
                    if (n && TimeCache.excludeNodes.has(n)) {
                        TimeCache.spinePausedTargets.splice(i, 1);
                    }
                    else {
                        // skeletonSystem only mark sp.Skeleton paused, if not running, do not pause it
                        if (!ske.paused) {
                            ske.paused = true;
                        }
                        else {
                            TimeCache.spinePausedTargets.splice(i, 1);
                        }
                    }
                }
            }
        }

        // 暂停龙骨动画
        {
            let dragonbonesSystem = director.getSystem('ARMATURE');
            if (dragonbonesSystem) {
                // @ts-ignore
                TimeCache.dragonbonesPausedTargets = Array.from(dragonbonesSystem._armatures);
                for (let i = TimeCache.dragonbonesPausedTargets.length - 1; i >= 0; i--) {
                    const dba = TimeCache.dragonbonesPausedTargets[i];

                    let n: string = dba.node ? dba.node.uuid : null;
                    if (n && TimeCache.excludeNodes.has(n)) {
                        TimeCache.dragonbonesPausedTargets.splice(i, 1);
                    }
                    else {
                        // dragonbonesSystem only mark ArmatureDisplay timeScale, if not running, do not change, if not 1, save the value
                        if (dba.timeScale) {
                            TimeCache.dragonbonesTimeScales.set(dba.uuid, dba.timeScale);
                            dba.timeScale = 0;
                        }
                        else {
                            TimeCache.dragonbonesPausedTargets.splice(i, 1);
                        }
                    }
                }
            }
        }

        // 暂停当前缓动
        {
            let tweenSystem = director.getSystem('TWEEN');
            if (tweenSystem) {
                // @ts-ignore
                let actionManager = tweenSystem.ActionManager;
                TimeCache.tweenPausedTargets = actionManager.pauseAllRunningActions();

                for (let i = TimeCache.tweenPausedTargets.length - 1; i >= 0; i--) {
                    let node = TimeCache.tweenPausedTargets[i];
                    // @ts-ignore
                    let n: string = node instanceof Node ? node.uuid : node.node && node.node instanceof Node ? node.node.uuid : null;

                    if (n && TimeCache.excludeNodes.has(n)) {
                        actionManager.resumeTarget(node);
                        TimeCache.tweenPausedTargets.splice(i, 1);
                    }
                }
            }
        }

        // 暂停2D物理系统
        {
            let physics2d = director.getSystem('PHYSICS_2D');
            // @ts-ignore
            if (physics2d && physics2d.enable) {
                // @ts-ignore
                TimeCache.isPhysics2DRunning = physics2d.enable;
                // @ts-ignore
                physics2d.enable = false;
            }
        }

        // 暂停3D物理系统
        {
            let physics3d = director.getSystem('PHYSICS');
            // @ts-ignore
            if (physics3d && physics3d.enable) {
                // @ts-ignore
                TimeCache.isPhysics3DRunning = physics3d.enable;
                // @ts-ignore
                physics3d.enable = false;
            }
        }
    }

    /**恢复游戏 */
    public static resume(): void {

        TimeCache.isPaused = false;

        // 恢复定时器
        director.getScheduler().resumeTargets(TimeCache.schedulerPausedTargets);

        // 恢复动画
        TimeCache.ccAnimationPausedTargets.forEach(v1 => {
            v1.resume();
        });

        // 恢复Spine动画
        {
            let skeletonSystem = director.getSystem('SKELETON');
            if (skeletonSystem) {
                if (TimeCache.spinePausedTargets) TimeCache.spinePausedTargets.forEach(ske => {
                    ske.paused = false;
                });
            }
        }

        // 恢复龙骨动画
        {
            let dragonbonesSystem = director.getSystem('ARMATURE');
            if (dragonbonesSystem) {
                if (TimeCache.dragonbonesPausedTargets) TimeCache.dragonbonesPausedTargets.forEach(dba => {
                    let save = TimeCache.dragonbonesTimeScales.get(dba.uuid);
                    TimeCache.dragonbonesTimeScales.delete(dba.uuid);
                    dba.timeScale = save || 1;
                });
            }
        }

        // 恢复缓动
        TweenSystem.instance.ActionManager.resumeTargets(TimeCache.tweenPausedTargets);

        // 恢复2D物理系统
        {
            let physics2d = director.getSystem('PHYSICS_2D');
            // @ts-ignore
            if (physics2d && TimeCache.isPhysics2DRunning) {
                // @ts-ignore
                physics2d.enable = TimeCache.isPhysics2DRunning;
            }
        }

        // 恢复3D物理系统
        {
            let physics3d = director.getSystem('PHYSICS');
            // @ts-ignore
            if (physics3d && TimeCache.isPhysics3DRunning) {
                // @ts-ignore
                physics3d.enable = TimeCache.isPhysics3DRunning;
            }
        }
    }

    public static hookTime() {

        if (!director || !game) return;

        // @ts-ignore
        if (!director.tickExchanged) {
            // @ts-ignore
            director.tickExchanged = true;

            // @ts-ignore
            director.originTick = director.tick;
            director.tick = (dt: number) => {
                TimeCache.globalRealDeltaTime = dt;
                dt = TimeCache.globalTimeScale * dt;
                TimeCache.globalDeltaTime = dt;
                // @ts-ignore
                director.originTick(dt);
            }
        }

        // @ts-ignore
        if (!game.dtSaved) {
            // @ts-ignore
            game.dtSaved = true;

            // @ts-ignore
            game.originCalculateDT = game._calculateDT;
            // @ts-ignore
            game._calculateDT = (now: number) => {
                if (!now) now = performance.now();

                TimeCache.globalRealtimeSinceStartup = now;
                // @ts-ignore
                return game.originCalculateDT(now);
            }
        }
    }

    public static unhookTime() {

        if (!director || !game) return;

        // @ts-ignore
        if (director.tickExchanged) {
            // @ts-ignore
            director.tickExchanged = false;

            // @ts-ignore
            director.tick = director.originTick;
            // @ts-ignore
            director.originTick = null;
        }

        // @ts-ignore
        if (game.dtSaved) {
            // @ts-ignore
            game.dtSaved = false;

            // @ts-ignore
            game._calculateDT = game.originCalculateDT;

            // @ts-ignore
            game.originCalculateDT = null;
        }
    }

    // 1 -> 无缩放; 0.5 -> 减速; 2 -> 加速
    public static set timeScale(v: number) {
        if (TimeCache.globalTimeScale != v)
            TimeCache.globalTimeScale = v;
        this.hookTime();
    }

    // 1 -> 无缩放; 0.5 -> 减速; 2 -> 加速
    public static get timeScale(): number {
        return TimeCache.globalTimeScale;
    }

    // Second 秒
    public static get deltaTime(): number {
        return TimeCache.globalDeltaTime;
    }

    // Second 秒
    public static get unscaledDeltaTime(): number {
        return TimeCache.globalRealDeltaTime;
    }

    // Millisecond 毫秒
    public static get realtimeSinceStartupMs(): number {
        return TimeCache.globalRealtimeSinceStartup;
    }

    // Second 秒
    public static get realtimeSinceStartup(): number {
        return TimeCache.globalRealtimeSinceStartup / 1000;
    }

    public static get now(): number {
        return new Date().getTime();
    }

    public static startOfDay(time: number): number {
        const startOfDay = new Date(time);
        startOfDay.setUTCHours(0, 0, 0, 0);
        return startOfDay.getTime();
    }

    public static endOfDay(time: number): number {
        const endOfDay = new Date(time);
        endOfDay.setUTCHours(23, 59, 59, 999);
        return endOfDay.getTime();
    }
}

if (PREVIEW) {
    // @ts-ignore
    window.Time = Time;
}

Time.hookTime();
