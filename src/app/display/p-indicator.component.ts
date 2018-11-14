import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'p-indicator',
  templateUrl: './p-indicator.component.html'
})
export class PIndicatorComponent implements OnInit {
    @Input() p: number;

    constructor() { }

    ngOnInit() {
    }

}
