import { Component, OnInit, OnChanges, Input } from '@angular/core';
import { Dataset, VlType } from '../dataset';

@Component({
    selector: 'metadata-editor',
    templateUrl: './metadata-editor.component.html',
    styleUrls: ['./metadata-editor.component.scss']
})
export class MetadataEditorComponent implements OnInit, OnChanges {
    @Input() samples:Dataset;
    page: number = 1;
    pageSize: number = 15;
    VlType = VlType;
    visible: boolean = false;

    constructor() { }

    ngOnInit() {
    }

    open() {
        this.visible = true;
    }

    close() {
        this.visible = false;
    }

    toggle() {
        this.visible = !this.visible;
    }

    ngOnChanges(changes) {
        // console.log(this.samples)
        // console.log(this.samples.fields)
    }
}
