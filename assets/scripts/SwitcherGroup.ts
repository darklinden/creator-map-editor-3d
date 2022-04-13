import { _decorator, Component, Vec3, Eventify, EventHandler, js } from 'cc';
import { ESwitcherState, Switcher } from './Switcher';

const { ccclass, property } = _decorator;

@ccclass
export class SwitcherGroup extends Eventify(Component) {

    public static CHANGED: string = 'SwitcherGroup.CHANGED';

    @property({ visible: true })
    private _selectFirstOnEnable: boolean = true;

    @property({ type: [Switcher], visible: true })
    private _items: Array<Switcher> = [];

    @property({ type: [EventHandler], visible: true })
    private _changed_events: EventHandler[] = [];

    private _selectedIndex: number = 0;
    public get selectedIndex(): number { return this._selectedIndex; }

    private _enableSwitch: boolean = true;

    public prepareItem(item: Switcher) {
        item.switchOnOnly = true;

        const componentName = 'SwitcherGroup';
        const classId = js._getClassId(SwitcherGroup);
        const handler = 'switcherClicked';

        let hasEvent = false;
        for (let i = item._changed_events.length - 1; i >= 0; i--) {
            const h = item._changed_events[i];

            // delete empty event
            if (!h
                || (!h.target)
                || (!h.component || !h.component.length)
                || (!h._componentId || !h._componentId.length)
                || (!h.handler || !h.handler.length)) {
                item._changed_events.splice(i, 1);
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
            eh._componentId = classId
            eh.handler = handler;
            item._changed_events.push(eh);
        }
    }

    resetInEditor(): void {
        this._items = [];
        this._selectedIndex = 0;

        const items = this.getComponentsInChildren(Switcher);
        items.forEach(item => {
            item.groupIndex = this._items.length;
            this.prepareItem(item);
            this._items.push(item);
        });

        this.selectIndex(this.selectedIndex);
    }

    public switcherClicked(sender: Switcher) {
        if (!this._enableSwitch) return;
        const item = sender ? sender : null;
        if (item) {
            if (item.isOn && item.groupIndex != this._selectedIndex) {
                this.selectIndex(item.groupIndex);
                this.emit(SwitcherGroup.CHANGED, this);
                if (this._changed_events) this._changed_events.forEach(handler => {
                    handler && handler.emit([this]);
                });
            }
        }
    }

    public selectIndex(idx: number) {
        this._selectedIndex = idx;
        for (let i = 0; i < this._items.length; i++) {
            if (!this._items[i]) continue;
            this._items[i].isOn = (i == idx);
        }
    }

    onEnable() {
        this.refreshGroupIndexes();
        if (this._selectFirstOnEnable) {
            this.selectIndex(0);
        }
    }

    public refreshGroupIndexes() {
        for (let i = 0; i < this._items.length; i++) {
            if (!this._items[i]) continue;
            this._items[i].groupIndex = i;
        }
    }

    public addItem(item: Switcher) {
        item.node.position = Vec3.ZERO;
        item.node.parent = this.node;
        item.groupIndex = this._items.length;
        this.prepareItem(item);
        this._items.push(item);
        this.selectIndex(this.selectedIndex);
    }

    public removeItemAtIndex(index: number) {
        const item = this._items[index];
        if (!item) return;

        item.node.destroy();
        this._items.splice(index, 1);
        if (this.selectedIndex >= 0 && this.selectedIndex < this._items.length) {
        }
        else {
            this._selectedIndex = 0;
        }
        this.selectIndex(this.selectedIndex);
    }

    public get itemCount(): number {
        return this._items ? this._items.length : 0;
    }

    public getItemAtIndex(idx: number): Switcher {
        return this._items ? this._items[idx] : null;
    }

    public clear() {
        this._items = [];
        this.node.destroyAllChildren();
        this._selectedIndex = 0;
    }

    public get switchEnabled(): boolean {
        return this._enableSwitch;
    }

    public set switchEnabled(v: boolean) {
        this._enableSwitch = v;
    }
}