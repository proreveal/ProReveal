import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { StorageService } from './storage.service';
import { environment as Env } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SocketService {
    ws: SocketIOClient.Socket;
    serverInfo: any;
    url = Env.apiHost

    constructor(private storage:StorageService) {
        let ws = io(Env.apiHost, { transports: ['websocket'] })
        this.ws = ws;

        ws.on('welcome', (serverInfo: any) => {
            this.serverInfo = serverInfo;
        });

        ws.on('disconnect', (reason) => {
            this.serverInfo = null;
        })

        ws.on('error', (reason) => {
            console.error(reason);
        });

        (window as any).ss = this;
    }

    disconnect() {
        this.ws.disconnect();
    }

    kill() {
        this.ws.emit('kill');
    }
}
