import { Component, OnInit } from '@angular/core';
import { forwardRef, Input} from '@angular/core'

@Component({
  selector: 'chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.css']
})
export class ChartComponent implements OnInit {
  @Input() history;
  public path: string

  constructor() {
    this.path = `assets/chart${Math.floor(Math.random()*3)+1}.PNG`
  }

  ngOnInit() {
  }

}
