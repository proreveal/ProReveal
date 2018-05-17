import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { ChartComponent } from './chart/chart.component';
import { LinkComponent } from './chart/link/link.component';
import { GraphViewerComponent } from './graph-viewer/graph-viewer.component';
import { NodeComponent } from './graph-viewer/node/node.component';
import { AngularFontAwesomeModule } from 'angular-font-awesome';

import { ProgressRingComponent } from './graph-viewer/progress-ring/progress-ring.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { DataService } from './services/data.service';
import { MetadataEditorComponent } from './metadata-editor/metadata-editor.component';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
    declarations: [
        AppComponent,
        ChartComponent,
        LinkComponent,
        GraphViewerComponent,
        NodeComponent,
        ProgressRingComponent,
        SidebarComponent,
        MetadataEditorComponent,
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
