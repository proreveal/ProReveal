import { Injectable } from '@angular/core';
import { Stroke } from './sketchbook/stroke';
import * as cryptojs from 'crypto-js';
import { Constants } from './constants';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class HandwritingRecognitionService {

    constructor(private http: HttpClient) { }

    public recognize(strokes: Stroke[]) {
        let strokePayload = strokes.map(stroke => {
            return {
                "x": stroke.points.map(d => d.x),
                "y": stroke.points.map(d => d.y),
                "t": stroke.points.map(d => d.time)
            }
        });

        let payload = {
            "contentType": "Math",
            "strokeGroups": [
                {
                    "strokes": strokePayload
                }
            ]
        };

        const request = new XMLHttpRequest();
        let self = this;
        // request.onload = function () {
        //     console.log(this);
        //     if (this.status < 300) {
        //         self.strokes = [];
        //         self.renderStrokes();

        //     } else {
        //         throw new Error(this.statusText);
        //     }
        // };

        // request.onerror = function () {
        //     throw new Error('XMLHttpRequest Error: ' + this.statusText);
        // };
        // request.open('POST', 'https://cloud.myscript.com/api/v4.0/iink/batch');

        let url = 'https://cloud.myscript.com/api/v4.0/iink/batch';
        let body = JSON.stringify(payload);
        let akey = Constants.myScriptApplicationKey;
        let hkey = Constants.myScriptHMACKey;
        let hmac = cryptojs.HmacSHA512(body, akey + hkey);

        // request.setRequestHeader('applicationKey', akey);
        // request.setRequestHeader('hmac', hmac.toString());
        // request.setRequestHeader('Accept', 'application/json,application/vnd.myscript.jiix');
        // request.setRequestHeader('Content-Type', 'application/json');

        // request.send(body);

        return this.http.post(url, body, {
            headers: new HttpHeaders({
                'applicationKey': akey,
                'hmac': hmac.toString(),
                'Accept': 'application/json,application/vnd.myscript.jiix',
                'Content-Type': 'application/json'
            })
        });
    }
}
