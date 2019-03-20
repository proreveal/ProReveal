import { formatKRW } from "../util";
import { Locale } from "./locale";
import { AggregateQuery } from "../data/query";
import * as d3format from 'd3-format';

export const Locale_en_US = Object.freeze({
    name: Locale.en_US,
    exchangeRate: 1,
    nullValueString: '(empty)',
    NewVisualization: 'New Visualization',
    CompletedVisualization: 'Completed Visualization',
    OngoingVisualization: 'Ongoing Visualization',
    Alternate: 'Alternate',
    Filters: 'Filters',
    Fields: 'Fields',
    Aggregate: 'Aggregate',
    QueryPreview: 'Query Preview',
    CreateVisualization: 'Create this visualization',
    Cancel: 'Cancel',
    ChooseFields: 'Choose fields that should be included in the visualization.',
    NumRows: '# of Rows Found',
    Safeguards: 'Safeguards',
    SafeguardGuide: 'The safeguard list is empty! Create a visualization and click on a label in it to make a safegaurd.',

    ChooseVisualizationToInspect: 'Choose a visualization to inspect.',
    VisualizationNotStarted: 'This visualization has not been started yet. Reorder <strong>the ongoing list</strong> to give a high priority to this query.',

    SplitXAxisBins: 'Split X',
    MergeXAxisBins: 'Merge X',
    SplitYAxisBins: 'Split Y',
    MergeYAxisBins: 'Merge Y',
    SplitBins: 'Split Bins',
    MergeBins: 'Merge Bins',

    TooManyCategories1: 'There are too many categories. Click here to see all',
    TooManyCategories2: 'categories.',

    SeeOnlyTheseItems: 'Keep these data items only',
    CreateSafeguardOnThis: 'Create a safeguard on this element',

    Value: 'Value',
    Rank: 'Rank',
    Range: 'Range',
    Comparative: 'Comparative',
    Normal: 'Normal',
    PowerLaw: 'Power Law',
    Linear: 'Linear',

    ShowDataItems: 'Show data items',

    DataViewer: 'Data Viewer',

    CannotRemoveSafeguardedVis: 'You cannot remove a query that has a safeguard on it.',
    RemovingVis: 'Removing the visualization',
    RemovingVisAlert: 'You are removing a visualization. Are you sure?',
    Remove: 'Remove',

    CreateSG: 'Create',
    Tip: 'TIP',
    RangeTip: 'Drag the two edges of the brush on the legend to set a range.',
    PowerLawTip: 'Create a Power Law safeguard to check how much the data values follows a power law distribution.',

    TruthinessTrue: 'It holds at this moment!',
    TruthinessFalse: 'It does not hold at this moment.',

    P5: 'It holds certainly!',
    P50: 'It holds probably.',
    POther: 'It holds unlikely.',

    KSStatistics: 'KS Statistics',
    RMSE: 'RMSE',

    SUM: 'SUM',
    MEAN: 'MEAN',
    MIN: 'MIN',
    MAX: 'MAX',
    COUNT: 'COUNT',

    HeatmapLegendUncertainty: 'Standard Error',
    HeatmapLedgendValue: 'COUNT',

    P: 'p',

    PauseAll: 'Pause All',
    ResumeAll: 'Resume All',

    XLabelTitleFormatter: (q: AggregateQuery) => `${Locale_en_US[q.approximator.name.toUpperCase()]} of ${q.target.name}`,
    currencyFormatter: (usd: number) => {
        return '$' + d3format.format('2s')(usd);
    }
});
