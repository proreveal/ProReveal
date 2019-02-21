import { Injectable } from '@angular/core';

type UId = string; // user id
type SId = string; // session id
const LOCAL_STORAGE_KEY = 'sg';

export enum EventType {
    AppStarted = "AppStarted"
};

export interface LogItemSpec {
    type: EventType;
    data: Object,
    at: number;
}

export class LogItem {
    constructor(public type: EventType, public data: Object, public at: number) {

    }

    static fromObject(o: LogItemSpec) {
        return new LogItem(o.type, o.data, o.at);
    }

    toObject(): LogItemSpec {
        return {
            type: this.type,
            data: this.data,
            at: this.at
        };
    }
}

export interface SessionLogSpec {
    uid: UId;
    sid: SId;
    logs: LogItemSpec[];
}

export class SessionLog {
    logs: LogItem[] = [];

    constructor(public uid: UId, public sid: SId) {

    }

    static fromObject(o: SessionLogSpec) {
        let slog = new SessionLog(o.uid, o.sid);

        o.logs.forEach(logObject => {
            slog.logs.push(LogItem.fromObject(logObject));
        })

        return slog;
    }

    toObject(): SessionLogSpec {
        return {
            uid: this.uid,
            sid: this.sid,
            logs: this.logs.map(log => log.toObject())
        }
    }
}

export interface UserLogSpec {
    uid: UId;
    sessionLogs: SessionLogSpec[];
}

export class UserLog {
    sessionLogs: SessionLog[] = [];

    constructor(public uid: UId) {

    }

    static fromObject(o: UserLogSpec) {
        let ulog = new UserLog(o.uid);

        o.sessionLogs.forEach(slogObject => {
            ulog.sessionLogs.push(SessionLog.fromObject(slogObject));
        })

        return ulog;
    }

    toObject(): UserLogSpec {
        return {
            uid: this.uid,
            sessionLogs: this.sessionLogs.map(slog => slog.toObject())
        }
    }
}

@Injectable({
    providedIn: 'root'
})
export class LoggerService {
    userLogs: UserLog[] = [];
    uid: UId;
    sid: SId;

    userLog: UserLog; // user log of the current user
    sessionLog: SessionLog; // user log of the current session

    constructor() {
        let previousLog = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (previousLog && previousLog.length >= 1) {
            const ulogs = JSON.parse(previousLog);

            ulogs.forEach(ulogObject => {
                this.userLogs.push(UserLog.fromObject(ulogObject))
            })
        }
    }

    setup(uid: UId, sid: SId) {
        this.uid = uid;
        this.sid = sid;

        if (!this.userLogs.find(ulog => ulog.uid === uid))
            this.userLogs.push(new UserLog(uid));

        this.userLog = this.userLogs.filter(ulog => ulog.uid === uid)[0];

        if(!this.userLog.sessionLogs.find(slog => slog.sid === sid))
            this.userLog.sessionLogs.push(new SessionLog(uid, sid));

        this.sessionLog = this.userLog.sessionLogs.filter(slog => slog.sid === sid)[0];
    }

    log(type: EventType, data: Object) {
        let now = Date.now();
        let item = new LogItem(type, data, now);

        this.sessionLog.logs.push(item);

        this.save();
    }

    save() {
        let o: UserLogSpec[] = [];

        this.userLogs.forEach(ulog => {
            o.push(ulog.toObject());
        })

        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(o));
    }

    clear() {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
}
