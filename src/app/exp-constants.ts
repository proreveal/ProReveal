import { UniformNumBlocksSampler } from "./data/sampler";

export const ExpConstants = Object.freeze({
    initialLatency: 300,
    latencyMean: 3000,
    latencyStdev: 1000,
    sampler: new UniformNumBlocksSampler(100)
});
