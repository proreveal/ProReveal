import { formatKRW } from "../util";
import { Locale } from "./locale";

export const Locale_en_US = Object.freeze({
    name: Locale.en_US,
    exchangeRate: 1,
    nullValueString: '(empty)',
    NewVisualization: 'New Visualization',
    CompletedVisualization: 'Completed Visualization',
    OngoingVisualization: 'Ongoing Visualization',
    Alternate: 'Alaternate',
    Filters: 'Filters',
    Fields: 'Fields',
    Aggregate: 'Aggregate',
    QueryPreview: 'Query Preview',
    CreateVisualization: 'Create this visualization',
    Cancel: 'Cancel',
    ChooseFields: 'Choose fields that should be included in the visualization.',
    NumRows: '# of Rows',
    Safeguards: 'Safeguards',
    SafeguardGuide: 'The safeguard list is empty! Create a visualization and click on a label in it to make a safegaurd.',

    ChooseVisualizationToInspect: 'Choose a visualization to inspect.',
    VisulizationNotStarted: 'This visualization has not been started yet. Reorder <strong>the ongoing list</strong> to give a high priority to this query.',

    SplitXAxisBins: 'Split horizontal bins',
    MergeXAxisBins: 'Merge horizontal bins',
    SplitYAxisBins: 'Split vertical bins',
    MergeYAxisBins: 'Merge vertical bins',
    SplitBins: 'Split Bins',
    MergeBins: 'Merge Bins',

    TooManyCategories1: 'There are too many categories. Click here to see all',
    TooManyCategories2: 'categories.',

    SeeOnlyTheseItems: 'See only these data items',
    CreateASafeguard: 'Create a safeguard on this',

    Value: 'Value',
    Rank: 'Rank',
    Range: 'Range',
    Comparative: 'Comparative',
    Normal: 'Normal',
    Linear: 'Linear',

    ShowDataItems: 'Show data items',

    DataViewer: 'Data Viewer',

    CannotRemoveSafeguardedVis: 'You cannot remove a query that has a safeguard on it.',
    RemovingVis: 'Removing the visualization',
    RemovingVisAlert: 'You are removing a visualization. Are you sure?',
    Remove: 'Remove',

    CreateSG: 'Create',
    Tip: 'TIP',

    TruthinessTrue: 'It holds at this moment!',
    TruthinessFalse: 'It does not hold at this moment.',

    P5: 'It holds certainly!',
    P50: 'It holds probably.',
    POther: 'It holds unlikely.',

    KSStatistics: 'Kolmogorov-Smirnov Statistics',
    RMSE: 'RMSE',

    SUM: 'SUM',
    MEAN: 'MEAN',
    MIN: 'MIN',
    MAX: 'MAX',
    COUNT: 'COUNT'

    //, currencyFormatter: formatKRW
});
