import { _decorator, Component, Node, Enum, Button, EventHandler, isValid, Eventify, js } from 'cc';
const { ccclass, property, requireComponent } = _decorator;

export enum ESwitcherState {
    Off = 0,
    On = 1,
    Disable = 2
}

@ccclass
@requireComponent(Button)
export class Switcher extends Eventify(Component) {

    public static CHANGED: string = 'Switcher.CHANGED';

    @property({ type: Enum(ESwitcherState), visible: true })
    private _state: ESwitcherState = ESwitcherState.Off;

    @property({ visible: true })
    private _switch_on_only: boolean = false;

    @property({ type: [Node], visible: true })
    private _on_list: Node[] = [];

    @property({ type: [Node], visible: true })
    private _off_list: Node[] = [];

    @property({ type: [Node], visible: true })
    private _disable_list: Node[] = [];

    @property({ type: Button, visible: true })
    private _btn: Button = null;

    @property({ type: [EventHandler], visible: true })
    public _changed_events: EventHandler[] = [];

    @property({ visible: true })
    public groupIndex: number = -1;

    resetInEditor(): void {
        this._btn = this.getComponent(Button) || this.addComponent(Button);
        this.prepareBtn();
    }

    onEnable(): void {
        this.updateUI();
    }

    public get state() {
        return this._state;
    }

    public set state(value: ESwitcherState) {
        if (this._state == value) return;
        this._state = value;
        this.updateUI();
    }


    public get switchOnOnly(): boolean {
        return this._switch_on_only;
    }

    public set switchOnOnly(value: boolean) {
        this._switch_on_only = value;
    }

    public get isOn(): boolean {
        return this._state == ESwitcherState.On;
    }

    public SetIsOnNoEmit(value: boolean) {
        const s = value ? ESwitcherState.On : ESwitcherState.Off;
        if (this._state == s) return;
        this._state = s;
        this.updateUI(false);
    }

    public set isOn(value: boolean) {
        const s = value ? ESwitcherState.On : ESwitcherState.Off;
        if (this._state == s) return;
        this._state = s;
        this.updateUI();
    }

    public prepareBtn() {
        const componentName = 'Switcher';
        const classId = js._getClassId(Switcher);
        const handler = 'switchOnOff';

        let hasEvent = false;
        for (let i = this._btn.clickEvents.length - 1; i >= 0; i--) {
            const h = this._btn.clickEvents[i];

            // delete empty event
            if (!h
                || (!h.target)
                || (!h.component || !h.component.length)
                || (!h._componentId || !h._componentId.length)
                || (!h.handler || !h.handler.length)) {
                this._btn.clickEvents.splice(i, 1);
                continue;
            }

            if (h.target == this.node
                && h.component == componentName
                && h._componentId == classId
                && h.handler == handler) {
                hasEvent = true;
                continue;
            }
        }

        if (!hasEvent) {
            const eh = new EventHandler();
            eh.target = this.node;
            eh.component = componentName;
            eh._componentId = classId;
            eh.handler = handler;
            this._btn.clickEvents.push(eh);
        }
    }

    public updateUI(emit: boolean = true) {
        if (this._btn) {
            this.prepareBtn();
            this._btn.interactable = (this.state != ESwitcherState.Disable);
        }

        if (emit) {
            this.emit(Switcher.CHANGED, this);
            if (this._changed_events) this._changed_events.forEach(handler => {
                handler && handler.emit([this]);
            });
        }

        if (this._off_list) this._off_list.forEach(n => { n && isValid(n) && (n.active = this.state == ESwitcherState.Off) });
        if (this._on_list) this._on_list.forEach(n => { n && isValid(n) && (n.active = this.state == ESwitcherState.On) });
        if (this._disable_list) this._disable_list.forEach(n => { n && isValid(n) && (n.active = this.state == ESwitcherState.Disable) });
    }

    public switchOnOff() {
        // disabled return
        if (this.state == ESwitcherState.Disable) return;

        // switch
        if (this.state == ESwitcherState.Off) {
            this.state = ESwitcherState.On;
        }
        else if (this.state == ESwitcherState.On) {
            if (!this._switch_on_only) this.state = ESwitcherState.Off;
        }
    }
}