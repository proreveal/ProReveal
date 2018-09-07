import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'p-indicator',
  templateUrl: './p-indicator.component.html',
  styleUrls: ['./p-indicator.component.css']
})
export class PIndicatorComponent implements OnInit {
    @Input() p: number;

    constructor() { }

    ngOnInit() {
    }

}
