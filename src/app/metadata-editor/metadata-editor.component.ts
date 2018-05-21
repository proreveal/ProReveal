import { Component, OnInit, Input } from '@angular/core';
import { Dataset } from '../data/dataset';
import { VlType } from '../data/field';

@Component({
    selector: 'metadata-editor',
    templateUrl: './metadata-editor.component.html',
    styleUrls: ['./metadata-editor.component.scss']
})
export class MetadataEditorComponent implements OnInit {
    @Input() dataset:Dataset;
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
}
