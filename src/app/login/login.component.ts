import { Component, OnInit } from '@angular/core';
import { Constants } from '../constants';

import { StorageService } from '../services/storage.service';
import { Router } from '@angular/router';
import { ScreenType } from '../vis/screen-type';
import { SocketService } from '../services/socket.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
    C = Constants;
    code:string = 'ABC';

    constructor(private router: Router,
        public storage:StorageService,
        public socket:SocketService) {
    }

    ngOnInit() {
        this.socket.ws.on('RES/login', (res:any) => {
            if(res.success) {
                this.storage.code = res.code;
                this.storage.engineType = 'remote';
                this.go();
            }
        })

        //this.restore(); // TODO: for debugging
    }

    restore() {
        if(!this.code) return;

        const code = this.code.toUpperCase();
        if(code.length != 3) return;

        this.socket.ws.emit('REQ/login', {code: code});

        return false;
    }

    go() {
        if(window.screen.availWidth < 720) {
            this.storage.screenType = ScreenType.Mobile;
            this.router.navigate(['/m'])
        }
        else {
            this.storage.screenType = ScreenType.Desktop;
            this.router.navigate(['/a'])
        }
    }

    continueBrowser() {
        this.storage.engineType = 'browser';

        this.go();
    }
}
