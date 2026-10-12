/* Actual pretrained model inference. Runs outside the UI thread. */
let sessionPromise;
let manifest;
let ort;
async function initialize() {
  if (!sessionPromise)
    sessionPromise = (async () => {
      self.postMessage({ type: "progress", stage: "loading" });
      ort = await import("/models/runtime/ort.wasm.min.mjs");
      ort.env.wasm.wasmPaths = new URL(
        "/models/runtime/",
        self.location.origin,
      ).href;
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      const meta = await fetch("/models/coastseg-rgb.json");
      if (!meta.ok) throw new Error("Model manifest unavailable");
      manifest = await meta.json();
      const response = await fetch(
        "/models/coastseg-rgb.onnx?v=" + manifest.onnx_sha256,
      );
      if (!response.ok) throw new Error("Model weights unavailable");
      const bytes = await response.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const checksum = [...new Uint8Array(digest)]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
      if (checksum !== manifest.onnx_sha256)
        throw new Error("Model checksum mismatch");
      return ort.InferenceSession.create(bytes, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
    })().catch((e) => {
      sessionPromise = undefined;
      throw e;
    });
  return sessionPromise;
}
function prepare(rgba) {
  const size = 512 * 512,
    values = new Float32Array(3 * size);
  let sum = 0,
    squared = 0;
  for (let i = 0; i < size; i++)
    for (let c = 0; c < 3; c++) {
      const v = rgba[4 * i + c];
      sum += v;
      squared += v * v;
    }
  const mean = sum / (3 * size),
    std = Math.max(
      Math.sqrt(Math.max(0, squared / (3 * size) - mean * mean)),
      1 / Math.sqrt(size),
    );
  for (let i = 0; i < size; i++)
    for (let c = 0; c < 3; c++)
      values[c * size + i] = (rgba[4 * i + c] - mean) / std;
  return values;
}
function classify(logits) {
  const [batch, classes, height, width] = logits.dims;
  if (batch !== 1 || classes !== 4)
    throw new Error("Unexpected model output shape");
  const palette = [
    [22, 200, 232],
    [245, 249, 255],
    [230, 165, 103],
    [104, 128, 147],
  ];
  const labels = new Uint8Array(512 * 512),
    rgba = new Uint8ClampedArray(512 * 512 * 4),
    counts = [0, 0, 0, 0];
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 512; x++) {
      // Bilinear logits resize, half-pixel coordinates as tf.image.resize.
      const fy = Math.max(
          0,
          Math.min(height - 1, ((y + 0.5) * height) / 512 - 0.5),
        ),
        fx = Math.max(0, Math.min(width - 1, ((x + 0.5) * width) / 512 - 0.5));
      const y0 = Math.floor(fy),
        x0 = Math.floor(fx),
        y1 = Math.min(height - 1, y0 + 1),
        x1 = Math.min(width - 1, x0 + 1),
        dy = fy - y0,
        dx = fx - x0;
      let label = 0,
        best = -Infinity;
      for (let c = 0; c < 4; c++) {
        const offset = c * height * width;
        const at = (r, col) => logits.data[offset + r * width + col];
        const score =
          (1 - dy) * ((1 - dx) * at(y0, x0) + dx * at(y0, x1)) +
          dy * ((1 - dx) * at(y1, x0) + dx * at(y1, x1));
        if (score > best) {
          best = score;
          label = c;
        }
      }
      const index = y * 512 + x;
      labels[index] = label;
      counts[label]++;
      rgba.set([...palette[label], 255], index * 4);
    }
  return { labels, rgba, counts };
}
self.onmessage = async (event) => {
  try {
    if (event.data.type !== "segment") return;
    const session = await initialize();
    self.postMessage({ type: "progress", stage: "running" });
    const started = performance.now();
    const tensor = new ort.Tensor(
      "float32",
      prepare(event.data.rgba),
      [1, 3, 512, 512],
    );
    const output = await session.run({ [manifest.input_name]: tensor });
    const result = classify(output[manifest.output_name]);
    tensor.dispose();
    Object.values(output).forEach((t) => t.dispose());
    self.postMessage(
      {
        type: "result",
        processed_at: new Date().toISOString(),
        ...result,
        elapsed_ms: performance.now() - started,
        manifest,
      },
      [result.labels.buffer, result.rgba.buffer],
    );
  } catch (e) {
    self.postMessage({ type: "error", message: e?.message || String(e) });
  }
};
