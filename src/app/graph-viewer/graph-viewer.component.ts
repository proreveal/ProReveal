import { Component, OnInit } from '@angular/core';
import { forwardRef, Input} from '@angular/core'
import { Constants } from '../constants';

@Component({
  selector: 'graph-viewer',
  templateUrl: './graph-viewer.component.html',
  styleUrls: ['./graph-viewer.component.css']
})
export class GraphViewerComponent implements OnInit {
  @Input() app;
  @Input() history;
  @Input() draggedField;

  constructor() { }

  ngOnInit() {
  }

}
