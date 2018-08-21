import { Injectable } from '@angular/core';
import { Stroke } from './vis/renderers/stroke';
import * as cryptojs from 'crypto-js';
import { Constants } from './constants';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface HandWriting {
    expressions: Expression[]
};

// See https://developer.myscript.com/docs/interactive-ink/1.2/reference/jiix/
type ExpressionType = 'number'|'='|'<'|'>';

interface Expression {
    type: ExpressionType,
    operands: Expression[],
    label: string,
    value: number
}

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
        let url = 'https://cloud.myscript.com/api/v4.0/iink/batch';
        let body = JSON.stringify(payload);
        let akey = Constants.myScriptApplicationKey;
        let hkey = Constants.myScriptHMACKey;
        let hmac = cryptojs.HmacSHA512(body, akey + hkey);

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
