export class Progress {
    processed: number = 0; // # of processed blocks
    ongoing: number = 0; // # of ongoing blocks
    total: number = 0; // # of total blocks

    processedPercent() {
        if (this.total === 0) return 0;
        return this.processed / this.total;
    }

    ongoingPercent() {
        if (this.total === 0) return 0;
        return this.ongoing / this.total;
    }
}
