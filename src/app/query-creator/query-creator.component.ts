import { Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { Dataset } from '../data/dataset';
import { AggregateQuery, EmptyQuery, Query } from '../data/query';
import { FieldTrait, VlType } from '../data/field';
import * as util from '../util';
import { AndPredicate } from '../data/predicate';
import { MeanApproximator, SumApproximator, MinApproximator, MaxApproximator, ApproximatorTrait } from '../data/approx';
import { ExpConstants } from '../exp-constants';
import { Constants } from '../constants';

@Component({
    selector: 'query-creator',
    templateUrl: './query-creator.component.html',
    styleUrls: ['./query-creator.component.scss']
})
export class QueryCreatorComponent implements OnInit, OnChanges {
    @Input('dataset') dataset: Dataset;
    @Output('created') created = new EventEmitter<{}>();
    @Output('creationCancelled') creationCancelled = new EventEmitter<{}>();

    L = Constants.locale;

    approximators = [
        new MeanApproximator(),
        new SumApproximator(),
        new MinApproximator(),
        new MaxApproximator()
    ];

    candidateFields: FieldTrait[] = [];
    selectableFields: FieldTrait[] = [];
    selectedFields: FieldTrait[] = [];
    newQuery: AggregateQuery;
    where: AndPredicate = new AndPredicate();

    constructor() { }

    ngOnInit() {
    }

    ngOnChanges(changes: SimpleChanges) {
        if ('dataset' in changes && this.dataset) {
            this.candidateFields = this.dataset.fields!
                .filter(field => field.vlType != VlType.Key)
                .sort((a, b) => {
                    if (a.order && b.order) return a.order - b.order;
                    if (a.order) return -1;
                    if (b.order) return 1;

                    if (a.vlType > b.vlType) return 1;
                    if (a.vlType < b.vlType) return -1;

                    if (a.name > b.name) return 1;
                    if (a.name < b.name) return -1;
                    return 0;
                })

            this.selectableFields = this.candidateFields;
        }
    }

    fieldSelected(field: FieldTrait) {
        if (this.selectedFields.includes(field)) {
            util.aremove(this.selectedFields, field);
        }
        else {
            this.selectedFields.push(field);
        }

        let newQuery: Query = new EmptyQuery(this.dataset, ExpConstants.sampler);
        this.selectedFields.forEach(field => {
            newQuery = newQuery.combine(field);
        })

        this.selectableFields = newQuery.compatible(this.candidateFields);
        if (this.selectedFields.length === 0) this.newQuery = null;
        else {
            this.newQuery = newQuery as AggregateQuery;
            this.newQuery.where = this.where;
        }
    }

    approxClick(approx:ApproximatorTrait) {
        if(this.newQuery)
            this.newQuery.approximator = approx;
    }

    create() {
        this.created.emit({
            fields: this.selectedFields,
            query: this.newQuery
        });

        this.selectedFields = [];
        this.selectableFields = this.candidateFields;
        this.newQuery = null;
    }

    cancelCreation() {
        this.selectedFields = [];
        this.selectableFields = this.candidateFields;
        this.newQuery = null;

        this.creationCancelled.emit();
    }
}
