import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { ExplorationViewComponent } from './exploration/exploration-view.component';
import { ExplorationNodeViewComponent } from './exploration/exploration-node-view.component';
import { ProgressRingComponent } from './exploration/progress-ring.component';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'
import { DataService } from './services/data.service';
import { MetadataEditorComponent } from './metadata-editor/metadata-editor.component';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FieldSelectorComponent } from './field-selector/field-selector.component';
import { QueueViewComponent } from './queue-view/queue-view.component';
import { VisComponent } from './vis/vis.component';

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
    ],
    imports: [
        NgbModule.forRoot(),
        BrowserModule,
        HttpClientModule,
        FontAwesomeModule,
        FormsModule
    ],
    providers: [DataService],
    bootstrap: [AppComponent]
})
export class AppModule { }

import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';

library.add(fas, far);
