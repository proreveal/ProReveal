import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { Constants } from '../constants';
import { StorageService } from './storage.service';

@Injectable({
    providedIn: 'root'
})
export class SocketService {
    ws: SocketIOClient.Socket;
    serverInfo: any;
    url = Constants.host;

    constructor(private storage:StorageService) {
        let ws = io(Constants.host, { transports: ['websocket'] })
        this.ws = ws;

        ws.on('welcome', (serverInfo: any) => {
            this.serverInfo = serverInfo;
        });

        ws.on('disconnect', (reason) => {
            this.serverInfo = null;
        })

        ws.on('error', (reason) => {
            console.error(reason);
        })
    }

    disconnect() {
        this.ws.disconnect();
    }
}
