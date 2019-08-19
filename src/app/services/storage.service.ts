import { Injectable } from '@angular/core';
import { ScreenType } from '../vis/screen-type';

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    code: string;
    engineType: string;
    screenType: ScreenType;

    constructor() { }

    isMobile() {
        return this.screenType == ScreenType.Mobile;
    }

    isDesktop() {
        return this.screenType == ScreenType.Desktop;
    }
}
