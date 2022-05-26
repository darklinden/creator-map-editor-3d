import { _decorator, Component, log, Enum, Node, UITransform, isValid, Tween, Vec3 } from "cc";
const { ccclass, property } = _decorator;

export enum EFitLimit {
    Width = 0,
    Height = 1
}

export enum EUIType {
    UILarge = 0,
    UIBig = 1,
    UIMiddle = 2,
    UISmall = 3
}

const EUITypeRanges = [
    [0, 1.0], // UILarge 超大框，无限制
    [0, 0.8], // UIBig 大框，最大范围不超过 0.8
    [0, 0.7], // UIMiddle 中框， 最大范围不超过 0.7
    [0, 0.6], // UISmall 小框，最大范围不超过 0.6
]

@ccclass
export class UIScaleToFit extends Component {

    private _fitEnabled: boolean = true;

    @property({ type: Enum(EFitLimit), visible: true })
    private _fitType: EFitLimit = EFitLimit.Width;

    @property({ type: Enum(EUIType), visible: true })
    private _uiType: EUIType = EUIType.UIBig;

    onEnable() {
        log('UIScaleToFit.onEnable: [' + this.node.name + ']');
        if (!this || !this.node || !this.node.parent) return;

        this.onRectChange();
        this.node.parent.on(Node.EventType.SIZE_CHANGED, this.onRectChange, this);
        this.node.on(Node.EventType.SIZE_CHANGED, this.onSizeChange, this);
    }

    onDisable() {
        if (!this || !this.node || !this.node.parent) return;
        this.node && this.node.parent && this.node.parent.targetOff(this);
    }

    private onSizeChange(): void {
        if (!this || !this.node || !this.node.parent) return;

        const nodeUT = this.node.getComponent(UITransform);
        const parentUT = this.node.parent.getComponent(UITransform);

        log("onSizeChange: " + this.node.name
            + ' fitType: ' + EFitLimit[this._fitType]
            + ' nodeScale: ' + this.node.scale
            + ' nodeSize: ' + nodeUT.width + ',' + nodeUT.height
            + ' parentSize: ' + parentUT.width + ',' + parentUT.height);
    }

    private onRectChange(): void {
        if (!this || !this.node || !this.node.parent) return;
        if (!this._fitEnabled) return;

        const nodeUT = this.node.getComponent(UITransform);
        const parentUT = this.node.parent.getComponent(UITransform);

        log("onRectChange: " + this.node.name
            + ' fitType: ' + EFitLimit[this._fitType]
            + ' nodeScale: ' + this.node.scale
            + ' nodeSize: ' + nodeUT.width + ',' + nodeUT.height
            + ' parentSize: ' + parentUT.width + ',' + parentUT.height);

        let scale = 1;
        switch (this._fitType) {
            case EFitLimit.Width: {
                scale = this.fitWidth();
            }
                break;
            case EFitLimit.Height: {
                scale = this.fitHeight();
            }
                break;
            default:
                break;
        }
        this.node.setScale(scale, scale, scale);
    }

    public fitWidth() {
        if (!this || !this.node || !this.node.parent) return;

        const nodeUT = this.node.getComponent(UITransform);
        const parentUT = this.node.parent.getComponent(UITransform);

        const range = EUITypeRanges[this._uiType];

        let w = nodeUT.width;
        if (w < parentUT.width * range[0]) {
            w = parentUT.width * range[0];
        }
        else if (w > parentUT.width * range[1]) {
            w = parentUT.width * range[1];
        }

        return w / nodeUT.width;
    }

    public fitHeight() {
        if (!this || !this.node || !this.node.parent) return;

        const nodeUT = this.node.getComponent(UITransform);
        const parentUT = this.node.parent.getComponent(UITransform);

        const range = EUITypeRanges[this._uiType];

        let h = nodeUT.height;
        if (h < parentUT.height * range[0]) {
            h = parentUT.height * range[0];
        }
        else if (h > parentUT.height * range[1]) {
            h = parentUT.height * range[1];
        }

        return h / nodeUT.height;
    }

    onFocusInEditor(): void {
        this.onRectChange();
    }

    public scaleShow(completion: () => void = null) {
        let src_scale = 0.01;
        let des_scale = 1.0;
        switch (this._fitType) {
            case EFitLimit.Width: {
                des_scale = this.fitWidth();
            }
                break;
            case EFitLimit.Height: {
                des_scale = this.fitHeight();
            }
                break;
            default:
                break;
        }
        this._fitEnabled = false;
        this.node.setScale(src_scale, src_scale, src_scale);
        this.scheduleOnce(() => {
            new Tween(this.node)
                .to(0.1, {
                    scale: new Vec3(des_scale * 1.1, des_scale * 1.1, des_scale * 1.1)
                })
                .to(0.04, {
                    scale: new Vec3(des_scale, des_scale, des_scale)
                })
                .call(() => {
                    if (isValid(this.node)) {
                        this._fitEnabled = true;
                        this.onRectChange();
                        completion && completion();
                    }
                })
                .start();
        });
    }

    public scaleHide(completion: () => void = null) {
        let des_scale = 0.01;
        this._fitEnabled = false;
        new Tween(this.node)
            .to(0.1, {
                scale: new Vec3(des_scale, des_scale, des_scale)
            })
            .call(() => {
                if (isValid(this.node)) {
                    this._fitEnabled = true;
                    this.onRectChange();
                    completion && completion();
                }

                if (isValid(this.node)) {
                    completion && completion();
                }
            })
            .start();
    }
}
