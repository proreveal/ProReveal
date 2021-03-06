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
        mobile: {
            height: 30
        },
        label: {
            height: 30
        },
        title: {
            x: {
                height: 30,
                fontSize: '1.1rem',
                dy: '1.3rem'
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
        height: 20,
        width: 960,
        maxLabelLength: 10,
        maxLabelEllipsis: '...',
        maxZoom : {
            x: 2,
        },
        minZoom : {
            x: 1,
        }
    },
    heatmap: {
        rowHeight: 20,
        columnWidth: 30,
        legend: {
            width: 200,
            height: 200,
            paddingLeft: 30,
            paddingRight: 30,
            paddingTop: 40,
            paddingBottom: 40,
            translateY: 15
        },
        mobile: {
            legend: {
                width: 140,
                height: 60,
                paddingLeft: 10,
                paddingRight: 50,
                paddingTop: 30,
                paddingBottom: 20,
                translateY: 10
            }
        },
        title: {
            x: {
                height: 30,
                fontSize: '1.1rem',
                dy: '1.3rem'
            },
            y: {
                width: 25,
                fontSize: '1.1rem',
                dy: '1.3rem'
            }
        },
        minimap: {
            maxWidth: 140,
            maxHeight: 120
        },
        initiallyVisibleCategories: 40,
        width: 960,
        maxZoom : {
            x: 2,
            y: 2,
        },
        minZoom : {
            x: 1,
            y: 1
        }
    },
    history: {
        height: 40,
        width: 224
    },
    padding: 5,
    xScalePaddingRight: 10,
    variableHighlightColor: '#f4511e',
    operatorHighlightColor: '#303f9f',
    constantHighlightColor: 'black',
    pointBrushSize: 5,
    locale: locale,

    mobile: {
        menuHeight: 65
    },

    exchangeRate: locale.exchangeRate,
    nullValueString: locale.nullValueString,
    currencyFormatter: locale.currencyFormatter
});
