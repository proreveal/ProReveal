import { Component, OnInit } from '@angular/core';
import { forwardRef, Input, ViewChild, ElementRef } from '@angular/core'

import { Constants } from '../../constants';

@Component({
    selector: 'node',
    templateUrl: './node.component.html',
    styleUrls: ['./node.component.scss']
})
export class NodeComponent implements OnInit {
    @Input() app;
    @Input() history;
    @Input() draggedField;
    @ViewChild('previewSvg') previewSvg: ElementRef;

    constants = Constants;
    preview: boolean = false;

    constructor() {
    }

    ngOnInit() {
    }

    dragenter($event) {
        this.preview = true;

        let opt = {}
        let schema = this.app.data.schema;
        let rows = this.app.data.rows;
        let draggedField = this.draggedField;

        console.log(this.previewSvg)
        let query = {
            "spec": {
                "data": rows,
                "mark": "?",
                "encodings": []
            },

            "nest": [
                {
                    "groupBy": ["field", "aggregate", "bin", "timeUnit", "stack"],
                    "orderGroupBy": "aggregationQuality"
                },
            ],

            "chooseBy": "effectiveness",
            "config": {
                "autoAddCount": true
            }
        };

        let previewFields = this.history.fields.slice();
        console.log(previewFields);
        previewFields.push(draggedField);

        // previewFields.forEach((field:any) => {
        //   if(field.type === 'quantitative') {
        //     query.spec.encodings.push({
        //       "channel": "?",
        //       "aggregate": "?",
        //       "bin": "?",
        //       "field": field.name,
        //       "type": "quantitative"
        //     })
        //   }
        //   else {
        //     query.spec.encodings.push({
        //       "channel": "?",
        //       "field": field.name,
        //       "type": "ordinal"
        //     })
        //   }
        // });

        // let output = compassql.recommend(query, schema, {});
        // let result = output.result;

        // let vlTree = compassql.result.mapLeaves(result, (item) => {
        //   return item.toSpec();
        // })

        // let topVlSpec = vlTree.items[0];

        // console.log(topVlSpec);

        // let targetSpec = topVlSpec.items[0];

        // targetSpec.$schema = 'https://vega.github.io/schema/vega-lite/v2.json';
        // targetSpec.data = {values: rows}

        // console.log(targetSpec)

        // this.topVlSpec = topVlSpec;
        // vegaEmbed.default(this.previewSvg.nativeElement,
        //                   targetSpec, {
        //   renderer: 'svg',
        //   actions: false
        // });
    }

    dragover($event) {
        $event.preventDefault();
    }

    dragleave($event) {
        this.preview = false;
    }

    drop($event) {
        let draggedField = this.draggedField;
        let history = this.history;

        this.preview = false;
        if (!history.children)
            history.children = []

        let fields = this.history.fields.slice();
        fields.push(draggedField)

        let node = {
            progress: 0,
            ongoing: 0.1,
            chartType: 'bar',
            status: 'running',
            fields: fields,
            // topVlSpec: this.topVlSpec,
            children: []
        }

        history.children.push(node)

        // let timer = TimerObservable.create(1000, 2000);
        // let sub = timer.subscribe(t => this.update(node, sub))

        this.app.relayout()
        this.app.focus(node);
    }

    update(node, sub) {
        node.progress += 0.1;
        if (node.progress >= 1) {
            sub.unsubscribe();
        }
    }
}
