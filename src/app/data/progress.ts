export class Progress {
    constructor(
        public processedBlocks = 0,
        public ongoingBlocks = 0,
        public totalBlocks = 0,
        public processedRows = 0,
        public ongoingRows = 0,
        public totalRows = 0
    ) {

    }

    processedPercent() {
        if (this.totalBlocks === 0) return 0;
        return this.processedBlocks / this.totalBlocks;
    }

    ongoingPercent() {
        if (this.totalBlocks === 0) return 0;
        return this.ongoingBlocks / this.totalBlocks;
    }

    done() {
        return this.totalBlocks === this.processedBlocks;
    }

    clone() {
        return new Progress(
            this.processedBlocks,
            this.ongoingBlocks,
            this.totalBlocks,
            this.processedRows,
            this.ongoingRows,
            this.totalRows
        )
    }
}
