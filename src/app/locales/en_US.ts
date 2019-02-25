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

    SUM: 'SUM',
    MEAN: 'MEAN',
    MIN: 'MIN',
    MAX: 'MAX',
    //, currencyFormatter: formatKRW
});
