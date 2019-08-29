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
        mobile: {
            height: 30
        },
        label: {
            height: 30
        },
        title: {
            x: {
                height: 20
            },
            y: {
                width: 20
            }
        },
        minimap: {
            width: 140,
            maxHeight: 200
        },
        circleRadius: 3,
        initiallyVisibleCategories: 50,
        minimumGradientWidth: 3,
        width: 960
    },
    heatmap: {
        rowHeight: 20,
        columnWidth: 30,
        legend: {
            size: 200,
            paddingX: 30,
            paddingY: 40,
            translateY: 15
        },
        mobile: {
            legend: {
                size: 140,
                paddingX: 30,
                paddingY: 30,
                translateY: 10
            }
        },
        title: {
            x: {
                height: 20
            },
            y: {
                width: 20
            }
        },
        minimap: {
            maxWidth: 140,
            maxHeight: 200
        },
        initiallyVisibleCategories: 40,
        width: 960
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
    currencyFormatter: locale.currencyFormatter,

    host: 'ws://147.46.240.230:7999'
});
