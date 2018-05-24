import { timer as createTimer, Observable } from 'rxjs';

export class SpeechRecognition {
    recognition:any;
    anyWindow:any = window as any;
    timer:Observable<number> = null;

    constructor(public maxDuration:number = 5000, public handler:(event:any) => void) {
        if(!('webkitSpeechRecognition' in window)) {
            this.recognition = null;
        }
        else {
            this.recognition = new this.anyWindow.webkitSpeechRecognition();
            this.recognition.lang = 'en-US';
            // this.recognition.interimResults = false;
            // this.recognition.continuous = true;
            this.recognition.maxAlternatives = 1;

            this.recognition.onresult = (event) => {
                this.handler(event);
                //this.recognition.stop();
            };
        }
    }

    words(words: string[]) {
        const grammar = `#JSGF V1.0; grammar words; public <word> = ${words.join('|')};`;
        const speechRecognitionList = new this.anyWindow.webkitSpeechGrammarList();
        speechRecognitionList.addFromString(grammar, 1);
        this.recognition.grammars = speechRecognitionList;
    }

    start() {
        if(this.recognition && this.timer === null) {
            try {
                this.recognition.start();
                this.timer = createTimer(this.maxDuration);
                this.timer.subscribe(this.expire.bind(this))
            }
            catch(e) {

            }
        }
    }

    stop() {
        if(this.recognition) {
            this.recognition.stop();
            this.timer = null;
        }
    }

    expire() {
        this.stop();
        this.timer = null;
    }
}
