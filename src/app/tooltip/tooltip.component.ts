import { Component, OnInit, ViewChild, ComponentFactoryResolver, ElementRef } from '@angular/core';
import { BarsTooltipComponent } from '../vis/renderers/bars-tooltip.component';
import { TooltipHostDirective } from './tooltip-host.directive';
import { TooltipRendererTrait } from './tooltip-renderer-trait';
import { map, catchError, timeout, delay} from 'rxjs/operators';
import { of } from 'rxjs';

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
    hideRequested = false;
    id = 0;
    data: any;

    @ViewChild(TooltipHostDirective) tooltipHost: TooltipHostDirective;
    @ViewChild('inner') inner: ElementRef<HTMLDivElement>;

    constructor(private componentFactoryResolver: ComponentFactoryResolver) { }

    ngOnInit() {
    }

    show(left: number, top: number,
        component: typeof TooltipRendererTrait,
        data: any) {

        let componentFactory = this.componentFactoryResolver.resolveComponentFactory(component);

        let viewContainerRef = this.tooltipHost.viewContainerRef;
        viewContainerRef.clear();

        let componentRef = viewContainerRef.createComponent(componentFactory);
        this.hideRequested = false;
        this.data = data;

        (<TooltipRendererTrait>componentRef.instance).data = data;
        (<TooltipRendererTrait>componentRef.instance).afterViewChecked = () => {
            let lastId = ++this.id;
            of(0).pipe(
                delay(50)
            ).subscribe(() => {
                if(!this.hideRequested && lastId == this.id) {
                    this.position(left, top);
                    this.visible = true;
                }
            });

            (<TooltipRendererTrait>componentRef.instance).afterViewChecked = null;
        };

    }

    position(left: number, top: number) {
        const width = this.inner.nativeElement.clientWidth;
        const height = this.inner.nativeElement.clientHeight;

        this.left = left - width / 2 - 1;

        let shift = 0;
        if(this.left < 0) { shift = this.left; this.left = 0; }
        this.top = top - height - 5;
        this.arrowLeft = width / 2 - 5 + shift;


    }

    hide() {
        this.visible = false;
        this.hideRequested = true;
    }
}
