/** In-place iterative radix-2 FFT on separate real/imag arrays. */
const tables = new Map<number, { cos: Float64Array; sin: Float64Array; rev: Uint32Array }>();

function table(n: number) {
  let t = tables.get(n);
  if (t) return t;
  const cos = new Float64Array(n / 2), sin = new Float64Array(n / 2), rev = new Uint32Array(n);
  for (let i = 0; i < n / 2; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / n);
    sin[i] = Math.sin((2 * Math.PI * i) / n);
  }
  const bits = Math.log2(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
    rev[i] = r;
  }
  t = { cos, sin, rev };
  tables.set(n, t);
  return t;
}

export function fft(re: Float64Array, im: Float64Array, inverse = false) {
  const n = re.length;
  const { cos, sin, rev } = table(n);
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  const s = inverse ? 1 : -1;
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1, step = n / len;
    for (let i = 0; i < n; i += len) {
      for (let j = 0; j < half; j++) {
        const wr = cos[j * step], wi = s * sin[j * step];
        const a = i + j, b = a + half;
        const xr = re[b] * wr - im[b] * wi;
        const xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

/**
 * Real impulse response from a one-sided spectrum H[k], k = 0..N/2
 * (Hermitian extension). Returns h[n] of length N.
 */
export function irfft(hr: Float64Array, hi: Float64Array, n: number): Float64Array {
  const re = new Float64Array(n), im = new Float64Array(n);
  for (let k = 0; k <= n / 2; k++) { re[k] = hr[k]; im[k] = hi[k]; }
  for (let k = 1; k < n / 2; k++) { re[n - k] = hr[k]; im[n - k] = -hi[k]; }
  im[n / 2] = 0;
  fft(re, im, true);
  return re;
}
