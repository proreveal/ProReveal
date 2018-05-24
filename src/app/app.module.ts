import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { ExplorationViewComponent } from './exploration/exploration-view.component';
import { ExplorationNodeViewComponent } from './exploration/exploration-node-view.component';
import { ProgressRingComponent } from './exploration/progress-ring.component';

import { AngularFontAwesomeModule } from 'angular-font-awesome';
import { SidebarComponent } from './sidebar/sidebar.component';
import { DataService } from './services/data.service';
import { MetadataEditorComponent } from './metadata-editor/metadata-editor.component';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FieldSelectorComponent } from './field-selector/field-selector.component';
import { QueueViewComponent } from './queue-view/queue-view.component';

@NgModule({
    declarations: [
        AppComponent,
        ExplorationViewComponent,
        ExplorationNodeViewComponent,
        ProgressRingComponent,
        SidebarComponent,
        MetadataEditorComponent,
        FieldSelectorComponent,
        QueueViewComponent,
    ],
    imports: [
        NgbModule.forRoot(),
        BrowserModule,
        HttpClientModule,
        AngularFontAwesomeModule,
        FormsModule
    ],
    providers: [DataService],
    bootstrap: [AppComponent]
})
export class AppModule { }
