import { formatKRW } from "../util";
import { Locale } from "./locale";
import { AggregateQuery } from "../data/query";
import * as d3format from 'd3-format';

export const Locale_en_US = Object.freeze({
    name: Locale.en_US,
    exchangeRate: 1,
    nullValueString: '(empty)',
    NewVisualization: 'New Visualization',
    CompletedVisualization: 'Completed Visualizations',
    OngoingVisualization: 'Ongoing Visualizations',
    Alternate: 'Alternate',
    Filters: 'Filters',
    Fields: 'Fields',
    Aggregate: 'Aggregate',
    QueryPreview: 'Query Preview',
    CreateVisualization: 'Create a Visualization',
    Cancel: 'Cancel',
    ChooseFields: 'Choose fields that you want to include in a visualization.',
    NumRows: '# of rows found',
    Safeguards: 'PVA-Guards',
    SafeguardGuide: 'The PVA-Guard list is empty! Create a visualization and click on a label to leave a PVA-Guard on it.',

    CreateANewVisualization: 'You haven\'t created any visualization! Create one by clicking on the <strong>"New Visualization"</strong> button.',
    ChooseVisualizationToInspect: 'Choose a visualization from the lists on the left to inspect.',

    VisualizationNotStarted: 'This visualization has not been started yet. Reorder <strong>the ongoing visualization list</strong> to give a high priority to this query.',

    SplitXAxisBins: 'Split X',
    MergeXAxisBins: 'Merge X',
    SplitYAxisBins: 'Split Y',
    MergeYAxisBins: 'Merge Y',
    SplitBins: 'Split Bins',
    MergeBins: 'Merge Bins',

    TooManyCategories1: 'There are too many categories. Click here to see all',
    TooManyCategories2: 'categories.',

    SeeOnlyTheseItems: 'Keep these data items only',
    CreateSafeguardOnThis: 'Create a PVA-Guard on this element',

    Value: 'Value',
    Rank: 'Rank',
    Range: 'Range',
    Comparative: 'Comparative',
    Normal: 'Normal',
    PowerLaw: 'Power Law',
    Linear: 'Linear',

    ShowDataItems: 'Show data items',

    DataViewer: 'Data Viewer',

    CannotRemoveSafeguardedVis: 'You cannot remove a visualization that has a PVA-Guard on it.',
    RemovingVis: 'Removing a visualization',
    RemovingVisAlert: 'You are removing this visualization. Are you sure?',
    Remove: 'Remove',

    CreateSG: 'Leave a PVA-Guard',
    Tip: 'TIP',

    // <span class="constant font-weight-bold">range</span>

    ValueTip: 'Drag <span class="constant">the constant bar</span> left or right to select the target value.',
    RankTip: 'Drag <span class="constant">the rank bar</span> left or right to select the target rank.',
    RangeTip: 'Drag the two edges of <span class="brush">the brush</span> to set the target range.',
    ComparativeTip: 'Right-click on <span class="variable2">the second element</span> that you want to compare with.',
    PowerLawTip: 'Click on <span class="create">the "Leave a PVA-Guard" button</span> to leave a Power Law PVA-Guard on the current visualization.',
    NormalTip: 'Click on <span class="create">the "Leave a PVA-Guard" button</span> to leave a Normal PVA-Guard on the current visualization.',
    LinearTip: 'Click on <span class="create">the "Leave a PVA-Guard" button</span> to leave a Linear PVA-Guard on the current visualization.',

    TruthinessTrue: 'It holds at this moment!',
    TruthinessFalse: 'It does not hold at this moment.',

    KSStatistic: 'KS Statistic',
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


    NoOngoingQueries: 'There is no visualization currently being processed. Create one by tapping the "New Visualization" button below.',
    NoCompletedQueries: 'There is no completed visualization.',

    CreateANewVisualizationMobile: 'You haven\'t created any visualization! Create one by clicking on the chart icon at the top left corner.',
    ChooseVisualizationToInspectMobile: 'Click on the chart icon at the top left corner and choose a visualization from the list.',

    XLabelTitleFormatter: (q: AggregateQuery) => `${Locale_en_US[q.approximator.type.toUpperCase()]} of ${q.target.name}`,
    currencyFormatter: (usd: number) => {
        return '$' + d3format.format('2s')(usd);
    }
});
