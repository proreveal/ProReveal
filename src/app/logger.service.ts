import { Injectable } from '@angular/core';

const LOCAL_STORAGE_KEY = 'logs';

@Injectable({
    providedIn: 'root'
})
export class LoggerService {
    private logs: any[] = [];

    constructor() {
        if(window.localStorage.getItem(LOCAL_STORAGE_KEY)) {
            this.logs = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY));
        }
    }

    log(item: string) {
        this.logs.push(item);

        this.save();
    }

    save() {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.logs));
    }

    clear() {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    }

}
