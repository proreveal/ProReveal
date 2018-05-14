import { Component, OnInit } from '@angular/core';
import { forwardRef, Input} from '@angular/core'

@Component({
  selector: '[chart-link]',
  templateUrl: './link.component.html',
  styleUrls: ['./link.component.css']
})
export class LinkComponent implements OnInit {
  @Input() history;

  translate(x:number, y:number):string {
    return `translate(${x}px,${y}px)`
  }

  d(node1:any, node2:any):string {
    let start:any = {
      x: node1.left + node1.width,
      y: node1.top + node1.height / 2
    };

    let end:any = {
      x: node2.left,
      y: node2.top + node2.height / 2
    };

    let ratio = 0.1;

    let cp1:any = {
      x: start.x * ratio + end.x * (1-ratio),
      y: start.y
    };

    let cp2:any = {
      x: start.x * (1-ratio) + end.x * ratio,
      y: end.y
    }

    return `M${start.x},${start.y}C${cp1.x},${cp1.y},${cp2.x},${cp2.y},${end.x},${end.y}`;
  }

  constructor() { }

  ngOnInit() {
  }

}
