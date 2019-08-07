import { Component, OnInit } from '@angular/core';
import { Constants } from '../constants';
import * as io from 'socket.io-client';
import { StorageService } from '../services/storage.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
    ws: SocketIOClient.Socket;
    info: any;
    connected = false;
    C = Constants;
    code:string = 'ABC';

    constructor(private storage:StorageService, private router: Router) { }

    ngOnInit() {
        let ws = io(Constants.host, { transports: ['websocket'] })
        this.ws = ws;

        ws.on('welcome', (serverInfo: any) => {
            this.info = serverInfo;
            console.log(serverInfo);
            this.connected = true;
        })

        ws.on('disconnect', (reason) => {
            this.info = null;
            this.connected = false;
        })

        ws.on('RES/login', (res:any) => {
            if(res.success) {
                this.storage.code = res.code;
                this.go();
            }
        })

        this.restore(); // TODO: for debugging
    }

    restore() {
        if(!this.code) return;

        const code = this.code.toUpperCase();
        if(code.length != 3) return;

        this.ws.emit('REQ/login', {code: code});

        return false;
    }

    go() {
        if(window.screen.availWidth < 720)
            this.router.navigate(['/m'])
        else
            this.router.navigate(['/a'])
    }

    continueBrowser() {
        this.storage.code = {
            engineType: 'browser'
        };

        this.go();

    }
}
