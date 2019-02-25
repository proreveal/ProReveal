import { formatKRW } from "../util";
import { Locale } from "./locale";

export const Locale_ko_KR = Object.freeze({
    name: Locale.ko_KR,
    exchangeRate: 1125,
    nullValueString: '(값 없음)',
    currencyFormatter: formatKRW,
    NewVisualization: '새 시각화 만들기',
    CompletedVisualization: '완료된 시각화',
    OngoingVisualization: '처리 중인 시각화',
    Alternate: '번갈아서 처리',
    Filters: '필터',
    Fields: '필드',
    Aggregate: '합계 함수',
    QueryPreview: '질의 미리보기',
    CreateVisualization: '이대로 만들기',
    Cancel: '취소',
    ChooseFields: '시각화에 포함될 필드를 선택하세요.',
    NumRows: '해당 행 수',
    Safeguards: '세이프가드 리스트',
    SafeguardGuide: '만들어진 세이프가드가 없습니다. 막대 그래프에서 범주 또는 힛맵 상에서 구역을 선택해 세이프가드를 만들어 보세요.',
    ChooseVisualizationToInspect: '새 시각화를 만들거나 왼쪽 패널에서 보고 싶은 시각화를 선택하세요.',
    VisualizationNotStarted: '이 시각화는 아직 시작되지 않았습니다. 더 기다리시거나 왼쪽 \'처리 중인 시각화\' 패널에서 드래그 앤 드랍으로 이 시각화의 우선 순위를 변경해 보세요.',
    SplitXAxisBins: '가로 구간 나누기',
    MergeXAxisBins: '가로 구간 합치기',
    SplitYAxisBins: '세로 구간 나누기',
    MergeYAxisBins: '세로 구간 합치기',
    SplitBins: '구간 나누기',
    MergeBins: '구간 합치기',

    TooManyCategories1: '한 축에 너무 많은 범주가 있습니다. 여기를 눌러',
    TooManyCategories2: '개의 모든 범주를 확인해 보세요.',

    SeeOnlyTheseItems: '이 데이터로만 시각화 만들기',
    CreateSafeguardOnThis: '세이프가드 만들기',

    Value: '값',
    Rank: '순위',
    Range: '범위',
    Comparative: '비교',
    Normal: '정규분포',
    Linear: '선형 회귀',

    ShowDataItems: '원본 데이터 보기',

    DataViewer: '원본 데이터 보기',

    CannotRemoveSafeguardedVis: '세이프가드가 있는 시각화는 지울 수 없습니다.',
    RemovingVis: '시각화를 삭제합니다.',
    RemovingVisAlert: '이 시각화를 삭제하려고 합니다. 삭제 하시겠습니까?',
    Remove: '삭제',

    CreateSG: '세이프가드 만들기',
    Tip: '도움말',

    KSStatistics: 'KS 통계량',
    RMSE: '평균 제곱근 편차',

    SUM: '합',
    MEAN: '평균',
    MIN: '최소',
    MAX: '최대'
});
