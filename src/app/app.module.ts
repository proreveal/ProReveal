import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { ExplorationViewComponent } from './exploration/exploration-view.component';
import { ExplorationNodeViewComponent } from './exploration/exploration-node-view.component';
import { ProgressRingComponent } from './exploration/progress-ring.component';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'
import { MetadataEditorComponent } from './metadata-editor/metadata-editor.component';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FieldSelectorComponent } from './field-selector/field-selector.component';
import { QueueViewComponent } from './queue-view/queue-view.component';
import { VisComponent } from './vis/vis.component';

import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { TooltipComponent } from './tooltip/tooltip.component';
import { HorizontalBarsTooltipComponent } from './vis/renderers/horizontal-bars-tooltip.component';
import { TooltipHostDirective } from './tooltip/tooltip-host.directive';
import { FieldBadgeComponent } from './field-badge/field-badge.component';
import { SortablejsModule } from 'angular-sortablejs';
import { ProgressMiniRingComponent } from './exploration/progress-mini-ring.component';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { PIndicatorComponent } from './safeguard/p-indicator.component';

library.add(fas, far);

@NgModule({
    declarations: [
        AppComponent,
        ExplorationViewComponent,
        ExplorationNodeViewComponent,
        ProgressRingComponent,
        MetadataEditorComponent,
        FieldSelectorComponent,
        QueueViewComponent,
        VisComponent,
        TooltipComponent,
        HorizontalBarsTooltipComponent,
        TooltipHostDirective,
        FieldBadgeComponent,
        ProgressMiniRingComponent,
        PIndicatorComponent
    ],
    imports: [
        NgbModule.forRoot(),
        SortablejsModule.forRoot({ animation: 150 }),
        BrowserModule,
        HttpClientModule,
        FontAwesomeModule,
        FormsModule,
        BrowserAnimationsModule,
        ToastrModule.forRoot()
    ],
    providers: [],
    bootstrap: [AppComponent],
    entryComponents: [ HorizontalBarsTooltipComponent ]
})
export class AppModule { }
