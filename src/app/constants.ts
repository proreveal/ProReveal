import * as util from './util';
import { Locale_ko_KR } from './locales/ko_KR';
import { Locale_en_US } from './locales/en_US';

let locale = Locale_en_US;

export const Constants = Object.freeze({
    usePlaceholder: true,
    progressRingColors: ['#007bff', '#a0ceff', '#ddd'],

    numberFormat: '1.1-1',
    rankFormat: '1.0-0',

    bars: {
        height: 20,
        axis: {
            height: 20
        },
        label: {
            height: 15
        },
        circleRadius: 3,
        initiallyVisibleCategories: 50,
        minimumGradientWidth: 3
    },
    heatmap: {
        rowHeight: 20,
        columnWidth: 30,
        legendSize: 200,
        legendPadding: 30,
        swatchHeight: 20,
        label: {
            x: {
                height: 0,
            },
            y: {
                width: 20
            }
        },
        initiallyVisibleCategories: 40
    },
    history: {
        height: 40,
        width: 224
    },
    padding: 5,
    variableHighlightColor: '#f4511e',
    operatorHighlightColor: '#303f9f',
    constantHighlightColor: 'black',
    pointBrushSize: 5,
    locale: locale,
    exchangeRate: locale.exchangeRate,
    nullValueString: locale.nullValueString,
    currencyFormatter: locale.currencyFormatter
});
