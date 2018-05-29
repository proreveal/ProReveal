export function normalcdf(mean: number, sigma: number) {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;

    return (to: number) => {
        const z = (to - mean) / Math.sqrt(2 * sigma * sigma);
        const t = 1 / (1 + 0.3275911 * Math.abs(z));
        const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
        let sign = 1;
        if (z < 0) {
            sign = -1;
        }
        return (1 / 2) * (1 + sign * erf);
    };
}
