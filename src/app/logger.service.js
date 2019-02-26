"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
var core_1 = require("@angular/core");
var LOCAL_STORAGE_KEY = 'sg';
var LogType;
(function (LogType) {
    LogType["AppStarted"] = "AppStarted";
    LogType["QueryCreatorOpened"] = "QueryCreatorOpened";
    LogType["QueryCreated"] = "QueryCreated";
    LogType["SchedulerChanged"] = "SchedulerChanged";
    LogType["DatumSelected"] = "DatumSelected";
    LogType["SafeguardSelected"] = "SafeguardSelected";
    LogType["SafeguardCreated"] = "SafeguardCreated";
    LogType["VisualizationSelected"] = "VisualizationSelected";
    LogType["Done"] = "Done";
})(LogType = exports.LogType || (exports.LogType = {}));
;
var LogItem = /** @class */ (function () {
    function LogItem(type, data, at) {
        this.type = type;
        this.data = data;
        this.at = at;
    }
    LogItem.fromObject = function (o) {
        return new LogItem(o.type, o.data, o.at);
    };
    LogItem.prototype.toObject = function () {
        return {
            type: this.type,
            data: this.data,
            at: this.at
        };
    };
    return LogItem;
}());
exports.LogItem = LogItem;
var SessionLog = /** @class */ (function () {
    function SessionLog(uid, sid) {
        this.uid = uid;
        this.sid = sid;
        this.logs = [];
    }
    SessionLog.fromObject = function (o) {
        var slog = new SessionLog(o.uid, o.sid);
        o.logs.forEach(function (logObject) {
            slog.logs.push(LogItem.fromObject(logObject));
        });
        return slog;
    };
    SessionLog.prototype.toObject = function () {
        return {
            uid: this.uid,
            sid: this.sid,
            logs: this.logs.map(function (log) { return log.toObject(); })
        };
    };
    return SessionLog;
}());
exports.SessionLog = SessionLog;
var UserLog = /** @class */ (function () {
    function UserLog(uid) {
        this.uid = uid;
        this.sessionLogs = [];
    }
    UserLog.fromObject = function (o) {
        var ulog = new UserLog(o.uid);
        o.sessionLogs.forEach(function (slogObject) {
            ulog.sessionLogs.push(SessionLog.fromObject(slogObject));
        });
        return ulog;
    };
    UserLog.prototype.toObject = function () {
        return {
            uid: this.uid,
            sessionLogs: this.sessionLogs.map(function (slog) { return slog.toObject(); })
        };
    };
    return UserLog;
}());
exports.UserLog = UserLog;
var LoggerService = /** @class */ (function () {
    function LoggerService() {
        var _this = this;
        this.userLogs = [];
        this.muted = false;
        var previousLog = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (previousLog && previousLog.length >= 1) {
            var ulogs = JSON.parse(previousLog);
            ulogs.forEach(function (ulogObject) {
                _this.userLogs.push(UserLog.fromObject(ulogObject));
            });
        }
    }
    LoggerService.prototype.setup = function (uid, sid) {
        this.uid = uid;
        this.sid = sid;
        if (!this.userLogs.find(function (ulog) { return ulog.uid === uid; }))
            this.userLogs.push(new UserLog(uid));
        this.userLog = this.userLogs.filter(function (ulog) { return ulog.uid === uid; })[0];
        if (!this.userLog.sessionLogs.find(function (slog) { return slog.sid === sid; }))
            this.userLog.sessionLogs.push(new SessionLog(uid, sid));
        this.sessionLog = this.userLog.sessionLogs.filter(function (slog) { return slog.sid === sid; })[0];
    };
    LoggerService.prototype.log = function (type, data) {
        if (this.muted)
            return;
        var now = Date.now();
        var item = new LogItem(type, data, now);
        this.sessionLog.logs.push(item);
        this.save();
    };
    LoggerService.prototype.save = function () {
        var o = [];
        this.userLogs.forEach(function (ulog) {
            o.push(ulog.toObject());
        });
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(o));
    };
    LoggerService.prototype.clear = function () {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
        this.userLogs = [];
    };
    LoggerService.prototype.mute = function () {
        this.muted = true;
    };
    Object.defineProperty(LoggerService.prototype, "size", {
        get: function () {
            return window.localStorage[LOCAL_STORAGE_KEY] ? window.localStorage[LOCAL_STORAGE_KEY].length : 0;
        },
        enumerable: true,
        configurable: true
    });
    LoggerService = __decorate([
        core_1.Injectable({
            providedIn: 'root'
        })
    ], LoggerService);
    return LoggerService;
}());
exports.LoggerService = LoggerService;
