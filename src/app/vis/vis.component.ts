import { Component, OnInit, Input, ElementRef, ViewChild, OnChanges, SimpleChange, SimpleChanges, DoCheck, ChangeDetectorRef, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';
import { ExplorationNode } from '../exploration/exploration-node';
import { HorizontalBarsRenderer } from './renderers/horizontal-bars';
import { TooltipComponent } from '../tooltip/tooltip.component';
import { AggregateQuery } from '../data/query';
import { PunchcardRenderer } from './renderers/punchcard';
import { Renderer } from './renderers/renderer';
import * as d3 from 'd3';
import { AccumulatorTrait, SumAccumulator, MinAccumulator, MaxAccumulator, MeanAccumulator } from '../data/accumulator';
import { HandwritingRecognitionService } from '../handwriting-recognition.service';
import { Safeguard } from '../safeguard/safeguard';
import { HandwritingComponent } from '../handwriting/handwriting.component';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'vis',
    templateUrl: './vis.component.html',
    styleUrls: ['./vis.component.scss']
})
export class VisComponent implements OnInit, DoCheck {
    @Input() node: ExplorationNode;
    @Output('safeguardAdded') safeguardAdded: EventEmitter<{
        'sg': Safeguard
    }> = new EventEmitter();

    @ViewChild('svg') svg: ElementRef;
    @ViewChild('tooltip') tooltip: TooltipComponent;
    @ViewChild('handwriting') handwriting: HandwritingComponent;

    queryLastUpdated: number;
    lastNode: ExplorationNode;
    renderers: Renderer[];
    accumulators: AccumulatorTrait[] = [
        new SumAccumulator(),
        new MeanAccumulator(),
        new MaxAccumulator(),
        new MinAccumulator()
    ];
    recognizing = false;

    constructor(
        private handwritingRecognitionService: HandwritingRecognitionService,
        private toastr: ToastrService
    ) { }

    recommend(query: AggregateQuery): Renderer[] {
        if (query.groupBy.fields.length === 1)
            return [new HorizontalBarsRenderer(
                this.handwritingRecognitionService,
                this.tooltip,
                this.handwriting
            )];

        if (query.groupBy.fields.length === 2)
            return [new PunchcardRenderer(
                this.handwritingRecognitionService,
                this.tooltip,
                this.handwriting
            )];

        return [];
    }

    ngOnInit() {
        /*this.queryLastUpdated = this.node.query.lastUpdated;

        this.renderers = this.recommend(this.node.query as AggregateQuery);

        this.renderers.forEach(renderer => {
            renderer.setup(this.node, this.svg.nativeElement);
            renderer.render(this.node, this.svg.nativeElement);
        })*/
    }

    ngDoCheck() {
        if (this.node && this.svg &&
            (this.queryLastUpdated < this.node.query.lastUpdated || this.lastNode != this.node)) {
            this.queryLastUpdated = this.node.query.lastUpdated;

            if (this.lastNode !== this.node) {
                this.renderers = this.recommend(this.node.query as AggregateQuery);
                d3.select(this.svg.nativeElement).selectAll('*').remove();
                this.renderers.forEach(renderer => {
                    renderer.setup(this.node, this.svg.nativeElement);
                });
            }

            this.lastNode = this.node;
            this.renderers.forEach(renderer => {
                renderer.render(this.node, this.svg.nativeElement);
            });
        }
    }

    highlight(highlighted: number) {
        this.renderers.forEach(renderer => {
            renderer.highlight(highlighted);
        });
    }

    recognize() {
        this.recognizing = true;

        this.renderers.forEach(renderer => {
            renderer.recognitionRequested((result) => {
                this.recognizing = false;
                return result;
            })
            .then((sg: Safeguard | null) => {
                if (sg)
                this.safeguardAdded.emit({
                        sg: sg
                    });
                else {
                    this.toastr.error('Failed to recognize a safeguard')
                }
            })
            .catch(e => {
                console.log(e);
            })
        })
    }

    clear() {
        this.renderers.forEach(renderer => {
            renderer.clearRequested();
        })
    }
}
