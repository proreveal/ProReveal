export class Progress {
    processedBlocks: number = 0; // # of processed blocks
    ongoingBlocks: number = 0; // # of ongoing blocks
    totalBlocks: number = 0; // # of total blocks

    processedRows: number = 0;
    ongoingRows: number = 0;
    totalRows: number = 0;

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
}
