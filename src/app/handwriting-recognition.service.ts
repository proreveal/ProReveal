import { Injectable } from '@angular/core';
import { Stroke } from './vis/renderers/stroke';
import * as cryptojs from 'crypto-js';
import { Constants } from './constants';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface HandWritingResponse {
    expressions: Expression[]
};

// See https://developer.myscript.com/docs/interactive-ink/1.2/reference/jiix/
type ExpressionType = 'number' | '=' | '<' | '>' | '≤' | '≥' | 'group';

export interface Expression {
    type: ExpressionType,
    operands: Expression[],
    label: string,
    value: number,
    symbol: string,
    range: string // [0:0,0:20$]U[2:0,2:72$]U[3:0,4:72$]
}

export function parseRange(range: string) {
    // [0:0,0:20$]U[2:0,2:72$]U[3:0,4:72$]
    let reg = /\[(\d*):(\d*),(\d*):(\d*)\$\]/g;
    let indices = [];

    range.match(reg).forEach(matchedRange => {
        let res = reg.exec(matchedRange);
        let start = +res[1];
        let end = +res[3];

        for (let i = start; i <= end; i++) {
            indices.push(i);
        }
    })

    return indices;
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
                "t": stroke.points.map(d => d.time),
                "id": stroke.id
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
