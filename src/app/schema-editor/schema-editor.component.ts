import { Component, OnInit, OnChanges, Input } from '@angular/core';
import { Dataset, VlType } from '../dataset';

@Component({
    selector: 'schema-editor',
    templateUrl: './schema-editor.component.html',
    styleUrls: ['./schema-editor.component.scss']
})
export class SchemaEditorComponent implements OnInit, OnChanges {
    @Input() samples:Dataset;
    page: number = 1;
    pageSize: number = 15;
    VlType = VlType;

    constructor() { }

    ngOnInit() {
    }

    ngOnChanges(changes) {
        // console.log(this.samples)
        // console.log(this.samples.fields)
    }
}
