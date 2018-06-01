import { Input } from "@angular/core";

export class TooltipRendererTrait {
    @Input() data:any;
    afterViewChecked: () => void;

    ngAfterViewChecked() {
        if (this.afterViewChecked)
            this.afterViewChecked();
    }
}
