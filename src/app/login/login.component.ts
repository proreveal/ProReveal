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

        ws.on('RES/restore', (res:any) => {
            if(res.success) {
                console.log(res)
                this.storage.session = res.session;

                if(window.screen.availWidth < 720)
                    this.router.navigate(['/m'])
                else
                    this.router.navigate(['/a'])
            }
        })
    }

    restore() {
        if(!this.code) return;

        const code = this.code.toUpperCase();
        if(code.length != 3) return;

        this.ws.emit('REQ/restore', {code: code});

        return false;
    }
}
