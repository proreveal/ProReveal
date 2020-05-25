import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { Safeguard, SafeguardTypes } from '../../safeguard/safeguard';
import { Constants } from '../../constants';

let id = 0;

@Component({
    selector: 'sg-list-item',
    templateUrl: './sg-list-item.component.html',
    styleUrls: ['./sg-list-item.component.scss']
})
export class SgListItemComponent implements OnInit {
    SGT = SafeguardTypes;
    L = Constants.locale;

    @Input('safeguard') sg: Safeguard;
    @Output('removeClicked') removeClicked: EventEmitter<Safeguard> = new EventEmitter();

    configPanelOpen = true;
    rulePanelOpen = false;
    actionPanelOpen = false;
    id = '';
    demo1 = true;

    constructor() {
        this.id = (id++).toString();
    }

    ngOnInit() {
    }

    toggleConfigPanel() {
        this.configPanelOpen = !this.configPanelOpen;
    }

    openConfigPanel() {
        this.configPanelOpen = true;
        this.rulePanelOpen = false;
        this.actionPanelOpen = false;
    }

    openRulePanel() {
        this.rulePanelOpen = true;
        this.configPanelOpen = false;
        this.actionPanelOpen = false;
    }

    openActionPanel() {
        this.actionPanelOpen = true;
        this.configPanelOpen = false;
        this.rulePanelOpen = false;
    }


    ceil(v: number) {
        return Math.ceil(v);
    }

    emulateNoti() {
        Notification.requestPermission().then(function (result) {
            let options = {
                body: "The Value PVA-Guard you left on Genre has a new notification.",
                icon: "assets/apple-icon-114x114.png"
            };
            let n: Notification;
            n = new Notification("ProReveal Notification", options);
        });
    }
}
