const zTable = {};

const SQRT_2PI = Math.sqrt(2 * Math.PI);

function cumulativeDistribution(z) {
    let sum = z,
        tmp = z;

    // 15 iterations are enough for 4-digit precision
    for (let i = 1; i < 30; i++) {
        tmp *= (z * z) / (2 * i + 1);
        sum += tmp;
    }
    return (
        Math.round((0.5 + (sum / SQRT_2PI) * Math.exp((-z * z) / 2)) * 1e5) /
        1e5
    );
}

function round (value, decimalPlaces) {
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(value * factor) / factor;
}

for (let first = 0; first <= 360; first++) {
    for(let second = 0; second < 10; second++) {
        let z = first / 100 + second / 1000;
        let zRow = Math.round(first) / 100;
        if(!zTable[zRow]) zTable[zRow] = [];
        zTable[zRow].push(cumulativeDistribution(z));
    }
}

console.log(zTable);

export class NormalDistribution {
    /**
     * The constructor, assumes a standardized normal distribution if
     *   there are no parameters given
     * @param {number} [mean=0] - the mean average
     * @param {number} [standardDeviation=1] - the standard deviation
     */
    constructor(public _mean = 0, public _standardDeviation = 1) {
    }

    /**
     * Getter for the mean average of the distribution
     * @type {number}
     */
    get mean() {
        return this._mean;
    }

    /**
     * Getter for the standard deviation of the distribution
     * @type {number}
     */
    get standardDeviation() {
        return this._standardDeviation;
    }

    /**
     * Setter for the mean average of the distribution
     * @type {number}
     */
    set mean(mean) {
        this._mean = mean;
    }

    /**
     * Setter for the standard deviation of the distribution
     * @type {number}
     */
    set standardDeviation(standardDeviation) {
        this._standardDeviation = standardDeviation;
    }

    /**
     * @param {number} value - the number to convert to a z-score
     * @return {number} the z-score of the value
     */
    zScore(value) {
        return (value - this.mean) / this.standardDeviation;
    }

    /**
     * Return the probability of finding x in the distribution
     * @param {number} value - the value to evaluate
     * @return {number} the probability
     */
    pdf(value) {
        const dividend = Math.pow(
            Math.E,
            -Math.pow(value - this.mean, 2) /
            (2 * Math.pow(this.standardDeviation, 2))
        );
        const divisor = this.standardDeviation * Math.sqrt(2 * Math.PI);
        return dividend / divisor;
    }

    /**
     * Return the cumalitive probability for everything left of the value
     * @param {number} value - the value to evaluate
     * @return {number} the cumulative total
     */
    cdf(value) {
        let zScore = this.zScore(value);
        zScore = this._round(zScore, 3);


        if (zScore === 0) {
            return 0.5;
        } else if (zScore <= -3.5) {
            return 0;
        } else if (zScore >= 3.5) {
            return 1;
        }

        //const zTable = NormalDistribution.zTable;
        const absZScore = Math.abs(zScore);
        const zRow = Math.floor(absZScore * 100) / 100;
        const zCol = round((Math.round(absZScore * 1000) % 10), 0);
        const absPercentile = zTable[zRow.toString()][zCol];

        // console.log("mean = %.2f, value = %.3f, zScore = %.3f, zRow = %s, zCol = %s, absPercentile = %s", this.mean, value, zScore, zRow, zCol, absPercentile);

        return zScore < 0 ? 1 - absPercentile : absPercentile;
    }

    /**
     * Return the probability of a value in the distribution being
     *   between two values
     * @param {number} value1 - the first boundary
     * @param {number} value2 - the second boundary
     * @return {number} the probability
     */
    probabilityBetween(value1, value2) {
        return Math.abs(this.cdf(value1) - this.cdf(value2));
    }

    /**
     * Rounds a value to a specified amount of decimal places
     * @param {number} value - the value to be rounded
     * @param {number} decimalPlaces - the amount of decimal places to round to
     * @return {number} the rounded number
     */
    _round(value, decimalPlaces) {
        const factor = Math.pow(10, decimalPlaces);
        return Math.round(value * factor) / factor;
    }
}
