import { Component, OnInit, ViewChild, ComponentFactoryResolver, ElementRef } from '@angular/core';
import { HorizontalBarsTooltipComponent } from '../vis/renderers/horizontal-bars-tooltip.component';
import { TooltipHostDirective } from './tooltip-host.directive';
import { TooltipRendererTrait } from './tooltip-renderer-trait';

@Component({
    selector: 'tooltip',
    templateUrl: './tooltip.component.html',
    styleUrls: ['./tooltip.component.css']
})
export class TooltipComponent implements OnInit {
    left: number;
    top: number;
    arrowLeft: number = 0;
    visible = false;

    @ViewChild(TooltipHostDirective) tooltipHost: TooltipHostDirective;
    @ViewChild('inner') inner: ElementRef;

    constructor(private componentFactoryResolver: ComponentFactoryResolver) { }

    ngOnInit() {
    }

    show(left: number, top: number,
        component: typeof HorizontalBarsTooltipComponent,
        data: any) {
        this.visible = true;

        let componentFactory = this.componentFactoryResolver.resolveComponentFactory(component);

        let viewContainerRef = this.tooltipHost.viewContainerRef;
        viewContainerRef.clear();

        let componentRef = viewContainerRef.createComponent(componentFactory);
        (<TooltipRendererTrait>componentRef.instance).afterViewChecked = () => {
            this.position(left, top);
        };

        (<TooltipRendererTrait>componentRef.instance).data = data;
    }

    position(left: number, top: number) {
        const width = this.inner.nativeElement.offsetWidth;
        const height = this.inner.nativeElement.offsetHeight;

        this.arrowLeft = width / 2 - 5;

        this.left = left - width / 2 - 1;
        this.top = top - height - 5;
    }

    hide() {
        this.visible = false;
    }
}
