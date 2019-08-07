import { Component, OnInit } from '@angular/core';
import { StorageService } from '../services/storage.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-mobile',
    templateUrl: './mobile.component.html',
    styleUrls: ['./mobile.component.css']
})
export class MobileComponent implements OnInit {

    constructor(private storage:StorageService, private router:Router) { }

    ngOnInit() {
        if(!this.storage.code)
            this.router.navigate(['/'])
    }
}
