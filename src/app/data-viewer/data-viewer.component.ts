import { Component, OnInit, Input } from '@angular/core';
import { Dataset, Row } from '../data/dataset';

@Component({
    selector: 'data-viewer',
    templateUrl: './data-viewer.component.html',
    styleUrls: ['./data-viewer.component.scss']
})
export class DataViewerComponent implements OnInit {
    @Input('dataset') dataset: Dataset;
    @Input('rows') rows: Row[];
    page: number = 1;
    pageSize: number = 25;

    constructor() { }

    ngOnInit() {
    }

}
