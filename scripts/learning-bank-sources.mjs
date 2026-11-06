// Reviewed against the published handouts, including appendices A and B.
// These references are editorial metadata, not runtime grading inputs.
export const questionSources = {};
function source(refs, ids) {
  for (const id of ids.trim().split(/\s+/)) questionSources[id] = refs.split(" ");
}

source("ss-1-1", `energy-signal finite-energy-power cosine-average-power rectangle-energy exponential-energy angular-to-hertz harmonic-period
dc-sine-power two-tone-power duty-power pulse-amplitude triangle-energy ramp-energy bilateral-exp-energy geometric-energy finite-sequence-energy commensurate-period discrete-period`);
source("ss-1-2", "time-width-scale support-delay-scale energy-time-scale even-component odd-component reversed-support scaled-signal-energy");
source("ss-1-3", "impulse-scale-weight impulse-sifting affine-impulse-area affine-impulse-sift step-window-area");
source("ss-1-4", "linear-superposition square-homogeneity delay-causality advance-causality time-varying-multiplier bounded-gain");
source("ss-1-4 ss-3-5", "differentiator-amplitude");
source("ss-1-5", "difference-equation-order");
source("ss-5-10 ss-1-5", "rc-time-units");
source("ss-1-6", "total-response");

source("ss-2-6", `convolution-shift impulse-convolution-gain rectangle-convolution-peak rectangle-convolution-width equal-exponential-convolution cascade-impulse-gain parallel-impulse-gain
unequal-exponential-convolution shifted-convolution-end ramp-step-convolution two-impulse-response`);
source("ss-2-5 ss-2-6", "rectangle-convolution-sample convolution-total-area");
source("ss-2-5 ss-a-6", "discrete-convolution-middle continuous-convolution-step");
source("ss-5-10", "step-response time-constant");
source("ss-2-1", "decay-exponent constant-forced-response natural-response-sample total-response-sample complex-root-frequency complex-root-envelope critical-pole second-order-mode-decay");
source("ss-2-2", "impulse-state-jump second-order-jump second-order-impulse-jump first-order-initial-slope");
source("ss-2-3", "zero-input-initial");
source("ss-2-4", "impulse-step-final step-impulse-coefficient first-order-step-sample repeated-pole-step-final");
source("ss-2-4 ss-2-6", "pulse-response-after-end");
source("ss-2-1 ss-5-2", "second-order-step-gain");
source("ss-2-7", "autocorrelation-zero autocorrelation-overlap rectangle-autocorrelation crosscorrelation-peak");

source("ss-3-9", "aliasing nyquist sampling-period multiple-zone-alias");
source("ss-3-2", "square-wave fourier-cosine-coefficient pulse-train-average real-spectrum-conjugate sine-series-imaginary cosine-series-real");
source("ss-3-3", "fourier-fundamental-frequency period-ms-frequency");
source("ss-3-4 ss-a-1", "pulse-spectrum fourier-exponential-dc rectangle-first-zero exponential-spectrum-magnitude bilateral-exponential-dc rectangle-spectrum-sample");
source("ss-3-5", "am-bandwidth modulation-upper-edge fourier-scale-dc fourier-delay-phase derivative-spectrum scaled-transform-area am-sideband-amplitude mixer-difference-frequency");
source("ss-3-7", "sinusoidal-output-amplitude");
source("ss-3-8", "linear-phase-delay delay-phase-degrees");
source("ss-3-5 ss-3-7", "delay-difference-notch");
source("ss-3-8 ss-3-1", "ideal-lowpass-output-power");
source("ss-3-7 ss-5-10", "lowpass-sinusoid-amplitude highpass-sinusoid-amplitude");
source("ss-3-10", "parseval-energy");
source("ss-3-1 ss-3-2", "series-parseval-power");
source("ss-a-6", "dft-frequency-grid normalized-cycles finite-record-samples dft-coherent-cosine");
source("ss-3-6", "periodic-transform-weight");

source("ss-5-6", "right-half-plane hidden-unstable-mode absolute-impulse-integral routh-stable-bound routh-first-column");
source("ss-5-5", "imaginary-axis transfer-zero-location transfer-rightmost-pole");
source("ss-5-1", "laplace-right-roc laplace-left-roc laplace-exponential-value laplace-polynomial-value");
source("ss-5-2", `unilateral-derivative-value laplace-initial-value laplace-final-value delayed-step-transform shifted-roc-boundary unilateral-second-derivative time-weighted-transform integrated-transform rational-initial-value two-pole-final-value`);
source("ss-5-3", "laplace-repeated-pole partial-fraction-residue inverse-damped-sine numerator-residue direct-impulse-coefficient");
source("ss-5-4", "inductor-initial-term capacitor-initial-current-term inductor-s-impedance");
source("ss-5-7", "amplitude-decibels lowpass-cutoff-radians");
source("ss-5-8", "mason-single-loop mason-two-loops negative-feedback-gain mason-touching-loops");
source("ss-5-9", "direct-two-integrators cascade-dc-gain");
source("ss-5-10", "rc-pole-location");
source("ss-a-7 ss-b-9", "scalar-state-dc-gain");
