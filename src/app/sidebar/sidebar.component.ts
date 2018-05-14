import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  @Input() app;

  draggedField:any;

  constructor() { }

  ngOnInit() {
  }

  fieldDragStart($event, field) {
    this.draggedField = field;
  }

  fieldDragEnd($event, field) {
    this.draggedField = null;
  }

  drag() {
  }

  dragover(event){
    console.log(event)
    event.preventDefault();
  }
}
