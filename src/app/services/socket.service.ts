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

    constructor(private storage: StorageService) {
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

        this.setVisibilityUpdate();
    }

    setVisibilityUpdate() {
        let hidden:string, visibilityChange:string;
        let doc = document as any;
        if (typeof doc.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
            hidden = "hidden";
            visibilityChange = "visibilitychange";
        } else if (typeof doc.msHidden !== "undefined") {
            hidden = "msHidden";
            visibilityChange = "msvisibilitychange";
        } else if (typeof doc.webkitHidden !== "undefined") {
            hidden = "webkitHidden";
            visibilityChange = "webkitvisibilitychange";
        }

        if (typeof document.addEventListener === "undefined" || hidden === undefined) {
            console.log("This demo requires a browser, such as Google Chrome or Firefox, that supports the Page Visibility API.");
        } else {
            // Handle page visibility change
            document.addEventListener(visibilityChange, () => {
                if (document[hidden]) {
                    this.emitSessionHidden();
                } else {
                    this.emitSessionVisible();
                }
            }, false);
        }
    }

    emitSessionHidden() {
        this.ws.emit('REQ/session/hidden')
    }

    emitSessionVisible() {
        this.ws.emit('REQ/session/visible');
    }

    disconnect() {
        this.ws.disconnect();
    }

    kill() {
        this.ws.emit('kill');
    }


}
