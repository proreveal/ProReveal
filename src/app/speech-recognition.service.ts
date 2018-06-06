import { Injectable } from '@angular/core';
import { SpeechRecognition } from './speech';

@Injectable({
    providedIn: 'root'
})
export class SpeechRecognitionService {
    speechRecognition: SpeechRecognition;

    constructor() { }

    start(candidates: string[], handler: (event: any) => void, timeout: number = 5000) {
        this.speechRecognition = new SpeechRecognition(timeout, handler);
        this.speechRecognition.words(candidates);
        this.speechRecognition.start();
    }

    stop() {
        if(this.speechRecognition)
            this.speechRecognition.stop();
    }
}
