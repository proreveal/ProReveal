import { Directive, ViewContainerRef } from '@angular/core';

@Directive({
    selector: '[tooltip-host]',
})
export class TooltipHostDirective {
    constructor(public viewContainerRef: ViewContainerRef) { }
}
