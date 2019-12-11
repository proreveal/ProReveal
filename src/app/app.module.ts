import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { ProgressRingComponent } from './exploration/progress-ring.component';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'
import { MetadataEditorComponent } from './metadata-editor/metadata-editor.component';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { QueueViewComponent } from './queue-view/queue-view.component';
import { VisComponent } from './vis/vis.component';

import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { TooltipComponent } from './tooltip/tooltip.component';
import { BarsTooltipComponent } from './vis/renderers/bars-tooltip.component';
import { HeatmapTooltipComponent } from './vis/renderers/heatmap-tooltip.component';
import { TooltipHostDirective } from './tooltip/tooltip-host.directive';
import { FieldBadgeComponent } from './field-badge/field-badge.component';
import { SortablejsModule } from 'ngx-sortablejs';
import { ProgressMiniRingComponent } from './exploration/progress-mini-ring.component';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PIndicatorComponent } from './display/p-indicator/p-indicator.component';
import { VariableIndicatorComponent } from './display/variable-indicator.component';
import { SgPointComponent } from './display/point/sg-point.component';
import { SgComparativeComponent } from './display/comparative/sg-comparative.component';
import { SgDistributiveComponent } from './display/distributive/sg-distributive.component';
import { SgRangeComponent } from './display/range/sg-range.component';
import { SgDisplayComponent } from './display/sg-display.component';
import { TruthinessIndicatorComponent } from './display/truthiness-indicator/truthiness-indicator.component';

import { MomentModule } from 'ngx-moment';
import { SgListItemComponent } from './display/sg-list-item/sg-list-item.component';
import { QualityIndicatorComponent } from './display/quality-indicator/quality-indicator.component';
import { ErrorIndicatorComponent } from './display/error-indicator/error-indicator.component';
import { SgHistoryComponent } from './display/history/sg-history.component';
import { QueryIndicatorComponent } from './query-indicator/query-indicator.component';
import { SmartNumberPipe } from './pipes/smart-number.pipe';
import { QueryCreatorComponent } from './query-creator/query-creator.component';
import { PredicateIndicatorComponent } from './display/predicate-indicator/predicate-indicator.component';
import { DataViewerComponent } from './data-viewer/data-viewer.component';
import { RouterModule, Routes } from '@angular/router';
import { FieldGroupedValueIndicatorComponent } from './display/field-grouped-value-indicator/field-grouped-value-indicator.component';
import { KeepHtmlPipe } from './pipes/keep-html.pipe';
import { BytesPipe } from './pipes/bytes.pipe';
import { DropdownComponent } from './figure/dropdown/dropdown.component';
import { MobileComponent } from './mobile/mobile.component';
import { RootComponent } from './root.component';
import { LoginComponent } from './login/login.component';

library.add(fas, far);

const appRoutes: Routes = [
    { path: 'm', component: MobileComponent },
    { path: 'a', component: AppComponent },
    { path: '', component: LoginComponent }
]

@NgModule({
    declarations: [
        AppComponent,
        ProgressRingComponent,
        MetadataEditorComponent,
        QueueViewComponent,
        VisComponent,
        TooltipComponent,
        BarsTooltipComponent,
        TooltipHostDirective,
        FieldBadgeComponent,
        ProgressMiniRingComponent,
        PIndicatorComponent,
        VariableIndicatorComponent,
        SgPointComponent,
        SgComparativeComponent,
        SgDistributiveComponent,
        SgRangeComponent,
        SgDisplayComponent,
        TruthinessIndicatorComponent,
        SgListItemComponent,
        QualityIndicatorComponent,
        ErrorIndicatorComponent,
        SgHistoryComponent,
        HeatmapTooltipComponent,
        QueryIndicatorComponent,
        SmartNumberPipe,
        QueryCreatorComponent,
        PredicateIndicatorComponent,
        DataViewerComponent,
        FieldGroupedValueIndicatorComponent,
        KeepHtmlPipe,
        BytesPipe,
        DropdownComponent,
        MobileComponent,
        RootComponent,
        LoginComponent
    ],
    imports: [
        NgbModule,
        SortablejsModule.forRoot({ animation: 150 }),
        BrowserModule,
        HttpClientModule,
        FontAwesomeModule,
        FormsModule,
        BrowserAnimationsModule,
        MomentModule,

        RouterModule.forRoot(
            appRoutes,
            // {enableTracing: true}
        )
    ],
    providers: [],
    bootstrap: [RootComponent],
    entryComponents: [ BarsTooltipComponent, HeatmapTooltipComponent ]
})
export class AppModule { }
