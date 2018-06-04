import { Component, OnInit, Input } from '@angular/core';
import { FieldTrait } from '../data/field';
import { VlType } from '../data/field';

@Component({
    selector: 'field-badge',
    templateUrl: './field-badge.component.html',
    styleUrls: ['./field-badge.component.css']
})
export class FieldBadgeComponent implements OnInit {
    @Input() field: FieldTrait;
    VlType = VlType;

    constructor() { }

    ngOnInit() {

    }
}
