import { Component, OnInit } from '@angular/core';
import { Constants } from 'src/app/constants';

@Component({
    selector: 'dropdown',
    templateUrl: './dropdown.component.html',
    styleUrls: ['./dropdown.component.scss']
})
export class DropdownComponent implements OnInit {
    L = Constants.locale;

    constructor() { }

    ngOnInit() {
    }

}
