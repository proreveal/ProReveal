import { Component, OnInit, ViewChild, ComponentFactoryResolver } from '@angular/core';
import { HorizontalBarsTooltipComponent } from '../vis/renderers/horizontal-bars-tooltip.component';
import { TooltipHostDirective } from './tooltip-host.directive';

@Component({
    selector: 'tooltip',
    templateUrl: './tooltip.component.html',
    styleUrls: ['./tooltip.component.css']
})
export class TooltipComponent implements OnInit {
    left: number;
    top: number;
    @ViewChild(TooltipHostDirective) tooltipHost: TooltipHostDirective;

    constructor(private componentFactoryResolver: ComponentFactoryResolver) { }

    ngOnInit() {
    }

    show(left: number, top: number, component: typeof HorizontalBarsTooltipComponent) {
        this.left = left;
        this.top = top;

        let componentFactory = this.componentFactoryResolver.resolveComponentFactory(component);

        console.log(this.tooltipHost);
        let viewContainerRef = this.tooltipHost.viewContainerRef;
        viewContainerRef.clear();

        let componentRef = viewContainerRef.createComponent(componentFactory);
    }

    hide() {

    }
}
