import { Component, OnInit, Input } from '@angular/core';
import { Queue } from '../data/queue';

@Component({
    selector: 'queue-view',
    templateUrl: './queue-view.component.html',
    styleUrls: ['./queue-view.component.css']
})
export class QueueViewComponent implements OnInit {
    @Input() queue:Queue;

    constructor() { }

    ngOnInit() {
    }

}
