import { Injectable } from '@angular/core';

type UId = string; // user id
type SId = string; // session id
const LOCAL_STORAGE_KEY = 'sg';

export enum EventType {
    AppStarted = "AppStarted"
};

export class LogItem {
    constructor(public type: EventType, public data: Object, public at: number) {

    }

    static fromObject(o: any) {
        return new LogItem(o.type, o.data, o.at);
    }

    toObject() {
        return {
            type: this.type,
            data: this.data,
            at: this.at
        };
    }
}

export class SessionLog {
    uid: UId;
    sid: SId;
    logs: LogItem[] = [];

    static fromString(s: string) {
        let o = JSON.parse(s);
        let log = new SessionLog();

        log.uid = o.uid;
        log.sid = o.sid;

        o.logs.forEach(logString => {
            log.logs.push(LogItem.fromObject(logString));
        })

        return log;
    }

    toObject() {
        return {
            uid: this.uid,
            sid: this.sid,
            logs: this.logs.map(log => log.toObject())
        }
    }
}

@Injectable({
    providedIn: 'root'
})
export class LoggerService {
    sessionLog: SessionLog;
    startAt: number;
    uid: UId;
    sid: SId;

    constructor() {
        let previousLog = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if(previousLog && previousLog.length >= 1)
            this.sessionLog = SessionLog.fromString(window.localStorage.getItem(LOCAL_STORAGE_KEY));
        else
            this.sessionLog = new SessionLog();
    }

    setup(uid: UId, sid: SId) {
        this.startAt = +new Date();
        this.uid = uid;
        this.sid = sid;
    }

    log(type: EventType, data: Object) {
        let now = Date.now();
        let item = new LogItem(type, data, now);

        this.sessionLog.logs.push(item);

        this.save();
    }

    save() {
        window.localStorage.setItem(LOCAL_STORAGE_KEY,
            JSON.stringify(this.sessionLog.toObject()));
    }

    clear() {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
}
