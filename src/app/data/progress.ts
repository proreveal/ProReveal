export class Progress {
    constructor(
        public processedBlocks = 0,
        public ongoingBlocks = 0,
        public numBatches = 0,
        public processedRows = 0,
        public ongoingRows = 0,
        public numRows = 0
    ) {

    }

    processedPercent() {
        if (this.numBatches === 0) return 0;
        return this.processedBlocks / this.numBatches;
    }

    ongoingPercent() {
        if (this.numBatches === 0) return 0;
        return this.ongoingBlocks / this.numBatches;
    }

    done() {
        return this.numBatches === this.processedBlocks;
    }

    clone() {
        return new Progress(
            this.processedBlocks,
            this.ongoingBlocks,
            this.numBatches,
            this.processedRows,
            this.ongoingRows,
            this.numRows
        )
    }
}
