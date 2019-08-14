import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    code: string;
    engineType: string;
    constructor() { }
}
